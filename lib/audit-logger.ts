"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { AuditEntityType, UserRole } from "@/lib/types"

interface LogAuditParams {
  userId?: string | null
  userRole?: UserRole
  userName?: string | null
  userEmail?: string | null
  action: string
  entityType: AuditEntityType
  entityId?: string | null
  metadata?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
}

function formatEmailToProperName(email: string): string {
  const localPart = email.split("@")[0]
  if (localPart.toLowerCase() === "admin" || email.toLowerCase().includes("admin")) {
    return "Admin"
  }
  if (localPart.toLowerCase() === "hr") {
    return "HR Administrator"
  }
  return localPart
    .split(/[._-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

function isAdminEmail(email: string | null): boolean {
  if (!email) return false
  const adminEmails = ["admin@company.com", "hr@company.com"]
  const adminPatterns = ["admin", "administrator", "hr@"]
  return (
    adminEmails.includes(email.toLowerCase()) || adminPatterns.some((pattern) => email.toLowerCase().includes(pattern))
  )
}

async function lookupEmployeeByEmail(
  adminClient: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<{ firstName: string; lastName: string } | null> {
  const { data: employee } = await adminClient
    .from("employees")
    .select("first_name, last_name")
    .eq("email", email)
    .maybeSingle()

  if (employee) {
    return { firstName: employee.first_name, lastName: employee.last_name }
  }
  return null
}

/**
 * Logs an action to the audit_logs table
 * Uses admin client to bypass RLS for inserting logs
 */
export async function logAudit(params: LogAuditParams): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient()

    let userName = params.userName
    let userEmail = params.userEmail
    let userRole = params.userRole || "employee"

    if (userEmail && isAdminEmail(userEmail)) {
      userRole = "admin"
      userName = "Admin"
    } else if (userEmail) {
      const employee = await lookupEmployeeByEmail(adminClient, userEmail)
      if (employee) {
        userName = `${employee.firstName} ${employee.lastName}`
        userRole = "employee"
      }
    }

    // If still no name, try profile lookup
    if (params.userId && (!userName || userName === "System")) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", params.userId)
        .maybeSingle()

      if (profile) {
        if (profile.role === "admin") {
          userRole = "admin"
          userName = "Admin"
        } else if (!userName || userName === "System") {
          userName = profile.full_name
          userEmail = userEmail || profile.email
        }
      }
    }

    // Final fallback - format email to name
    if (!userName || userName === "System") {
      if (userEmail) {
        userName = formatEmailToProperName(userEmail)
      } else {
        userName = "System"
      }
    }

    const { error } = await adminClient.from("audit_logs").insert({
      user_id: params.userId || null,
      user_role: userRole,
      user_name: userName || null,
      user_email: userEmail || null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      metadata: params.metadata || {},
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error("[Audit Logger] Failed to log audit:", error.message)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error("[Audit Logger] Error:", errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * Logs an action with the current authenticated user's context
 */
export async function logAuditWithCurrentUser(
  params: Omit<LogAuditParams, "userId" | "userRole" | "userName" | "userEmail">,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return logAudit({
        ...params,
        userId: null,
        userRole: "admin",
        userName: "System",
        userEmail: null,
      })
    }

    const userEmail = user.email || null

    if (isAdminEmail(userEmail)) {
      return logAudit({
        ...params,
        userId: user.id,
        userRole: "admin",
        userName: "Admin",
        userEmail,
      })
    }

    let userName: string | null = null
    let userRole: UserRole = "employee"

    if (userEmail) {
      const employee = await lookupEmployeeByEmail(adminClient, userEmail)
      if (employee) {
        userName = `${employee.firstName} ${employee.lastName}`
      }
    }

    // Fallback to profile if no employee found
    if (!userName) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .maybeSingle()

      if (profile) {
        userName = profile.full_name
        if (profile.role === "admin") {
          userRole = "admin"
          userName = "Admin"
        }
      }
    }

    // Final fallback - format email to name
    if (!userName) {
      if (userEmail) {
        userName = formatEmailToProperName(userEmail)
      } else {
        userName = "System"
      }
    }

    return logAudit({
      ...params,
      userId: user.id,
      userRole,
      userName,
      userEmail,
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error("[Audit Logger] Error:", errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * Client-side function to log audits via API route
 * Use this in client components and stores
 */
export async function logAuditFromClient(
  params: Omit<LogAuditParams, "userId" | "userRole" | "userName" | "userEmail">,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("/api/audit-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const data = await response.json()
      return { success: false, error: data.error || "Failed to log audit" }
    }

    return { success: true }
  } catch (error) {
    console.error("[Audit Logger Client] Error:", error)
    return { success: false, error: "Failed to log audit" }
  }
}
