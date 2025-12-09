"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit-logger"
import { ensureUserProfile } from "@/lib/supabase/ensure-profile"
import { PESO_SIGN } from "@/lib/utils"

export async function approveBonusRequest(requestId: string, reviewerId: string) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const profileId = await ensureUserProfile(reviewerId)
  if (!profileId) {
    console.error("[v0] approveBonusRequest: Failed to ensure reviewer profile")
  }

  // Get the bonus request with employee info
  const { data: bonusRequest } = await adminClient
    .from("bonus_requests")
    .select(`
      *,
      employees (
        id,
        first_name,
        last_name,
        user_id,
        email
      )
    `)
    .eq("id", requestId)
    .single()

  if (!bonusRequest) {
    return { success: false, error: "Bonus request not found" }
  }

  const { error } = await adminClient
    .from("bonus_requests")
    .update({
      status: "approved",
      reviewed_by: profileId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)

  if (error) {
    console.error("[v0] approveBonusRequest: Error approving bonus request:", error)
    return { success: false, error: error.message }
  }

  const employee = bonusRequest.employees as any
  if (employee) {
    let profileUserId: string | null = null

    if (employee.email) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("email", employee.email)
        .maybeSingle()

      profileUserId = profile?.id || null
      console.log("[v0] approveBonusRequest: Found profile for email", employee.email, ":", profileUserId)
    }

    // Only send notification if we have a valid profile user_id
    if (profileUserId) {
      const { error: notifError } = await adminClient.from("notifications").insert({
        user_id: profileUserId,
        title: "Bonus Request Approved",
        message: `Your bonus request of ${PESO_SIGN}${bonusRequest.amount.toLocaleString()} has been approved.`,
        type: "success",
        link: "/employee",
      })

      if (notifError) {
        console.error("[v0] approveBonusRequest: Failed to send notification:", notifError)
      }
    } else {
      console.log("[v0] approveBonusRequest: No profile found for employee, skipping notification")
    }
  }

  await logAudit({
    userId: reviewerId,
    action: "bonus_approved",
    entityType: "bonus",
    entityId: requestId,
    metadata: {
      entityName: employee ? `${employee.first_name} ${employee.last_name}` : undefined,
      amount: bonusRequest.amount,
      reason: bonusRequest.reason,
    },
  })

  revalidatePath("/admin")
  revalidatePath("/admin/bonus")
  revalidatePath("/employee")
  return { success: true }
}

export async function rejectBonusRequest(requestId: string, reviewerId: string) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const profileId = await ensureUserProfile(reviewerId)
  if (!profileId) {
    console.error("[v0] rejectBonusRequest: Failed to ensure reviewer profile")
  }

  // Get the bonus request with employee info
  const { data: bonusRequest } = await adminClient
    .from("bonus_requests")
    .select(`
      *,
      employees (
        id,
        first_name,
        last_name,
        user_id,
        email
      )
    `)
    .eq("id", requestId)
    .single()

  if (!bonusRequest) {
    return { success: false, error: "Bonus request not found" }
  }

  const { error } = await adminClient
    .from("bonus_requests")
    .update({
      status: "rejected",
      reviewed_by: profileId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)

  if (error) {
    console.error("[v0] rejectBonusRequest: Error rejecting bonus request:", error)
    return { success: false, error: error.message }
  }

  const employee = bonusRequest.employees as any
  if (employee) {
    let profileUserId: string | null = null

    if (employee.email) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("email", employee.email)
        .maybeSingle()

      profileUserId = profile?.id || null
      console.log("[v0] rejectBonusRequest: Found profile for email", employee.email, ":", profileUserId)
    }

    // Only send notification if we have a valid profile user_id
    if (profileUserId) {
      const { error: notifError } = await adminClient.from("notifications").insert({
        user_id: profileUserId,
        title: "Bonus Request Rejected",
        message: `Your bonus request of ${PESO_SIGN}${bonusRequest.amount.toLocaleString()} has been rejected.`,
        type: "error",
        link: "/employee",
      })

      if (notifError) {
        console.error("[v0] rejectBonusRequest: Failed to send notification:", notifError)
      }
    } else {
      console.log("[v0] rejectBonusRequest: No profile found for employee, skipping notification")
    }
  }

  await logAudit({
    userId: reviewerId,
    action: "bonus_rejected",
    entityType: "bonus",
    entityId: requestId,
    metadata: {
      entityName: employee ? `${employee.first_name} ${employee.last_name}` : undefined,
      amount: bonusRequest.amount,
    },
  })

  revalidatePath("/admin")
  revalidatePath("/admin/bonus")
  revalidatePath("/employee")
  return { success: true }
}

export async function getAllBonusRequests() {
  const adminClient = createAdminClient()

  console.log("[v0] getAllBonusRequests: Fetching all bonus requests with admin client...")

  const { data, error } = await adminClient
    .from("bonus_requests")
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
    console.error("[v0] getAllBonusRequests: Error:", error.message)
    return { success: false, error: error.message, data: [] }
  }

  console.log("[v0] getAllBonusRequests: Found", data?.length || 0, "bonus requests")

  await logAudit({
    action: "bonus_requests_viewed",
    entityType: "bonus",
    metadata: {
      count: data?.length || 0,
    },
  })

  return { success: true, data: data || [] }
}

export async function deleteBonusRequest(requestId: string) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  // Get the bonus request first
  const { data: bonusRequest } = await supabase
    .from("bonus_requests")
    .select(`
      *,
      employees (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq("id", requestId)
    .single()

  const { error } = await supabase.from("bonus_requests").delete().eq("id", requestId)

  if (error) {
    console.error("Error deleting bonus request:", error)
    return { success: false, error: error.message }
  }

  const employee = bonusRequest?.employees as { first_name: string; last_name: string; email: string } | null
  await logAudit({
    action: "bonus_deleted",
    entityType: "bonus",
    entityId: requestId,
    metadata: {
      entityName: employee ? `${employee.first_name} ${employee.last_name}` : null,
      amount: bonusRequest?.amount,
      reason: bonusRequest?.reason,
      status: bonusRequest?.status,
    },
  })

  revalidatePath("/admin/bonus")
  return { success: true }
}
