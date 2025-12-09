"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { logAuditWithCurrentUser } from "@/lib/audit-logger"

export type AttendanceRecord = {
  id: string
  employee_id: string
  date: string
  time_in: string | null
  time_out: string | null
  status: string
  late_minutes: number | null
  overtime_minutes: number | null
  undertime_minutes: number | null
  notes: string | null
}

export type EmployeeWithAttendance = {
  id: string
  employee_number: string
  first_name: string
  last_name: string
  email: string
  department: string
  position: string
  status: string
  attendance: AttendanceRecord | null
}

export async function fetchAttendanceForDate(date: string): Promise<{
  data: EmployeeWithAttendance[] | null
  error: string | null
}> {
  try {
    const supabase = createAdminClient()

    await logAuditWithCurrentUser({
      action: "attendance_viewed",
      entityType: "attendance",
      metadata: {
        date,
        viewedFrom: "admin_dashboard",
      },
    })

    // Fetch all active employees
    const { data: employees, error: employeesError } = await supabase
      .from("employees")
      .select("id, employee_number, first_name, last_name, email, department, position, status")
      .eq("status", "active")
      .order("last_name", { ascending: true })

    if (employeesError) {
      console.error("[v0] Error fetching employees:", employeesError)
      return { data: null, error: employeesError.message }
    }

    if (!employees || employees.length === 0) {
      return { data: [], error: null }
    }

    // Fetch attendance records for the given date
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("date", date)

    if (attendanceError) {
      console.error("[v0] Error fetching attendance:", attendanceError)
      return { data: null, error: attendanceError.message }
    }

    // Map attendance records to employees
    const attendanceMap = new Map<string, AttendanceRecord>()
    if (attendanceRecords) {
      for (const record of attendanceRecords) {
        attendanceMap.set(record.employee_id, record)
      }
    }

    // Combine employees with their attendance
    const employeesWithAttendance: EmployeeWithAttendance[] = employees.map((emp) => ({
      ...emp,
      attendance: attendanceMap.get(emp.id) || null,
    }))

    return { data: employeesWithAttendance, error: null }
  } catch (error) {
    console.error("[v0] Unexpected error in fetchAttendanceForDate:", error)
    return { data: null, error: "An unexpected error occurred" }
  }
}

export async function updateAttendanceRecord(
  recordId: string,
  data: {
    time_in?: string | null
    time_out?: string | null
    status?: string
    notes?: string
  },
) {
  const supabase = createAdminClient()

  // Get the existing record first
  const { data: existingRecord } = await supabase
    .from("attendance_records")
    .select("*, employees(first_name, last_name, email)")
    .eq("id", recordId)
    .single()

  const { data: result, error } = await supabase
    .from("attendance_records")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", recordId)
    .select()
    .single()

  if (error) {
    console.error("[v0] Error updating attendance record:", error)
    return { success: false, error: error.message }
  }

  const employee = existingRecord?.employees as { first_name: string; last_name: string; email: string } | null
  await logAuditWithCurrentUser({
    action: "attendance_updated",
    entityType: "attendance",
    entityId: recordId,
    metadata: {
      employeeName: employee ? `${employee.first_name} ${employee.last_name}` : null,
      date: existingRecord?.date,
      changes: data,
      previousTimeIn: existingRecord?.time_in,
      previousTimeOut: existingRecord?.time_out,
    },
  })

  return { success: true, data: result }
}

export async function deleteAttendanceRecord(recordId: string) {
  const supabase = createAdminClient()

  // Get the existing record first
  const { data: existingRecord } = await supabase
    .from("attendance_records")
    .select("*, employees(first_name, last_name, email)")
    .eq("id", recordId)
    .single()

  const { error } = await supabase.from("attendance_records").delete().eq("id", recordId)

  if (error) {
    console.error("[v0] Error deleting attendance record:", error)
    return { success: false, error: error.message }
  }

  const employee = existingRecord?.employees as { first_name: string; last_name: string; email: string } | null
  await logAuditWithCurrentUser({
    action: "attendance_deleted",
    entityType: "attendance",
    entityId: recordId,
    metadata: {
      employeeName: employee ? `${employee.first_name} ${employee.last_name}` : null,
      date: existingRecord?.date,
      timeIn: existingRecord?.time_in,
      timeOut: existingRecord?.time_out,
    },
  })

  return { success: true }
}
