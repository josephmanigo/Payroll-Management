export function getSupabaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
  }

  if (process.env.SUPABASE_URL) {
    return process.env.SUPABASE_URL
  }

  // Try to extract from NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
  // Format could be: https://[project-ref].supabase.co/auth/v1/callback
  const redirectUrl = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || ""
  const supabaseMatch = redirectUrl.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/)
  if (supabaseMatch) {
    return `https://${supabaseMatch[1]}.supabase.co`
  }

  // Try to extract project ref from POSTGRES_URL
  // Format: postgresql://postgres.[project-ref]:[password]@aws-0-...
  // Or: postgresql://postgres:[password]@db.[project-ref].supabase.co:...
  const postgresUrl = process.env.POSTGRES_URL || ""

  // Pattern 1: postgres.[project-ref]:password@
  const pattern1 = postgresUrl.match(/postgres\.([a-z0-9-]+):/)
  if (pattern1) {
    return `https://${pattern1[1]}.supabase.co`
  }

  // Pattern 2: @db.[project-ref].supabase.co
  const pattern2 = postgresUrl.match(/@db\.([a-z0-9-]+)\.supabase\.co/)
  if (pattern2) {
    return `https://${pattern2[1]}.supabase.co`
  }

  // Pattern 3: .[project-ref].supabase.co anywhere in the URL
  const pattern3 = postgresUrl.match(/\.([a-z0-9-]+)\.supabase\.co/)
  if (pattern3) {
    return `https://${pattern3[1]}.supabase.co`
  }

  // Pattern 4: pooler URL format aws-0-[region].pooler.supabase.com - extract from user
  // postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com
  const pattern4 = postgresUrl.match(/postgres\.([a-z0-9]+)[.:]/)
  if (pattern4) {
    return `https://${pattern4[1]}.supabase.co`
  }

  throw new Error("Supabase URL not found. Please set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL environment variable.")
}
