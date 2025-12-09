import { createClient } from "@/lib/supabase/server"

export type UserRole = "admin" | "hr" | "employee"

export interface UserProfile {
  id: string
  email: string
  fullName: string
  role: UserRole
  department?: string
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get profile with role
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  return {
    id: user.id,
    email: user.email || "",
    fullName: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
    role: (profile?.role as UserRole) || (user.user_metadata?.role as UserRole) || "employee",
    department: profile?.department,
  }
}

export async function getUserRole(): Promise<UserRole | null> {
  const user = await getCurrentUser()
  return user?.role || null
}

export function canAccessAdminRoutes(role: UserRole): boolean {
  return role === "admin" || role === "hr"
}

export function canManageEmployees(role: UserRole): boolean {
  return role === "admin" || role === "hr"
}

export function canManagePayroll(role: UserRole): boolean {
  return role === "admin" || role === "hr"
}

export function canViewAllData(role: UserRole): boolean {
  return role === "admin" || role === "hr"
}

export function isAdmin(role: UserRole): boolean {
  return role === "admin"
}
