"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAuditWithCurrentUser } from "@/lib/audit-logger"
import type { AuditLog } from "@/lib/types"

const ADMIN_VIEW_ONLY_ACTIONS = [
  "employees_list_viewed",
  "employee_profile_viewed",
  "leave_requests_viewed",
  "bonus_requests_viewed",
  "attendance_viewed",
  "payslips_viewed",
  "audit_logs_viewed",
  "payslip_viewed",
  "employee_account_checked",
]

interface GetAuditLogsParams {
  page?: number
  limit?: number
  userId?: string
  userRole?: string
  entityType?: string
  action?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  excludeAdminViews?: boolean
}

interface GetAuditLogsResponse {
  success: boolean
  data: AuditLog[]
  total: number
  error?: string
}

function formatUserNameFromEmail(email: string | null): string | null {
  if (!email) return null
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

function isAdminUser(email: string | null, role: string | null): boolean {
  if (role === "admin") return true
  if (!email) return false
  return email.toLowerCase().includes("admin")
}

export async function getAuditLogs(params: GetAuditLogsParams = {}): Promise<GetAuditLogsResponse> {
  const adminClient = createAdminClient()
  const {
    page = 1,
    limit = 50,
    userId,
    userRole,
    entityType,
    action,
    dateFrom,
    dateTo,
    search,
    excludeAdminViews = true,
  } = params

  try {
    let query = adminClient.from("audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false })

    if (excludeAdminViews) {
      for (const viewAction of ADMIN_VIEW_ONLY_ACTIONS) {
        query = query.not("action", "eq", viewAction)
      }
      query = query.not("action", "ilike", "%_viewed")
    }

    if (userId) {
      query = query.eq("user_id", userId)
    }

    if (userRole) {
      query = query.eq("user_role", userRole)
    }

    if (entityType) {
      query = query.eq("entity_type", entityType)
    }

    if (action) {
      query = query.ilike("action", `%${action}%`)
    }

    if (dateFrom) {
      query = query.gte("created_at", dateFrom)
    }

    if (dateTo) {
      const endDate = new Date(dateTo)
      endDate.setDate(endDate.getDate() + 1)
      query = query.lt("created_at", endDate.toISOString())
    }

    if (search) {
      query = query.or(`action.ilike.%${search}%,user_name.ilike.%${search}%,user_email.ilike.%${search}%`)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error("[Audit Logs] Error fetching logs:", error.message)
      return { success: false, data: [], total: 0, error: error.message }
    }

    const logs = data || []
    const enrichedLogs: AuditLog[] = []

    const userEmails = [...new Set(logs.map((log) => log.user_email).filter(Boolean))]
    const userIds = [...new Set(logs.map((log) => log.user_id).filter(Boolean))]

    let employeeMap: Map<string, { first_name: string; last_name: string }> = new Map()
    if (userEmails.length > 0) {
      const { data: employees } = await adminClient
        .from("employees")
        .select("email, first_name, last_name")
        .in("email", userEmails)

      if (employees) {
        employeeMap = new Map(
          employees.map((emp) => [emp.email, { first_name: emp.first_name, last_name: emp.last_name }]),
        )
      }
    }

    let employeeByUserIdMap: Map<string, { first_name: string; last_name: string }> = new Map()
    if (userIds.length > 0) {
      const { data: employeesByUserId } = await adminClient
        .from("employees")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds)

      if (employeesByUserId) {
        employeeByUserIdMap = new Map(
          employeesByUserId
            .filter((e) => e.user_id)
            .map((emp) => [emp.user_id!, { first_name: emp.first_name, last_name: emp.last_name }]),
        )
      }
    }

    let profileMap: Map<string, { full_name: string; email: string }> = new Map()
    if (userIds.length > 0) {
      const { data: profiles } = await adminClient.from("profiles").select("id, full_name, email").in("id", userIds)

      if (profiles) {
        profileMap = new Map(profiles.map((p) => [p.id, { full_name: p.full_name, email: p.email }]))
      }
    }

    for (const log of logs) {
      let displayName = log.user_name

      if (isAdminUser(log.user_email, log.user_role)) {
        enrichedLogs.push({
          ...log,
          user_name: "Admin",
        } as AuditLog)
        continue
      }

      const looksLikeEmailPrefix = displayName && !displayName.includes(" ") && /[._-]/.test(displayName)
      const isSimpleName =
        displayName && (displayName.toLowerCase() === "admin" || displayName.toLowerCase() === "system")
      const needsEnrichment = !displayName || looksLikeEmailPrefix || isSimpleName

      if (needsEnrichment) {
        const employeeByEmail = log.user_email ? employeeMap.get(log.user_email) : null
        if (employeeByEmail) {
          displayName = `${employeeByEmail.first_name} ${employeeByEmail.last_name}`
        } else {
          const employeeByUserId = log.user_id ? employeeByUserIdMap.get(log.user_id) : null
          if (employeeByUserId) {
            displayName = `${employeeByUserId.first_name} ${employeeByUserId.last_name}`
          } else {
            const profile = log.user_id ? profileMap.get(log.user_id) : null
            if (profile?.full_name && profile.full_name.includes(" ")) {
              displayName = profile.full_name
            } else if (log.user_email) {
              displayName = formatUserNameFromEmail(log.user_email)
            }
          }
        }
      }

      enrichedLogs.push({
        ...log,
        user_name: displayName,
      } as AuditLog)
    }

    return {
      success: true,
      data: enrichedLogs,
      total: count || 0,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error("[Audit Logs] Error:", errorMsg)
    return { success: false, data: [], total: 0, error: errorMsg }
  }
}

export async function getEmployeeAuditLogs(
  userId: string,
  params: Omit<GetAuditLogsParams, "userId"> = {},
): Promise<GetAuditLogsResponse> {
  return getAuditLogs({ ...params, userId })
}

export async function getAuditLogStats() {
  const adminClient = createAdminClient()

  try {
    const { data: entityCounts, error: entityError } = await adminClient.from("audit_logs").select("entity_type")

    if (entityError) throw entityError

    const entityTypeStats =
      entityCounts?.reduce(
        (acc, log) => {
          acc[log.entity_type] = (acc[log.entity_type] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ) || {}

    const { data: roleCounts, error: roleError } = await adminClient.from("audit_logs").select("user_role")

    if (roleError) throw roleError

    const roleStats =
      roleCounts?.reduce(
        (acc, log) => {
          acc[log.user_role] = (acc[log.user_role] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ) || {}

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count: todayCount } = await adminClient
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString())

    const { count: totalCount } = await adminClient.from("audit_logs").select("*", { count: "exact", head: true })

    const { count: loginCount } = await adminClient
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("action", "login")

    const { count: logoutCount } = await adminClient
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("action", "logout")

    return {
      success: true,
      data: {
        entityTypeStats,
        roleStats,
        todayCount: todayCount || 0,
        totalCount: totalCount || 0,
        loginCount: loginCount || 0,
        logoutCount: logoutCount || 0,
      },
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error("[Audit Logs] Error getting stats:", errorMsg)
    return { success: false, error: errorMsg, data: null }
  }
}

export async function getUniqueUsers() {
  const adminClient = createAdminClient()

  try {
    const { data, error } = await adminClient
      .from("audit_logs")
      .select("user_id, user_name, user_email, user_role")
      .not("user_id", "is", null)

    if (error) throw error

    const uniqueUsers = Array.from(
      new Map(
        data
          ?.filter((log) => log.user_id)
          .map((log) => [
            log.user_id,
            { id: log.user_id, name: log.user_name, email: log.user_email, role: log.user_role },
          ]),
      ).values(),
    )

    return { success: true, data: uniqueUsers }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error("[Audit Logs] Error getting unique users:", errorMsg)
    return { success: false, error: errorMsg, data: [] }
  }
}

export async function deleteAuditLog(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()

  if (profile?.role !== "admin" && profile?.role !== "hr") {
    return { success: false, error: "Not authorized" }
  }

  const adminClient = createAdminClient()
  const { data: auditLog } = await adminClient.from("audit_logs").select("*").eq("id", id).single()

  if (!auditLog) {
    return { success: false, error: "Audit log not found" }
  }

  const { error: deleteError } = await adminClient.from("audit_logs").delete().eq("id", id)

  if (deleteError) {
    console.error("[Audit Logs] Delete error:", deleteError.message)
    return { success: false, error: deleteError.message }
  }

  await logAuditWithCurrentUser({
    action: "audit_log_deleted",
    entityType: "system",
    entityId: id,
    metadata: {
      deletedLog: {
        action: auditLog.action,
        entityType: auditLog.entity_type,
        userName: auditLog.user_name,
        createdAt: auditLog.created_at,
      },
    },
  })

  return { success: true }
}
