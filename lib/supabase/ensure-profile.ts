"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

function formatEmailToName(email: string): string {
  const localPart = email.split("@")[0]
  // Check for common admin patterns
  if (localPart.toLowerCase() === "admin") {
    return "System Administrator"
  }
  if (localPart.toLowerCase() === "hr") {
    return "HR Administrator"
  }
  // Format other emails: john.doe -> John Doe
  return localPart
    .split(/[._-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

/**
 * Ensures the current user has a profile in the profiles table.
 * Creates one if it doesn't exist.
 * Returns the profile ID or null if failed.
 */
export async function ensureUserProfile(userId: string): Promise<string | null> {
  const adminClient = createAdminClient()
  const supabase = await createClient()

  // Check if profile exists
  const { data: existingProfile } = await adminClient
    .from("profiles")
    .select("id, full_name")
    .eq("id", userId)
    .maybeSingle()

  if (existingProfile) {
    if (existingProfile.full_name && !existingProfile.full_name.includes(" ")) {
      const { data: authUser } = await supabase.auth.getUser()
      if (authUser?.user?.email) {
        const betterName = formatEmailToName(authUser.user.email)
        if (betterName !== existingProfile.full_name) {
          await adminClient.from("profiles").update({ full_name: betterName }).eq("id", userId)
        }
      }
    }
    return existingProfile.id
  }

  // Get user info from auth
  const { data: authUser } = await supabase.auth.getUser()

  if (!authUser?.user) {
    console.error("[v0] ensureUserProfile: No authenticated user found")
    return null
  }

  const fullName = authUser.user.email ? formatEmailToName(authUser.user.email) : "Administrator"

  // Create profile for the user
  const { data: newProfile, error } = await adminClient
    .from("profiles")
    .insert({
      id: userId,
      email: authUser.user.email,
      full_name: fullName,
      role: "admin",
    })
    .select("id")
    .single()

  if (error) {
    console.error("[v0] ensureUserProfile: Error creating profile:", error.message)
    return null
  }

  console.log("[v0] ensureUserProfile: Created new profile for user:", userId)
  return newProfile.id
}
