import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getSupabaseUrl } from "./url"

function getSupabaseUrlFromEnv(): string {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
  }

  // Extract project ref from POSTGRES_URL (format: postgresql://postgres.[project-ref]:[password]@...)
  const postgresUrl = process.env.POSTGRES_URL || ""
  const match = postgresUrl.match(/postgres\.([a-z0-9]+)/)
  if (match) {
    return `https://${match[1]}.supabase.co`
  }

  throw new Error("Unable to determine Supabase URL. Please set NEXT_PUBLIC_SUPABASE_URL environment variable.")
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(getSupabaseUrl(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The "setAll" method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}
