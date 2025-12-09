"use client"

import { createClient } from "@/lib/supabase/client"
import type { AuditEntityType } from "@/lib/types"

interface LogAuditFromClientParams {
  action: string
  entityType: AuditEntityType
  entityId?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Client-side function to log audit events
 * Gets current user context and sends to server action
 */
export async function logAuditFromClient(
  params: LogAuditFromClientParams,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.warn("[Audit Logger Client] No user found, skipping audit log")
      return { success: false, error: "No user found" }
    }

    // Get profile info
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, role")
      .eq("id", user.id)
      .maybeSingle()

    let displayName = profile?.full_name || null
    const userRole = profile?.role || user.user_metadata?.role || "employee"

    if (userRole === "employee" && !displayName) {
      const { data: employee } = await supabase
        .from("employees")
        .select("first_name, last_name")
        .eq("user_id", user.id)
        .maybeSingle()

      if (employee) {
        displayName = `${employee.first_name} ${employee.last_name}`.trim()
      }
    }

    // Insert audit log using admin client via server action
    const response = await fetch("/api/audit-log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: user.id,
        userRole: userRole,
        userName: displayName || user.email?.split("@")[0] || null,
        userEmail: profile?.email || user.email || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        metadata: params.metadata || {},
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to log audit")
    }

    return { success: true }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error("[Audit Logger Client] Error:", errorMsg)
    return { success: false, error: errorMsg }
  }
}
