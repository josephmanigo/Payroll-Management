"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit-logger"
import { createClient } from "@/lib/supabase/server"

export type UserRole = "admin" | "hr" | "employee"

interface CreateAccountData {
  email: string
  password: string
  fullName: string
  role: UserRole
}

export async function createAccount(data: CreateAccountData) {
  const supabase = createAdminClient()

  const serverClient = await createClient()
  const {
    data: { user: currentUser },
  } = await serverClient.auth.getUser()
  let creatorInfo = {
    id: null as string | null,
    name: "System",
    email: null as string | null,
    role: "admin" as UserRole,
  }

  if (currentUser) {
    const { data: creatorProfile } = await serverClient
      .from("profiles")
      .select("full_name, email, role")
      .eq("id", currentUser.id)
      .single()

    if (creatorProfile) {
      creatorInfo = {
        id: currentUser.id,
        name: creatorProfile.full_name || "Unknown",
        email: creatorProfile.email,
        role: creatorProfile.role as UserRole,
      }
    }
  }

  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      full_name: data.fullName,
      role: data.role,
    },
  })

  if (createError) {
    return { error: createError.message }
  }

  if (!userData.user) {
    return { error: "Failed to create user" }
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userData.user.id,
    email: data.email,
    full_name: data.fullName,
    role: data.role,
    updated_at: new Date().toISOString(),
  })

  if (profileError) {
    console.error("Profile update error:", profileError)
  }

  await logAudit({
    userId: creatorInfo.id,
    userName: creatorInfo.name,
    userEmail: creatorInfo.email,
    userRole: creatorInfo.role,
    action: data.role === "admin" ? "admin_created" : "account_created",
    entityType: data.role === "admin" ? "admin" : "user",
    entityId: userData.user.id,
    metadata: {
      createdUserEmail: data.email,
      createdUserName: data.fullName,
      createdUserRole: data.role,
    },
  })

  return { success: true, userId: userData.user.id }
}
