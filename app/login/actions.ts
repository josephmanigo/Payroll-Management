"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit-logger"

export async function login(formData: FormData) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  let userRole: "admin" | "hr" | "employee" = "employee"
  let userName: string | null = null

  if (data.user) {
    // Get role from user_metadata first (most reliable source)
    userRole = (data.user.user_metadata?.role as "admin" | "hr" | "employee") || "employee"

    // Check/create profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", data.user.id)
      .maybeSingle()

    // If profile exists, use its role
    if (profile?.role) {
      userRole = profile.role as "admin" | "hr" | "employee"
    }

    userName = profile?.full_name || data.user.user_metadata?.full_name || null

    if (!profile && (userRole === "admin" || userRole === "hr")) {
      await adminClient.from("profiles").upsert({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "Admin",
        role: userRole,
        updated_at: new Date().toISOString(),
      })
      userName = data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "Admin"
    }

    if (!userName || userRole === "employee") {
      // First try by user_id
      let employee = await adminClient
        .from("employees")
        .select("id, first_name, last_name, user_id")
        .eq("user_id", data.user.id)
        .maybeSingle()

      // If not found by user_id, try by email
      if (!employee.data && data.user.email) {
        employee = await adminClient
          .from("employees")
          .select("id, first_name, last_name, user_id")
          .eq("email", data.user.email)
          .maybeSingle()

        // Link the employee to this user_id if found by email
        if (employee.data && !employee.data.user_id) {
          await adminClient.from("employees").update({ user_id: data.user.id }).eq("id", employee.data.id)
        } else if (employee.data && employee.data.user_id !== data.user.id) {
          // Update user_id if it's different (new auth user in local environment)
          await adminClient.from("employees").update({ user_id: data.user.id }).eq("id", employee.data.id)
        }
      }

      if (employee.data) {
        userName = `${employee.data.first_name} ${employee.data.last_name}`

        // Ensure employee has a profile record too
        const { data: empProfile } = await supabase.from("profiles").select("id").eq("id", data.user.id).maybeSingle()

        if (!empProfile) {
          await adminClient.from("profiles").upsert({
            id: data.user.id,
            email: data.user.email,
            full_name: userName,
            role: "employee",
            updated_at: new Date().toISOString(),
          })
        }
      }
    }

    // Final fallback to email prefix
    if (!userName) {
      userName = data.user.email?.split("@")[0] || null
    }

    await logAudit({
      userId: data.user.id,
      userRole: userRole,
      userName: userName,
      userEmail: data.user.email || null,
      action: "login",
      entityType: "auth",
      metadata: {
        method: "password",
      },
    })
  }

  revalidatePath("/", "layout")

  if (userRole === "employee") {
    redirect("/employee")
  } else {
    redirect("/admin")
  }
}

export async function logout() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle()

    let userName = profile?.full_name || null
    const userRole =
      (profile?.role as "admin" | "hr" | "employee") ||
      (user.user_metadata?.role as "admin" | "hr" | "employee") ||
      "employee"

    if (!userName) {
      // Try by user_id first
      let employee = await adminClient
        .from("employees")
        .select("first_name, last_name")
        .eq("user_id", user.id)
        .maybeSingle()

      // Try by email if not found
      if (!employee.data && user.email) {
        employee = await adminClient
          .from("employees")
          .select("first_name, last_name")
          .eq("email", user.email)
          .maybeSingle()
      }

      if (employee.data) {
        userName = `${employee.data.first_name} ${employee.data.last_name}`
      }
    }

    // Final fallback to email prefix
    if (!userName) {
      userName = user.email?.split("@")[0] || null
    }

    await logAudit({
      userId: user.id,
      userRole: userRole,
      userName: userName,
      userEmail: user.email || null,
      action: "logout",
      entityType: "auth",
    })
  }

  await supabase.auth.signOut()

  revalidatePath("/", "layout")
  redirect("/login")
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return { success: false, error: "Not authenticated" }
  }

  // Verify current password by attempting to sign in
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })

  if (verifyError) {
    return { success: false, error: "Current password is incorrect" }
  }

  // Update to new password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Get user info for audit log
  const adminClient = createAdminClient()
  let userName: string | null = null
  let userRole: "admin" | "hr" | "employee" = "employee"

  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle()

  if (profile) {
    userName = profile.full_name
    userRole = (profile.role as "admin" | "hr" | "employee") || "employee"
  }

  if (!userName) {
    const { data: employee } = await adminClient
      .from("employees")
      .select("first_name, last_name")
      .eq("user_id", user.id)
      .maybeSingle()

    if (employee) {
      userName = `${employee.first_name} ${employee.last_name}`
    }
  }

  if (!userName) {
    userName = user.email?.split("@")[0] || null
  }

  await logAudit({
    userId: user.id,
    userRole: userRole,
    userName: userName,
    userEmail: user.email || null,
    action: "password_change",
    entityType: "auth",
    metadata: {
      method: "self_service",
    },
  })

  return { success: true }
}
