import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr"
import { getSupabaseUrl } from "./url"

let client: ReturnType<typeof createSSRBrowserClient> | null = null

export function createClient() {
  if (client) return client

  try {
    const url = getSupabaseUrl()
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !anonKey) {
      console.error("[Supabase] Missing URL or anon key")
      throw new Error("Supabase configuration missing")
    }

    client = createSSRBrowserClient(url, anonKey)
    return client
  } catch (error) {
    console.error("[Supabase] Failed to create client:", error)
    throw error
  }
}

export { createSSRBrowserClient as createBrowserClient }
