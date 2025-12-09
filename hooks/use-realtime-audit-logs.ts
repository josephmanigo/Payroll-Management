"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { AuditLog } from "@/lib/types"

const VIEW_ONLY_ACTIONS = [
  "employees_list_viewed",
  "employee_profile_viewed",
  "leave_requests_viewed",
  "bonus_requests_viewed",
  "attendance_viewed",
  "payslips_viewed",
  "audit_logs_viewed",
  "payslip_viewed",
  "employee_account_checked",
  "viewed",
]

interface UseRealtimeAuditLogsParams {
  userId?: string | null
  limit?: number
  entityType?: string
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

function enrichLogWithFullName(
  log: AuditLog,
  employeeMap: Map<string, { first_name: string; last_name: string }>,
): AuditLog {
  let displayName = log.user_name

  // Check if user_name looks like an email prefix (contains dots/underscores, no spaces)
  const looksLikeEmailPrefix = displayName && !displayName.includes(" ") && /[._-]/.test(displayName)

  const isAdminUser =
    log.user_email?.toLowerCase().includes("admin") ||
    log.user_role === "admin" ||
    displayName?.toLowerCase() === "admin"

  if (isAdminUser) {
    return {
      ...log,
      user_name: "Admin",
    }
  }

  if (looksLikeEmailPrefix || !displayName) {
    // Try to get from employees map
    const employee = log.user_email ? employeeMap.get(log.user_email) : null
    if (employee) {
      displayName = `${employee.first_name} ${employee.last_name}`
    } else if (log.user_email) {
      // Format from email as fallback
      displayName = formatUserNameFromEmail(log.user_email)
    }
  }

  return {
    ...log,
    user_name: displayName,
  }
}

function isViewOnlyAction(action: string): boolean {
  return VIEW_ONLY_ACTIONS.some((viewAction) => action === viewAction || action.endsWith("_viewed"))
}

export function useRealtimeAuditLogs(params: UseRealtimeAuditLogsParams = {}) {
  const { userId, limit = 100, entityType } = params
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const employeeMapRef = useRef<Map<string, { first_name: string; last_name: string }>>(new Map())

  const fetchLogs = useCallback(async () => {
    const supabase = createClient()

    try {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit * 2) // Fetch more to account for filtered items

      if (userId) {
        query = query.eq("user_id", userId)
      }

      if (entityType) {
        query = query.eq("entity_type", entityType)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        console.error("[Audit Logs] Fetch error:", fetchError.message)
        setError(fetchError.message)
      } else {
        let logsData = (data || []) as AuditLog[]

        logsData = logsData.filter((log) => !isViewOnlyAction(log.action))

        // Limit after filtering
        logsData = logsData.slice(0, limit)

        const userEmails = [...new Set(logsData.map((log) => log.user_email).filter(Boolean))]
        if (userEmails.length > 0) {
          const { data: employees } = await supabase
            .from("employees")
            .select("email, first_name, last_name")
            .in("email", userEmails)

          if (employees) {
            employeeMapRef.current = new Map(
              employees.map((emp) => [emp.email, { first_name: emp.first_name, last_name: emp.last_name }]),
            )
          }
        }

        // Enrich logs with full names
        const enrichedLogs = logsData.map((log) => enrichLogWithFullName(log, employeeMapRef.current))

        setLogs(enrichedLogs)
        setError(null)
      }
    } catch (err) {
      console.error("[Audit Logs] Error:", err)
      setError("Failed to fetch audit logs")
    } finally {
      setLoading(false)
    }
  }, [userId, limit, entityType])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient()

    // Build filter based on params
    let filter = undefined
    if (userId) {
      filter = `user_id=eq.${userId}`
    }

    const channelName = userId ? `audit-logs-${userId}` : "audit-logs-all"

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "audit_logs",
          filter,
        },
        async (payload) => {
          const newLog = payload.new as AuditLog

          if (isViewOnlyAction(newLog.action)) {
            return
          }

          // Check entity type filter
          if (entityType && newLog.entity_type !== entityType) {
            return
          }

          if (newLog.user_email && !employeeMapRef.current.has(newLog.user_email)) {
            const { data: employee } = await supabase
              .from("employees")
              .select("email, first_name, last_name")
              .eq("email", newLog.user_email)
              .maybeSingle()

            if (employee) {
              employeeMapRef.current.set(employee.email, {
                first_name: employee.first_name,
                last_name: employee.last_name,
              })
            }
          }

          const enrichedLog = enrichLogWithFullName(newLog, employeeMapRef.current)
          setLogs((prev) => [enrichedLog, ...prev.slice(0, limit - 1)])
        },
      )
      .subscribe((status) => {
        console.log("[Audit Logs] Subscription status:", status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, limit, entityType])

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs,
  }
}

// Hook for admin to see all logs with real-time updates
export function useRealtimeAllAuditLogs(limit = 100) {
  return useRealtimeAuditLogs({ limit })
}

// Hook for employee to see only their own logs
export function useRealtimeMyAuditLogs(userId: string | null, limit = 50) {
  return useRealtimeAuditLogs({ userId: userId || undefined, limit })
}
