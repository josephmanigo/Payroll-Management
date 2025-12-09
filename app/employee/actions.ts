"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { logAudit, logAuditWithCurrentUser } from "@/lib/audit-logger"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { PESO_SIGN } from "@/lib/utils"

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.log("[v0] getAdminClient: Missing credentials - URL:", !!supabaseUrl, "Key:", !!serviceRoleKey)
    return null
  }

  const maskedUrl = supabaseUrl.replace(/https?:\/\/([^.]+)\..*/, "https://$1.***")
  console.log("[v0] getAdminClient: Using URL:", maskedUrl)

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function getCurrentEmployee() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("[v0] getCurrentEmployee: Not authenticated")
    return { success: false, error: "Not authenticated", data: null }
  }

  console.log("[v0] getCurrentEmployee: User:", user.email, "ID:", user.id)

  // The RLS policy "Authenticated users can view all employees" should work
  console.log("[v0] getCurrentEmployee: Trying server client first...")

  // First, test if we can query any table
  const { data: testData, error: testError } = await supabase.from("employees").select("count").limit(1)

  console.log("[v0] getCurrentEmployee: Server client test - error:", testError?.message, "data:", testData)

  // Try to find by email first using server client
  const { data: byEmail, error: emailError } = await supabase
    .from("employees")
    .select("*")
    .ilike("email", user.email || "")
    .maybeSingle()

  console.log("[v0] getCurrentEmployee: Server client email lookup - error:", emailError?.message, "found:", !!byEmail)

  if (byEmail) {
    console.log("[v0] getCurrentEmployee: Found by email via server client:", byEmail.first_name, byEmail.last_name)

    // Update user_id if needed
    if (byEmail.user_id !== user.id) {
      console.log("[v0] getCurrentEmployee: Linking user_id...")
      const adminClient = getAdminClient()
      if (adminClient) {
        await adminClient.from("employees").update({ user_id: user.id }).eq("id", byEmail.id)
      }
    }

    return { success: true, data: { ...byEmail, user_id: user.id } }
  }

  // Try by user_id
  const { data: byUserId, error: userIdError } = await supabase
    .from("employees")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  console.log(
    "[v0] getCurrentEmployee: Server client user_id lookup - error:",
    userIdError?.message,
    "found:",
    !!byUserId,
  )

  if (byUserId) {
    console.log("[v0] getCurrentEmployee: Found by user_id:", byUserId.first_name, byUserId.last_name)
    return { success: true, data: byUserId }
  }

  console.log("[v0] getCurrentEmployee: Server client failed, trying admin client...")
  const adminClient = getAdminClient()

  if (!adminClient) {
    console.log("[v0] getCurrentEmployee: No admin client available")
    return { success: false, error: "No employee record found", data: null }
  }

  // List all employees to debug
  const { data: allEmployees, error: allError } = await adminClient
    .from("employees")
    .select("id, email, first_name, last_name, user_id")
    .limit(20)

  console.log(
    "[v0] getCurrentEmployee: Admin client - all employees error:",
    allError?.message,
    "count:",
    allEmployees?.length,
  )

  if (allEmployees && allEmployees.length > 0) {
    allEmployees.forEach((e) => {
      console.log("[v0] Employee in DB:", e.email)
    })
  }

  // Try email match with admin client
  const { data: adminByEmail, error: adminEmailError } = await adminClient
    .from("employees")
    .select("*")
    .ilike("email", user.email || "")
    .maybeSingle()

  console.log(
    "[v0] getCurrentEmployee: Admin client email lookup - error:",
    adminEmailError?.message,
    "found:",
    !!adminByEmail,
  )

  if (adminByEmail) {
    console.log("[v0] getCurrentEmployee: Found by email via admin:", adminByEmail.first_name, adminByEmail.last_name)

    // Link user_id
    await adminClient.from("employees").update({ user_id: user.id }).eq("id", adminByEmail.id)

    return { success: true, data: { ...adminByEmail, user_id: user.id } }
  }

  console.log("[v0] getCurrentEmployee: No employee record found for email:", user.email)
  return { success: false, error: "No employee record found", data: null }
}

export async function getEmployeePayslips(employeeId: string) {
  const adminClient = getAdminClient()

  if (!adminClient) {
    console.log("[v0] getEmployeePayslips: No admin client found")
    return { success: false, error: "No admin client found", data: [] }
  }

  const { data, error } = await adminClient
    .from("payslips")
    .select("*")
    .eq("employee_id", employeeId)
    .order("pay_date", { ascending: false })

  if (error) {
    return { success: false, error: error.message, data: [] }
  }

  await logAuditWithCurrentUser({
    action: "payslips_viewed",
    entityType: "payslip",
    entityId: employeeId,
    metadata: {
      payslipCount: data?.length || 0,
    },
  })

  return { success: true, data: data || [] }
}

export async function createLeaveRequest(data: {
  employee_id: string
  leave_type: string
  start_date: string
  end_date: string
  total_days: number
  reason?: string
}) {
  const supabase = await createClient()
  const adminClient = getAdminClient()

  if (!adminClient) {
    console.log("[v0] createLeaveRequest: No admin client found")
    return { success: false, error: "No admin client found" }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: employee, error: empError } = await adminClient
    .from("employees")
    .select("id, first_name, last_name, email")
    .eq("id", data.employee_id)
    .single()

  if (empError || !employee) {
    return { success: false, error: "Employee not found" }
  }

  const { data: result, error: leaveError } = await adminClient
    .from("leave_requests")
    .insert({
      employee_id: data.employee_id,
      leave_type: data.leave_type,
      start_date: data.start_date,
      end_date: data.end_date,
      total_days: data.total_days,
      reason: data.reason,
      status: "pending",
    })
    .select()
    .single()

  if (leaveError) {
    console.error("Error creating leave request:", leaveError)
    return { success: false, error: leaveError.message }
  }

  const employeeName = `${employee.first_name} ${employee.last_name}`

  if (user) {
    await logAudit({
      userId: user.id,
      userName: employeeName,
      userEmail: employee.email,
      userRole: "employee",
      action: "leave_requested",
      entityType: "leave",
      entityId: result.id,
      metadata: {
        leaveType: data.leave_type,
        startDate: data.start_date,
        endDate: data.end_date,
        totalDays: data.total_days,
      },
    })
  }

  revalidatePath("/employee")
  return { success: true, data: result }
}

export async function cancelLeaveRequest(leaveId: string) {
  const supabase = await createClient()
  const adminClient = getAdminClient()

  if (!adminClient) {
    console.log("[v0] cancelLeaveRequest: No admin client found")
    return { success: false, error: "No admin client found" }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let employeeName: string | null = null
  let employeeEmail: string | null = null

  if (user) {
    const { data: employee, error: empError } = await adminClient
      .from("employees")
      .select("first_name, last_name, email")
      .eq("user_id", user.id)
      .maybeSingle()

    if (empError || !employee) {
      return { success: false, error: "Employee not found" }
    }

    employeeName = `${employee.first_name} ${employee.last_name}`
    employeeEmail = employee.email
  }

  const { error: updateError } = await adminClient
    .from("leave_requests")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", leaveId)
    .eq("status", "pending")

  if (updateError) {
    console.error("Error cancelling leave request:", updateError)
    return { success: false, error: updateError.message }
  }

  if (user) {
    await logAudit({
      userId: user.id,
      userName: employeeName,
      userEmail: employeeEmail,
      userRole: "employee",
      action: "leave_cancelled",
      entityType: "leave",
      entityId: leaveId,
    })
  }

  revalidatePath("/employee")
  return { success: true }
}

export async function getEmployeeLeaveRequests(employeeId: string) {
  const adminClient = getAdminClient()

  if (!adminClient) {
    console.log("[v0] getEmployeeLeaveRequests: No admin client found")
    return { success: false, error: "No admin client found", data: [] }
  }

  const { data, error } = await adminClient
    .from("leave_requests")
    .select("*")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching leave requests:", error)
    return { success: false, error: error.message, data: [] }
  }

  await logAuditWithCurrentUser({
    action: "leave_requests_viewed",
    entityType: "leave",
    entityId: employeeId,
    metadata: {
      requestCount: data?.length || 0,
    },
  })

  return { success: true, data: data || [] }
}

export async function createBonusRequest(data: {
  employee_id: string
  amount: number
  reason: string
}) {
  const supabase = await createClient()

  // Get the current user to verify they are authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: "Not authenticated" }
  }

  const userEmail = user.email

  const { data: employee, error: empError } = await supabase
    .from("employees")
    .select("id, first_name, last_name, email")
    .eq("id", data.employee_id)
    .single()

  if (empError || !employee) {
    return { success: false, error: "Employee not found" }
  }

  if (employee.email?.toLowerCase() !== userEmail?.toLowerCase()) {
    return { success: false, error: "Unauthorized to create bonus request for this employee" }
  }

  const adminClient = getAdminClient()

  if (!adminClient) {
    console.log("[v0] createBonusRequest: No admin client found")
    return { success: false, error: "No admin client found" }
  }

  const { data: result, error: bonusError } = await adminClient
    .from("bonus_requests")
    .insert({
      employee_id: data.employee_id,
      amount: data.amount,
      reason: data.reason,
      status: "pending",
    })
    .select()
    .single()

  if (bonusError) {
    console.error("Error creating bonus request:", bonusError)
    return { success: false, error: bonusError.message }
  }

  const employeeName = `${employee.first_name} ${employee.last_name}`

  await logAudit({
    userId: user.id,
    userName: employeeName,
    userEmail: employee.email,
    userRole: "employee",
    action: "bonus_requested",
    entityType: "bonus",
    entityId: result.id,
    metadata: {
      amount: data.amount,
      reason: data.reason,
    },
  })

  // Create notification for all admins/HR (this is optional and should not block success)
  const { data: admins, error: adminError } = await adminClient
    .from("profiles")
    .select("id")
    .in("role", ["admin", "hr"])

  if (!adminError && admins && admins.length > 0) {
    const notifications = admins.map((admin) => ({
      user_id: admin.id,
      title: "New Bonus Request",
      message: `${employeeName} requested a salary bonus of ${PESO_SIGN}${data.amount.toLocaleString()}.`,
      type: "info" as const,
      link: "/admin/bonus",
    }))

    const { error: notificationError } = await adminClient.from("notifications").insert(notifications)

    if (notificationError) {
      console.error("Error creating notifications:", notificationError)
    }
  } else {
    console.log("[v0] createBonusRequest: No admins found for notification, but bonus was created successfully")
  }

  revalidatePath("/employee")
  revalidatePath("/admin")
  revalidatePath("/admin/bonus")
  return { success: true, data: result }
}

export async function getEmployeeBonusRequests(employeeId: string) {
  const adminClient = getAdminClient()

  if (!adminClient) {
    console.log("[v0] getEmployeeBonusRequests: No admin client found")
    return { success: false, error: "No admin client found", data: [] }
  }

  const { data, error } = await adminClient
    .from("bonus_requests")
    .select("*")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching bonus requests:", error)
    return { success: false, error: error.message, data: [] }
  }

  await logAuditWithCurrentUser({
    action: "bonus_requests_viewed",
    entityType: "bonus",
    entityId: employeeId,
    metadata: {
      requestCount: data?.length || 0,
    },
  })

  return { success: true, data: data || [] }
}

export async function cancelBonusRequest(bonusId: string) {
  const supabase = await createClient()
  const adminClient = getAdminClient()

  if (!adminClient) {
    console.log("[v0] cancelBonusRequest: No admin client found")
    return { success: false, error: "No admin client found" }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Get the bonus request to verify ownership
  const { data: bonusRequest, error: fetchError } = await adminClient
    .from("bonus_requests")
    .select("*, employees(id, first_name, last_name, email, user_id)")
    .eq("id", bonusId)
    .single()

  if (fetchError || !bonusRequest) {
    return { success: false, error: "Bonus request not found" }
  }

  // Verify the user owns this bonus request
  const employee = bonusRequest.employees as {
    id: string
    first_name: string
    last_name: string
    email: string
    user_id: string
  } | null
  if (!employee || (employee.user_id !== user.id && employee.email?.toLowerCase() !== user.email?.toLowerCase())) {
    return { success: false, error: "Unauthorized to cancel this bonus request" }
  }

  // Only allow cancelling pending requests
  if (bonusRequest.status !== "pending") {
    return { success: false, error: "Can only cancel pending bonus requests" }
  }

  const { error: updateError } = await adminClient
    .from("bonus_requests")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", bonusId)

  if (updateError) {
    console.error("Error cancelling bonus request:", updateError)
    return { success: false, error: updateError.message }
  }

  const employeeName = `${employee.first_name} ${employee.last_name}`

  await logAudit({
    userId: user.id,
    userName: employeeName,
    userEmail: employee.email,
    userRole: "employee",
    action: "bonus_cancelled",
    entityType: "bonus",
    entityId: bonusId,
    metadata: {
      amount: bonusRequest.amount,
      reason: bonusRequest.reason,
    },
  })

  revalidatePath("/employee")
  revalidatePath("/admin/bonus")
  return { success: true }
}
