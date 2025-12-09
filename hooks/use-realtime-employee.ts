"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"
import type { LeaveRequest } from "@/lib/types"

// Types for Supabase data
export interface SupabaseEmployee {
  id: string
  user_id: string | null
  employee_number: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  department: string
  position: string
  monthly_salary: number
  hire_date: string
  status: string
  created_at: string
  updated_at: string
}

export interface SupabasePayslip {
  id: string
  employee_id: string
  pay_period_start: string
  pay_period_end: string
  pay_date: string
  gross_pay: number
  total_deductions: number
  net_pay: number
  status: string
  email_sent: boolean
  email_sent_at: string | null
  created_at: string
  updated_at: string
}

export interface SupabaseProfile {
  id: string
  email: string
  full_name: string
  role: string
  department: string | null
  created_at: string
  updated_at: string
}

// Interface for leave request with employee data
export interface LeaveRequestWithEmployee extends LeaveRequest {
  employees?: {
    id: string
    first_name: string
    last_name: string
    email: string
    department: string
    position: string
    employee_number: string
  }
}

// Hook for real-time employee data (for employee portal)
export function useRealtimeEmployee(userId: string | null, userEmail?: string | null) {
  const [employee, setEmployee] = useState<SupabaseEmployee | null>(null)
  const [payslips, setPayslips] = useState<SupabasePayslip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const employeeIdRef = useRef<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    const supabase = createClient()

    try {
      // The RLS policy uses user_id = auth.uid(), so we must filter by user_id
      let employeeData: SupabaseEmployee | null = null

      // First try to find by user_id (primary method - matches RLS)
      const { data: byUserIdData, error: byUserIdError } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle()

      if (byUserIdError) {
        console.log("[v0] Employee fetch by user_id error:", byUserIdError.message)
      }

      if (byUserIdData) {
        console.log("[v0] Employee found by user_id:", byUserIdData.id, byUserIdData.first_name, byUserIdData.last_name)
        employeeData = byUserIdData
      } else if (userEmail) {
        console.log("[v0] No employee found by user_id, trying by email:", userEmail)
        const { data: byEmailData, error: byEmailError } = await supabase
          .from("employees")
          .select("*")
          .ilike("email", userEmail)
          .maybeSingle()

        if (byEmailError) {
          console.log("[v0] Employee fetch by email error:", byEmailError.message)
        }

        if (byEmailData) {
          console.log("[v0] Employee found by email:", byEmailData.id, byEmailData.first_name, byEmailData.last_name)
          employeeData = byEmailData

          // Note: Can't update user_id from client due to RLS - server action will handle this
          console.log("[v0] Employee found by email, server action will link user_id")
        }
      }

      // If no employee found at all
      if (!employeeData) {
        console.log("[v0] No employee record found for user_id:", userId, "email:", userEmail)
        setError("No employee record found")
        setLoading(false)
        return
      }

      setEmployee(employeeData)
      employeeIdRef.current = employeeData.id

      // Fetch payslips for this employee
      const { data: payslipsData, error: payslipsError } = await supabase
        .from("payslips")
        .select("*")
        .eq("employee_id", employeeData.id)
        .order("pay_date", { ascending: false })

      if (payslipsError) {
        console.log("[v0] Payslips fetch error:", payslipsError.message)
      } else {
        console.log("[v0] Payslips found:", payslipsData?.length || 0)
        setPayslips(payslipsData || [])
      }

      setError(null)
    } catch (err) {
      console.error("[v0] Error fetching employee data:", err)
      setError("Failed to fetch employee data")
    } finally {
      setLoading(false)
    }
  }, [userId, userEmail])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    let employeeChannel: RealtimeChannel | null = null
    let payslipsChannel: RealtimeChannel | null = null

    employeeChannel = supabase
      .channel(`employee-user-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "employees",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("[v0] Employee update received:", payload.eventType)
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            setEmployee(payload.new as SupabaseEmployee)
            employeeIdRef.current = (payload.new as SupabaseEmployee).id
          } else if (payload.eventType === "DELETE") {
            setEmployee(null)
            employeeIdRef.current = null
          }
        },
      )
      .subscribe((status) => {
        console.log("[v0] Employee subscription status:", status)
      })

    payslipsChannel = supabase
      .channel(`payslips-user-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payslips",
        },
        (payload) => {
          const currentEmployeeId = employeeIdRef.current
          if (!currentEmployeeId) return

          // Filter payslips for current employee
          if (payload.eventType === "INSERT") {
            const newPayslip = payload.new as SupabasePayslip
            if (newPayslip.employee_id === currentEmployeeId) {
              console.log("[v0] New payslip received for employee")
              setPayslips((prev) => [newPayslip, ...prev])
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedPayslip = payload.new as SupabasePayslip
            if (updatedPayslip.employee_id === currentEmployeeId) {
              console.log("[v0] Payslip update received")
              setPayslips((prev) => prev.map((p) => (p.id === updatedPayslip.id ? updatedPayslip : p)))
            }
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old?.id
            if (deletedId) {
              setPayslips((prev) => prev.filter((p) => p.id !== deletedId))
            }
          }
        },
      )
      .subscribe((status) => {
        console.log("[v0] Payslips subscription status:", status)
      })

    return () => {
      if (employeeChannel) supabase.removeChannel(employeeChannel)
      if (payslipsChannel) supabase.removeChannel(payslipsChannel)
    }
  }, [userId])

  return { employee, payslips, loading, error, refetch: fetchData }
}

// Hook for real-time admin data (for admin dashboard)
export function useRealtimeAdminData() {
  const [employees, setEmployees] = useState<SupabaseEmployee[]>([])
  const [payslips, setPayslips] = useState<SupabasePayslip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    try {
      // Fetch all employees
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: false })

      if (employeesError) {
        console.log("[v0] Employees fetch error:", employeesError.message)
        setError(employeesError.message)
      } else {
        setEmployees(employeesData || [])
      }

      // Fetch all payslips
      const { data: payslipsData, error: payslipsError } = await supabase
        .from("payslips")
        .select("*")
        .order("pay_date", { ascending: false })

      if (payslipsError) {
        console.log("[v0] Payslips fetch error:", payslipsError.message)
      } else {
        setPayslips(payslipsData || [])
      }

      setError(null)
    } catch (err) {
      console.error("[v0] Error fetching admin data:", err)
      setError("Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Set up real-time subscriptions for admin
  useEffect(() => {
    const supabase = createClient()

    const employeesChannel = supabase
      .channel("admin-employees")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "employees",
        },
        (payload) => {
          console.log("[v0] Admin employees update:", payload.eventType)
          if (payload.eventType === "INSERT") {
            setEmployees((prev) => [payload.new as SupabaseEmployee, ...prev])
          } else if (payload.eventType === "UPDATE") {
            setEmployees((prev) => prev.map((e) => (e.id === payload.new.id ? (payload.new as SupabaseEmployee) : e)))
          } else if (payload.eventType === "DELETE") {
            setEmployees((prev) => prev.filter((e) => e.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    const payslipsChannel = supabase
      .channel("admin-payslips")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payslips",
        },
        (payload) => {
          console.log("[v0] Admin payslips update:", payload.eventType)
          if (payload.eventType === "INSERT") {
            setPayslips((prev) => [payload.new as SupabasePayslip, ...prev])
          } else if (payload.eventType === "UPDATE") {
            setPayslips((prev) => prev.map((p) => (p.id === payload.new.id ? (payload.new as SupabasePayslip) : p)))
          } else if (payload.eventType === "DELETE") {
            setPayslips((prev) => prev.filter((p) => p.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(employeesChannel)
      supabase.removeChannel(payslipsChannel)
    }
  }, [])

  return { employees, payslips, loading, error, refetch: fetchData }
}

export function useRealtimeLeaveRequests() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestWithEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    try {
      console.log("[v0] useRealtimeLeaveRequests: Fetching leave requests...")

      const { data, error: fetchError } = await supabase
        .from("leave_requests")
        .select(`
          *,
          employees (
            id,
            first_name,
            last_name,
            email,
            department,
            position,
            employee_number
          )
        `)
        .order("created_at", { ascending: false })

      if (fetchError) {
        console.log("[v0] useRealtimeLeaveRequests: Fetch error:", fetchError.message)
        setError(fetchError.message)
      } else {
        console.log("[v0] useRealtimeLeaveRequests: Found", data?.length || 0, "leave requests")
        setLeaveRequests(data || [])
      }

      setError(null)
    } catch (err) {
      console.error("[v0] useRealtimeLeaveRequests: Exception:", err)
      setError("Failed to fetch leave requests")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Set up real-time subscription
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel("admin-leave-requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leave_requests",
        },
        async (payload) => {
          console.log("[v0] Leave request update:", payload.eventType)

          if (payload.eventType === "INSERT") {
            // Fetch the complete record with employee data
            const { data } = await supabase
              .from("leave_requests")
              .select(`
                *,
                employees (
                  id,
                  first_name,
                  last_name,
                  email,
                  department,
                  position,
                  employee_number
                )
              `)
              .eq("id", payload.new.id)
              .single()

            if (data) {
              setLeaveRequests((prev) => [data as LeaveRequestWithEmployee, ...prev])
            }
          } else if (payload.eventType === "UPDATE") {
            // Fetch the updated record with employee data
            const { data } = await supabase
              .from("leave_requests")
              .select(`
                *,
                employees (
                  id,
                  first_name,
                  last_name,
                  email,
                  department,
                  position,
                  employee_number
                )
              `)
              .eq("id", payload.new.id)
              .single()

            if (data) {
              setLeaveRequests((prev) =>
                prev.map((lr) => (lr.id === payload.new.id ? (data as LeaveRequestWithEmployee) : lr)),
              )
            }
          } else if (payload.eventType === "DELETE") {
            setLeaveRequests((prev) => prev.filter((lr) => lr.id !== payload.old.id))
          }
        },
      )
      .subscribe((status) => {
        console.log("[v0] Leave requests subscription status:", status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const pendingLeaveRequests = leaveRequests.filter((lr) => lr.status === "pending")
  const approvedLeaveRequests = leaveRequests.filter((lr) => lr.status === "approved")
  const rejectedLeaveRequests = leaveRequests.filter((lr) => lr.status === "rejected")

  return {
    leaveRequests,
    pendingLeaveRequests,
    approvedLeaveRequests,
    rejectedLeaveRequests,
    loading,
    error,
    refetch: fetchData,
  }
}

export function useRealtimeEmployeeLeaves(employeeId: string | null) {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!employeeId) {
      setLoading(false)
      return
    }

    const supabase = createClient()

    try {
      const { data, error: fetchError } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false })

      if (fetchError) {
        console.log("[v0] Employee leave requests fetch error:", fetchError.message)
        setError(fetchError.message)
      } else {
        setLeaveRequests(data || [])
      }

      setError(null)
    } catch (err) {
      console.error("[v0] Error fetching employee leave requests:", err)
      setError("Failed to fetch leave requests")
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Set up real-time subscription for employee's leaves
  useEffect(() => {
    if (!employeeId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`employee-leaves-${employeeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leave_requests",
          filter: `employee_id=eq.${employeeId}`,
        },
        (payload) => {
          console.log("[v0] Employee leave update:", payload.eventType)

          if (payload.eventType === "INSERT") {
            setLeaveRequests((prev) => [payload.new as LeaveRequest, ...prev])
          } else if (payload.eventType === "UPDATE") {
            setLeaveRequests((prev) =>
              prev.map((lr) => (lr.id === payload.new.id ? (payload.new as LeaveRequest) : lr)),
            )
          } else if (payload.eventType === "DELETE") {
            setLeaveRequests((prev) => prev.filter((lr) => lr.id !== payload.old.id))
          }
        },
      )
      .subscribe((status) => {
        console.log("[v0] Employee leaves subscription status:", status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [employeeId])

  const pendingLeaves = leaveRequests.filter((lr) => lr.status === "pending")
  const approvedLeaves = leaveRequests.filter((lr) => lr.status === "approved")
  const rejectedLeaves = leaveRequests.filter((lr) => lr.status === "rejected")
  const totalApprovedDays = approvedLeaves.reduce((sum, lr) => sum + lr.total_days, 0)

  return {
    leaveRequests,
    pendingLeaves,
    approvedLeaves,
    rejectedLeaves,
    totalApprovedDays,
    loading,
    error,
    refetch: fetchData,
  }
}
