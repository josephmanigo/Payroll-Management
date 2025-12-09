"use server"
import { getAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit-logger"

async function ensureProfileExists(userId: string, adminClient: ReturnType<typeof getAdminClient>) {
  // Check if profile exists
  const { data: existingProfile } = await adminClient.from("profiles").select("id").eq("id", userId).single()

  if (!existingProfile) {
    // Get user info from auth
    const { data: authUser } = await adminClient.auth.admin.getUserById(userId)

    // Create profile
    await adminClient.from("profiles").insert({
      id: userId,
      email: authUser?.user?.email || "admin@company.com",
      role: "admin",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    console.log("[v0] ensureProfileExists: Created profile for user:", userId)
  }
}

export async function getAllLeaveRequests() {
  console.log("[v0] getAllLeaveRequests: Fetching all leave requests with admin client...")
  const adminClient = getAdminClient()

  const { data, error } = await adminClient
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

  if (error) {
    console.error("[v0] getAllLeaveRequests: Error:", error.message)
    return { success: false, error: error.message, data: [] }
  }

  console.log("[v0] getAllLeaveRequests: Found", data?.length || 0, "leave requests")

  await logAudit({
    userId: null,
    action: "leave_requests_viewed",
    entityType: "leave",
    metadata: {
      requestCount: data?.length || 0,
      viewedFrom: "admin_dashboard",
    },
  })

  return { success: true, data: data || [] }
}

export async function approveLeaveRequest(leaveId: string, approverId: string) {
  const adminClient = getAdminClient()

  // Ensure the approver's profile exists in the profiles table
  await ensureProfileExists(approverId, adminClient)

  const { data: leaveRequest } = await adminClient
    .from("leave_requests")
    .select(`
      *,
      employees (
        first_name,
        last_name
      )
    `)
    .eq("id", leaveId)
    .single()

  const { error } = await adminClient
    .from("leave_requests")
    .update({
      status: "approved",
      approved_by: approverId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", leaveId)

  if (error) {
    console.error("Error approving leave request:", error.message)
    return { success: false, error: error.message }
  }

  const employee = leaveRequest?.employees as { first_name: string; last_name: string } | null
  await logAudit({
    userId: approverId,
    action: "leave_approved",
    entityType: "leave",
    entityId: leaveId,
    metadata: {
      entityName: employee ? `${employee.first_name} ${employee.last_name}` : undefined,
      leaveType: leaveRequest?.leave_type,
      startDate: leaveRequest?.start_date,
      endDate: leaveRequest?.end_date,
      totalDays: leaveRequest?.total_days,
    },
  })

  revalidatePath("/admin/leave")
  revalidatePath("/employee")
  return { success: true }
}

export async function rejectLeaveRequest(leaveId: string, approverId: string, reason?: string) {
  const adminClient = getAdminClient()

  // Ensure the approver's profile exists in the profiles table
  await ensureProfileExists(approverId, adminClient)

  const { data: leaveRequest } = await adminClient
    .from("leave_requests")
    .select(`
      *,
      employees (
        first_name,
        last_name
      )
    `)
    .eq("id", leaveId)
    .single()

  const { error } = await adminClient
    .from("leave_requests")
    .update({
      status: "rejected",
      approved_by: approverId,
      approved_at: new Date().toISOString(),
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leaveId)

  if (error) {
    console.error("Error rejecting leave request:", error.message)
    return { success: false, error: error.message }
  }

  const employee = leaveRequest?.employees as { first_name: string; last_name: string } | null
  await logAudit({
    userId: approverId,
    action: "leave_rejected",
    entityType: "leave",
    entityId: leaveId,
    metadata: {
      entityName: employee ? `${employee.first_name} ${employee.last_name}` : undefined,
      leaveType: leaveRequest?.leave_type,
      reason: reason,
    },
  })

  revalidatePath("/admin/leave")
  revalidatePath("/employee")
  return { success: true }
}

export async function deleteLeaveRequest(leaveId: string) {
  const adminClient = getAdminClient()

  // Get the leave request first
  const { data: leaveRequest } = await adminClient
    .from("leave_requests")
    .select(`
      *,
      employees (
        first_name,
        last_name,
        email
      )
    `)
    .eq("id", leaveId)
    .single()

  const { error } = await adminClient.from("leave_requests").delete().eq("id", leaveId)

  if (error) {
    console.error("Error deleting leave request:", error)
    return { success: false, error: error.message }
  }

  const employee = leaveRequest?.employees as { first_name: string; last_name: string } | null
  await logAudit({
    userId: null,
    action: "leave_deleted",
    entityType: "leave",
    entityId: leaveId,
    metadata: {
      entityName: employee ? `${employee.first_name} ${employee.last_name}` : null,
      leaveType: leaveRequest?.leave_type,
      startDate: leaveRequest?.start_date,
      endDate: leaveRequest?.end_date,
      status: leaveRequest?.status,
    },
  })

  revalidatePath("/admin/leave")
  return { success: true }
}
