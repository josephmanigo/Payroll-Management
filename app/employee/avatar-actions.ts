"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit-logger"

async function getUserInfo(userId: string) {
  const adminClient = createAdminClient()

  const { data: employee } = await adminClient
    .from("employees")
    .select("first_name, last_name, email")
    .eq("user_id", userId)
    .maybeSingle()

  if (employee) {
    return {
      userName: `${employee.first_name} ${employee.last_name}`,
      userEmail: employee.email,
      userRole: "employee" as const,
    }
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", userId)
    .maybeSingle()

  return {
    userName: profile?.full_name || profile?.email?.split("@")[0] || "User",
    userEmail: profile?.email || null,
    userRole: (profile?.role as "admin" | "hr" | "employee") || "employee",
  }
}

export async function updateEmployeeAvatar(employeeId: string, avatarUrl: string) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "Not authenticated" }
  }

  const { data: employee } = await adminClient
    .from("employees")
    .select("first_name, last_name, email, avatar_url")
    .eq("id", employeeId)
    .single()

  // Update employee avatar_url
  const { error } = await adminClient
    .from("employees")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", employeeId)

  if (error) {
    console.error("Error updating employee avatar:", error)
    return { success: false, error: error.message }
  }

  // Also update profile avatar_url
  await adminClient
    .from("profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id)

  const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : null
  await logAudit({
    userId: user.id,
    userName: employeeName,
    userEmail: employee?.email || user.email,
    userRole: "employee",
    action: "avatar_updated",
    entityType: "employee",
    entityId: employeeId,
    metadata: { employeeName },
  })

  revalidatePath("/employee")
  revalidatePath("/admin")
  return { success: true }
}

export async function updateProfileAvatar(userId: string, avatarUrl: string) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "Not authenticated" }
  }

  if (user.id !== userId) {
    return { success: false, error: "Unauthorized" }
  }

  const { error } = await adminClient
    .from("profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", userId)

  if (error) {
    console.error("Error updating profile avatar:", error)
    return { success: false, error: error.message }
  }

  const userInfo = await getUserInfo(userId)
  await logAudit({
    userId: user.id,
    userName: userInfo.userName,
    userEmail: userInfo.userEmail,
    userRole: userInfo.userRole,
    action: "avatar_updated",
    entityType: "profile",
    entityId: userId,
  })

  revalidatePath("/admin")
  revalidatePath("/employee")
  return { success: true }
}

export async function removeAvatar(employeeId: string | null, userId: string) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "Not authenticated" }
  }

  // Get current avatar URL for deletion from storage
  let oldAvatarUrl: string | null = null

  if (employeeId) {
    const { data: employee } = await adminClient.from("employees").select("avatar_url").eq("id", employeeId).single()
    oldAvatarUrl = employee?.avatar_url
  } else {
    const { data: profile } = await adminClient.from("profiles").select("avatar_url").eq("id", userId).single()
    oldAvatarUrl = profile?.avatar_url
  }

  // Delete from Supabase Storage if it's a storage URL
  if (oldAvatarUrl && oldAvatarUrl.includes("supabase.co/storage")) {
    const urlParts = oldAvatarUrl.split("/avatars/")
    if (urlParts.length > 1) {
      const filePath = urlParts[1]
      await supabase.storage.from("avatars").remove([filePath])
    }
  }

  // Update database to remove avatar_url
  await adminClient.from("profiles").update({ avatar_url: null, updated_at: new Date().toISOString() }).eq("id", userId)

  if (employeeId) {
    await adminClient
      .from("employees")
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq("id", employeeId)
  }

  const userInfo = await getUserInfo(userId)
  await logAudit({
    userId: user.id,
    userName: userInfo.userName,
    userEmail: userInfo.userEmail,
    userRole: userInfo.userRole,
    action: "avatar_removed",
    entityType: employeeId ? "employee" : "profile",
    entityId: employeeId || userId,
  })

  revalidatePath("/admin")
  revalidatePath("/employee")
  return { success: true }
}
