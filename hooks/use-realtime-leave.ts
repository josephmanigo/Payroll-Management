"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { LeaveRequest } from "@/lib/types"
import { getAllLeaveRequests } from "@/app/admin/leave/actions"

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

// Hook for admin to view all leave requests - uses server action to bypass RLS
export function useRealtimeAdminLeaveRequests() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestWithEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      console.log("[v0] useRealtimeAdminLeaveRequests: Calling server action...")

      const result = await getAllLeaveRequests()

      console.log(
        "[v0] useRealtimeAdminLeaveRequests: Result -",
        "success:",
        result.success,
        "error:",
        result.error,
        "count:",
        result.data?.length,
      )

      if (!result.success) {
        setError(result.error || "Failed to fetch leave requests")
      } else {
        setLeaveRequests((result.data as LeaveRequestWithEmployee[]) || [])
        setError(null)
      }
    } catch (err) {
      console.error("[v0] useRealtimeAdminLeaveRequests: Exception:", err)
      setError("Failed to fetch leave requests")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Set up real-time subscription for updates
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel("admin-leave-requests-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leave_requests",
        },
        async () => {
          console.log("[v0] useRealtimeAdminLeaveRequests: Realtime update received, refetching...")
          await fetchData()
        },
      )
      .subscribe((status) => {
        console.log("[v0] Admin leave subscription status:", status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

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
