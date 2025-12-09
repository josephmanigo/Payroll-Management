"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { logAudit, logAuditWithCurrentUser } from "@/lib/audit-logger"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"

interface CreateEmployeeAccountData {
  email: string
  firstName: string
  lastName: string
  department: string
  position?: string
  monthlySalary?: number
  hireDate?: string
  employeeNumber?: string
  phone?: string
  employeeId?: string
}

interface SendWelcomeEmailData {
  email: string
  firstName: string
  tempPassword: string
}

export async function sendWelcomeEmail(
  data: SendWelcomeEmailData,
): Promise<{ success: boolean; emailSkipped?: boolean; error?: string }> {
  // Check if email service is configured
  const resendApiKey = process.env.RESEND_API_KEY
  const brevoApiKey = process.env.BREVO_API_KEY

  if (!resendApiKey && !brevoApiKey) {
    return { success: true, emailSkipped: true }
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const loginUrl = `${appUrl}/login`

    const emailContent = {
      to: data.email,
      subject: "Welcome to Payroll Management - Your Account is Ready",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Welcome to Payroll Management!</h1>
          <p>Hello ${data.firstName},</p>
          <p>Your employee account has been created. You can now access the Employee Portal to view your payslips and personal information.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Email:</strong> ${data.email}</p>
            <p style="margin: 10px 0 0;"><strong>Temporary Password:</strong> ${data.tempPassword}</p>
          </div>
          <p>Please log in and change your password as soon as possible.</p>
          <a href="${loginUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">Log In Now</a>
          <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">If you have any questions, please contact your HR administrator.</p>
        </div>
      `,
    }

    let emailSent = false

    if (brevoApiKey) {
      try {
        const fromEmail = process.env.BREVO_FROM_EMAIL || process.env.SMTP_USER || "noreply@payroll.com"
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": brevoApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sender: { email: fromEmail, name: "Payroll Management" },
            to: [{ email: emailContent.to }],
            subject: emailContent.subject,
            htmlContent: emailContent.html,
          }),
        })

        if (response.ok) {
          emailSent = true
        }
      } catch (brevoError) {
        console.error("Brevo email failed:", brevoError)
      }
    }

    if (!emailSent && resendApiKey) {
      const resend = new Resend(resendApiKey)
      const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"

      await resend.emails.send({
        from: fromEmail,
        to: emailContent.to,
        subject: emailContent.subject,
        html: emailContent.html,
      })
      emailSent = true
    }

    if (emailSent) {
      await logAuditWithCurrentUser({
        action: "welcome_email_sent",
        entityType: "employee",
        metadata: {
          employeeName: data.firstName,
          employeeEmail: data.email,
        },
      })
      return { success: true }
    }

    return { success: true, emailSkipped: true }
  } catch (error: any) {
    console.error("Error sending welcome email:", error)
    return { success: false, error: error.message }
  }
}

const DEFAULT_PASSWORD = "employee"

export async function createEmployeeAccount(data: CreateEmployeeAccountData) {
  const supabase = createAdminClient()
  const serverSupabase = await createClient()

  const fullName = `${data.firstName} ${data.lastName}`

  console.log("[v0] Creating employee account for:", data.email)

  const {
    data: { user: adminUser },
  } = await serverSupabase.auth.getUser()
  let adminName = "System"
  let adminRole: "admin" | "hr" | "employee" = "admin"
  if (adminUser) {
    const { data: adminProfile } = await serverSupabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", adminUser.id)
      .maybeSingle()
    adminName = adminProfile?.full_name || adminUser.email?.split("@")[0] || "Admin"
    adminRole = (adminProfile?.role as "admin" | "hr" | "employee") || "admin"
  }

  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find((u) => u.email === data.email)

  let userId: string | null = null
  let userAlreadyExists = false

  if (existingUser) {
    // User already exists - update their info and link them
    userAlreadyExists = true
    userId = existingUser.id
    console.log("[v0] Found existing user:", existingUser.id)

    // Reset password and update role
    await supabase.auth.admin.updateUserById(existingUser.id, {
      password: DEFAULT_PASSWORD,
      user_metadata: {
        ...existingUser.user_metadata,
        full_name: fullName,
        role: "employee",
      },
    })

    // Upsert profile
    await supabase.from("profiles").upsert({
      id: existingUser.id,
      email: data.email,
      full_name: fullName,
      role: "employee",
      department: data.department,
      updated_at: new Date().toISOString(),
    })
  } else {
    // Create new user with admin API - this skips email confirmation
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "employee",
      },
    })

    if (createError) {
      console.log("[v0] Create error:", createError.message)
      return { error: createError.message }
    }

    if (userData.user) {
      userId = userData.user.id
      console.log("[v0] Created new user:", userData.user.id)

      // Create/update profile
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userData.user.id,
        email: data.email,
        full_name: fullName,
        role: "employee",
        department: data.department,
        updated_at: new Date().toISOString(),
      })

      if (profileError) {
        console.error("[v0] Profile update error:", profileError)
      }

      await logAudit({
        userId: adminUser?.id || null,
        userRole: adminRole,
        userName: adminName,
        userEmail: adminUser?.email || null,
        action: "employee_created",
        entityType: "employee",
        entityId: userId,
        metadata: {
          employeeName: fullName,
          employeeEmail: data.email,
          department: data.department,
        },
      })
    }
  }

  if (!userId) {
    return { error: "Failed to create or find user" }
  }

  // Check if employee exists
  const { data: existingEmployee } = await supabase.from("employees").select("id").eq("email", data.email).maybeSingle()

  if (existingEmployee) {
    // Update existing employee with user_id
    const { error: updateError } = await supabase
      .from("employees")
      .update({
        user_id: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingEmployee.id)

    if (updateError) {
      console.error("[v0] Failed to update employee:", updateError)
    } else {
      console.log("[v0] Updated employee with user_id:", existingEmployee.id)
    }
  } else {
    // Insert new employee record
    const employeeId = data.employeeId || crypto.randomUUID()
    const { error: insertError } = await supabase.from("employees").insert({
      id: employeeId,
      employee_number: data.employeeNumber || `EMP-${Date.now()}`,
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone || null,
      department: data.department,
      position: data.position || "Employee",
      monthly_salary: data.monthlySalary || 0,
      hire_date: data.hireDate || new Date().toISOString().split("T")[0],
      status: "active",
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error("[v0] Failed to insert employee:", insertError)
      return { success: false, error: `Account created but failed to create employee record: ${insertError.message}` }
    }
    console.log("[v0] Inserted new employee record:", employeeId)
  }

  // Send welcome email (non-blocking)
  const sendEmailResult = await sendWelcomeEmail({
    email: data.email,
    firstName: data.firstName,
    tempPassword: DEFAULT_PASSWORD,
  })

  if (!sendEmailResult.success) {
    console.log("[v0] Failed to send welcome email:", data.email)
  } else if (sendEmailResult.emailSkipped) {
    console.log("[v0] Welcome email skipped for:", data.email)
  } else {
    console.log("[v0] Welcome email sent for:", data.email)
  }

  return {
    success: true,
    userId: userId,
    tempPassword: DEFAULT_PASSWORD,
    alreadyExists: userAlreadyExists,
  }
}

// Create account for a single employee by email
export async function createAccountForEmployee(email: string) {
  const supabase = createAdminClient()

  console.log("[v0] Creating account for employee:", email)

  // Find the employee by email
  const { data: employee, error: fetchError } = await supabase
    .from("employees")
    .select("id, email, first_name, last_name, department, position, monthly_salary, hire_date, employee_number, phone")
    .eq("email", email)
    .single()

  if (fetchError || !employee) {
    console.log("[v0] Employee not found:", email)
    return { error: "Employee not found with this email" }
  }

  console.log("[v0] Found employee:", employee.id)

  const result = await createEmployeeAccount({
    email: employee.email,
    firstName: employee.first_name,
    lastName: employee.last_name,
    department: employee.department || "",
    position: employee.position || "",
    monthlySalary: employee.monthly_salary || 0,
    hireDate: employee.hire_date || "",
    employeeNumber: employee.employee_number || "",
    phone: employee.phone || "",
    employeeId: employee.id,
  })

  return result
}

export async function checkEmployeeAccount(email: string) {
  const supabase = createAdminClient()

  // Check if user exists in auth
  const { data: users } = await supabase.auth.admin.listUsers()
  const authUser = users?.users?.find((u) => u.email === email)

  // Check employee record
  const { data: employee } = await supabase
    .from("employees")
    .select("id, email, first_name, last_name, user_id")
    .eq("email", email)
    .single()

  // Check profile
  const { data: profile } = await supabase.from("profiles").select("id, email, role").eq("email", email).single()

  await logAuditWithCurrentUser({
    action: "employee_account_checked",
    entityType: "employee",
    entityId: employee?.id || null,
    metadata: {
      email,
      hasAuthAccount: !!authUser,
      hasEmployeeRecord: !!employee,
      hasProfile: !!profile,
      isLinked: employee?.user_id === authUser?.id && !!authUser,
    },
  })

  return {
    email,
    hasAuthAccount: !!authUser,
    authUserId: authUser?.id || null,
    hasEmployeeRecord: !!employee,
    employeeUserId: employee?.user_id || null,
    hasProfile: !!profile,
    profileRole: profile?.role || null,
    isLinked: employee?.user_id === authUser?.id && !!authUser,
  }
}

export async function syncExistingEmployeeAccounts() {
  const supabase = createAdminClient()

  console.log("[v0] Starting sync of existing employee accounts")

  // Get all employees without user_id
  const { data: employeesWithoutAccounts, error } = await supabase
    .from("employees")
    .select("id, email, first_name, last_name, department, position, monthly_salary, hire_date, employee_number, phone")
    .is("user_id", null)

  if (error) {
    console.error("[v0] Failed to fetch employees:", error)
    return { error: error.message, synced: 0, failed: 0 }
  }

  let synced = 0
  let failed = 0

  for (const employee of employeesWithoutAccounts || []) {
    const result = await createEmployeeAccount({
      email: employee.email,
      firstName: employee.first_name,
      lastName: employee.last_name,
      department: employee.department || "",
      position: employee.position || "",
      monthlySalary: employee.monthly_salary || 0,
      hireDate: employee.hire_date || "",
      employeeNumber: employee.employee_number || "",
      phone: employee.phone || "",
      employeeId: employee.id,
    })

    if (result.error && !result.alreadyExists) {
      failed++
      console.log("[v0] Failed to create account for:", employee.email, result.error)
    } else {
      synced++
      console.log("[v0] Account synced for:", employee.email)
    }
  }

  await logAuditWithCurrentUser({
    action: "employees_bulk_synced",
    entityType: "employee",
    metadata: {
      totalProcessed: employeesWithoutAccounts?.length || 0,
      synced,
      failed,
    },
  })

  return { synced, failed, error: null }
}

export async function changeEmployeePassword(
  employeeEmail: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()
  const serverSupabase = await createClient()

  const {
    data: { user: adminUser },
  } = await serverSupabase.auth.getUser()
  let adminName = "System"
  let adminRole: "admin" | "hr" | "employee" = "admin"
  if (adminUser) {
    const { data: adminProfile } = await serverSupabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", adminUser.id)
      .maybeSingle()
    adminName = adminProfile?.full_name || adminUser.email?.split("@")[0] || "Admin"
    adminRole = (adminProfile?.role as "admin" | "hr" | "employee") || "admin"
  }

  // Find the user by email
  const { data: users } = await supabase.auth.admin.listUsers()
  const authUser = users?.users?.find((u) => u.email === employeeEmail)

  if (!authUser) {
    return { error: "User account not found for this employee" }
  }

  // Get employee name for audit log
  const { data: employee } = await supabase
    .from("employees")
    .select("first_name, last_name")
    .eq("email", employeeEmail)
    .maybeSingle()

  // Update the password
  const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
    password: newPassword,
  })

  if (error) {
    return { error: error.message }
  }

  await logAudit({
    userId: adminUser?.id || null,
    userRole: adminRole,
    userName: adminName,
    userEmail: adminUser?.email || null,
    action: "password_change",
    entityType: "employee",
    entityId: authUser.id,
    metadata: {
      employeeName: employee ? `${employee.first_name} ${employee.last_name}` : employeeEmail,
      employeeEmail: employeeEmail,
      changedBy: "admin",
    },
  })

  return { success: true }
}

// Comprehensive employee management actions with audit logging

export async function getAllEmployees() {
  const supabase = createAdminClient()

  const { data, error } = await supabase.from("employees").select("*").order("last_name", { ascending: true })

  if (error) {
    console.error("[v0] Error fetching employees:", error)
    return { success: false, error: error.message, data: [] }
  }

  // Log that admin viewed employee list
  await logAuditWithCurrentUser({
    action: "employees_list_viewed",
    entityType: "employee",
    metadata: {
      employeeCount: data?.length || 0,
    },
  })

  return { success: true, data: data || [] }
}

export async function getEmployeeById(employeeId: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase.from("employees").select("*").eq("id", employeeId).single()

  if (error) {
    console.error("[v0] Error fetching employee:", error)
    return { success: false, error: error.message, data: null }
  }

  // Log employee profile view
  await logAuditWithCurrentUser({
    action: "employee_profile_viewed",
    entityType: "employee",
    entityId: employeeId,
    metadata: {
      employeeName: `${data.first_name} ${data.last_name}`,
      employeeEmail: data.email,
    },
  })

  return { success: true, data }
}

export async function updateEmployee(
  employeeId: string,
  data: {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    department?: string
    position?: string
    monthly_salary?: number
    status?: string
  },
) {
  const supabase = createAdminClient()

  // Get existing employee data for comparison
  const { data: existingEmployee } = await supabase.from("employees").select("*").eq("id", employeeId).single()

  const { data: result, error } = await supabase
    .from("employees")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", employeeId)
    .select()
    .single()

  if (error) {
    console.error("[v0] Error updating employee:", error)
    return { success: false, error: error.message }
  }

  // Determine what changed
  const changes: Record<string, { old: unknown; new: unknown }> = {}
  if (existingEmployee) {
    Object.keys(data).forEach((key) => {
      const oldValue = existingEmployee[key as keyof typeof existingEmployee]
      const newValue = data[key as keyof typeof data]
      if (oldValue !== newValue) {
        changes[key] = { old: oldValue, new: newValue }
      }
    })
  }

  await logAuditWithCurrentUser({
    action: "employee_updated",
    entityType: "employee",
    entityId: employeeId,
    metadata: {
      employeeName: result
        ? `${result.first_name} ${result.last_name}`
        : existingEmployee
          ? `${existingEmployee.first_name} ${existingEmployee.last_name}`
          : null,
      employeeEmail: result?.email || existingEmployee?.email,
      changes,
    },
  })

  revalidatePath("/admin/employees")
  revalidatePath("/admin")
  return { success: true, data: result }
}

export async function updateEmployeeStatus(employeeId: string, newStatus: string) {
  const supabase = createAdminClient()

  // Get existing employee data
  const { data: existingEmployee } = await supabase.from("employees").select("*").eq("id", employeeId).single()

  const { data: result, error } = await supabase
    .from("employees")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", employeeId)
    .select()
    .single()

  if (error) {
    console.error("[v0] Error updating employee status:", error)
    return { success: false, error: error.message }
  }

  await logAuditWithCurrentUser({
    action: "employee_status_changed",
    entityType: "employee",
    entityId: employeeId,
    metadata: {
      employeeName: result ? `${result.first_name} ${result.last_name}` : null,
      employeeEmail: result?.email,
      previousStatus: existingEmployee?.status,
      newStatus,
    },
  })

  revalidatePath("/admin/employees")
  revalidatePath("/admin")
  return { success: true, data: result }
}

export async function deleteEmployee(employeeId: string) {
  const supabase = createAdminClient()

  // Get employee data before deletion
  const { data: employee } = await supabase.from("employees").select("*").eq("id", employeeId).single()

  const { error } = await supabase.from("employees").delete().eq("id", employeeId)

  if (error) {
    console.error("[v0] Error deleting employee:", error)
    return { success: false, error: error.message }
  }

  await logAuditWithCurrentUser({
    action: "employee_deleted",
    entityType: "employee",
    entityId: employeeId,
    metadata: {
      employeeName: employee ? `${employee.first_name} ${employee.last_name}` : null,
      employeeEmail: employee?.email,
      employeeNumber: employee?.employee_number,
      department: employee?.department,
    },
  })

  revalidatePath("/admin/employees")
  revalidatePath("/admin")
  return { success: true }
}

export async function createEmployee(data: {
  first_name: string
  last_name: string
  email: string
  phone?: string
  department: string
  position: string
  monthly_salary: number
  hire_date: string
  employee_number?: string
}) {
  const supabase = createAdminClient()

  const employeeNumber = data.employee_number || (await getNextEmployeeNumber())

  const { data: result, error } = await supabase
    .from("employees")
    .insert({
      ...data,
      employee_number: employeeNumber,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error creating employee:", error)
    return { success: false, error: error.message }
  }

  await logAuditWithCurrentUser({
    action: "employee_created",
    entityType: "employee",
    entityId: result.id,
    metadata: {
      employeeName: `${result.first_name} ${result.last_name}`,
      employeeEmail: result.email,
      employeeNumber: result.employee_number,
      department: result.department,
      position: result.position,
      monthlySalary: result.monthly_salary,
    },
  })

  revalidatePath("/admin/employees")
  revalidatePath("/admin")
  return { success: true, data: result }
}

export async function getNextEmployeeNumber(): Promise<string> {
  const supabase = createAdminClient()
  const currentYear = new Date().getFullYear()

  // Get the highest employee number for the current year
  const { data: employees, error } = await supabase
    .from("employees")
    .select("employee_number")
    .like("employee_number", `EMP-${currentYear}-%`)
    .order("employee_number", { ascending: false })
    .limit(1)

  if (error) {
    console.error("[v0] Error fetching employee numbers:", error)
    // Fallback: get count of all employees
    const { count } = await supabase.from("employees").select("*", { count: "exact", head: true })
    return `EMP-${currentYear}-${String((count || 0) + 1).padStart(3, "0")}`
  }

  if (employees && employees.length > 0) {
    const lastNumber = employees[0].employee_number
    // Extract the numeric part (e.g., "EMP-2025-006" -> 6)
    const match = lastNumber.match(/EMP-\d{4}-(\d+)/)
    if (match) {
      const nextNum = Number.parseInt(match[1], 10) + 1
      return `EMP-${currentYear}-${String(nextNum).padStart(3, "0")}`
    }
  }

  // If no employees found for current year, start with 001
  return `EMP-${currentYear}-001`
}
