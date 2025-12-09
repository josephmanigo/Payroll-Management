"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit-logger"

// Standard work hours configuration (can be made configurable later)
const WORK_START_HOUR = 9 // 9:00 AM
const WORK_END_HOUR = 18 // 6:00 PM
const STANDARD_WORK_HOURS = 8

/**
 * Get today's attendance record for an employee
 */
export async function getTodayAttendance(employeeId: string) {
  const adminClient = createAdminClient()

  const today = new Date().toISOString().split("T")[0]

  const { data, error } = await adminClient
    .from("attendance_records")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("date", today)
    .maybeSingle()

  if (error) {
    console.error("Error fetching today's attendance:", error)
    return { success: false, error: error.message, data: null }
  }

  return { success: true, data }
}

/**
 * Time-in: Create a new attendance record for today
 */
export async function timeIn(employeeId: string) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    let userId: string | null = null

    // Try to get user, but don't fail if auth fails
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      userId = user?.id || null
    } catch (authError) {
      console.error("Auth error during time-in, continuing with admin client:", authError)
    }

    // Get employee details for audit log
    const { data: employee } = await adminClient
      .from("employees")
      .select("id, first_name, last_name, email")
      .eq("id", employeeId)
      .single()

    if (!employee) {
      return { success: false, error: "Employee not found" }
    }

    const now = new Date()
    const today = now.toISOString().split("T")[0]
    const timeInTimestamp = now.toISOString()

    // Calculate late minutes
    const workStartTime = new Date(today)
    workStartTime.setHours(WORK_START_HOUR, 0, 0, 0)

    let lateMinutes = 0
    let status: "present" | "late" = "present"

    if (now > workStartTime) {
      lateMinutes = Math.floor((now.getTime() - workStartTime.getTime()) / (1000 * 60))
      if (lateMinutes > 0) {
        status = "late"
      }
    }

    // Check if already timed in today
    const { data: existingRecord } = await adminClient
      .from("attendance_records")
      .select("id, time_in")
      .eq("employee_id", employeeId)
      .eq("date", today)
      .maybeSingle()

    if (existingRecord?.time_in) {
      return { success: false, error: "Already timed in today" }
    }

    // Use admin client to insert (bypasses RLS for reliability)
    const { data: result, error } = await adminClient
      .from("attendance_records")
      .upsert(
        {
          employee_id: employeeId,
          date: today,
          time_in: timeInTimestamp,
          status,
          late_minutes: lateMinutes,
        },
        {
          onConflict: "employee_id,date",
        },
      )
      .select()
      .single()

    if (error) {
      console.error("Error creating time-in record:", error)
      return { success: false, error: error.message }
    }

    const employeeName = `${employee.first_name} ${employee.last_name}`
    await logAudit({
      userId: userId || employeeId,
      userName: employeeName,
      userEmail: employee.email,
      userRole: "employee",
      action: "time_in",
      entityType: "attendance",
      entityId: result.id,
      metadata: {
        employeeName,
        timeIn: timeInTimestamp,
        lateMinutes,
        status,
      },
    })

    revalidatePath("/employee")
    revalidatePath("/admin/attendance")

    return { success: true, data: result }
  } catch (error) {
    console.error("Unexpected error during time-in:", error)
    return { success: false, error: "An unexpected error occurred. Please try again." }
  }
}

/**
 * Time-out: Update the attendance record with time-out and calculations
 */
export async function timeOut(employeeId: string) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    let userId: string | null = null

    // Try to get user, but don't fail if auth fails
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      userId = user?.id || null
    } catch (authError) {
      console.error("Auth error during time-out, continuing with admin client:", authError)
    }

    // Get employee details for audit log
    const { data: employee } = await adminClient
      .from("employees")
      .select("id, first_name, last_name, email")
      .eq("id", employeeId)
      .single()

    if (!employee) {
      return { success: false, error: "Employee not found" }
    }

    const now = new Date()
    const today = now.toISOString().split("T")[0]
    const timeOutTimestamp = now.toISOString()

    // Get today's attendance record
    const { data: attendance } = await adminClient
      .from("attendance_records")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("date", today)
      .maybeSingle()

    if (!attendance) {
      return { success: false, error: "No time-in record found for today" }
    }

    if (attendance.time_out) {
      return { success: false, error: "Already timed out today" }
    }

    if (!attendance.time_in) {
      return { success: false, error: "Must time-in first before timing out" }
    }

    // Calculate total hours worked
    const timeIn = new Date(attendance.time_in)
    const totalMilliseconds = now.getTime() - timeIn.getTime()
    const totalHours = Math.round((totalMilliseconds / (1000 * 60 * 60)) * 100) / 100

    // Calculate undertime (if leaving before standard work end time)
    const workEndTime = new Date(today)
    workEndTime.setHours(WORK_END_HOUR, 0, 0, 0)

    let undertimeMinutes = 0
    if (now < workEndTime && totalHours < STANDARD_WORK_HOURS) {
      undertimeMinutes = Math.floor((workEndTime.getTime() - now.getTime()) / (1000 * 60))
    }

    // Calculate overtime (hours worked beyond standard)
    let overtimeHours = 0
    if (totalHours > STANDARD_WORK_HOURS) {
      overtimeHours = Math.round((totalHours - STANDARD_WORK_HOURS) * 100) / 100
    }

    // Calculate night differential (10PM - 6AM)
    let nightDifferential = 0
    const nightStart = new Date(today)
    nightStart.setHours(22, 0, 0, 0)

    // Simple night differential calculation (hours worked between 10PM and 6AM)
    if (now.getHours() >= 22 || now.getHours() < 6) {
      const ndStart = now.getHours() >= 22 ? nightStart : new Date(today).setHours(0, 0, 0, 0)
      const ndEnd = now
      nightDifferential = Math.round(((ndEnd.getTime() - new Date(ndStart).getTime()) / (1000 * 60 * 60)) * 100) / 100
    }

    // Update attendance record
    const { data: result, error } = await adminClient
      .from("attendance_records")
      .update({
        time_out: timeOutTimestamp,
        total_hours: totalHours,
        undertime_minutes: undertimeMinutes,
        overtime_hours: overtimeHours,
        night_differential: nightDifferential,
      })
      .eq("id", attendance.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating time-out:", error)
      return { success: false, error: error.message }
    }

    const employeeName = `${employee.first_name} ${employee.last_name}`
    await logAudit({
      userId: userId || employeeId,
      userName: employeeName,
      userEmail: employee.email,
      userRole: "employee",
      action: "time_out",
      entityType: "attendance",
      entityId: result.id,
      metadata: {
        employeeName,
        timeIn: attendance.time_in,
        timeOut: timeOutTimestamp,
        totalHours,
        lateMinutes: attendance.late_minutes,
        undertimeMinutes,
        overtimeHours,
        nightDifferential,
      },
    })

    revalidatePath("/employee")
    revalidatePath("/admin/attendance")

    return { success: true, data: result }
  } catch (error) {
    console.error("Unexpected error during time-out:", error)
    return { success: false, error: "An unexpected error occurred. Please try again." }
  }
}

/**
 * Get attendance records for an employee
 */
export async function getEmployeeAttendance(employeeId: string, startDate?: string, endDate?: string) {
  const adminClient = createAdminClient()

  let query = adminClient
    .from("attendance_records")
    .select("*")
    .eq("employee_id", employeeId)
    .order("date", { ascending: false })

  if (startDate) {
    query = query.gte("date", startDate)
  }
  if (endDate) {
    query = query.lte("date", endDate)
  }

  const { data, error } = await query.limit(30)

  if (error) {
    console.error("Error fetching attendance:", error)
    return { success: false, error: error.message, data: [] }
  }

  return { success: true, data: data || [] }
}
