import { createClient } from "@supabase/supabase-js"
import { getSupabaseUrl } from "./url"

// Admin client for server-side operations that bypass RLS
// Uses service role key - NEVER expose this to the client
export function createAdminClient() {
  const supabaseUrl = getSupabaseUrl()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  }

  console.log("[v0] getAdminClient: Using URL:", supabaseUrl)

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export const getAdminClient = createAdminClient
