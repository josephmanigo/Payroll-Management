import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseUrl } from "./url"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const publicRoutes = ["/login", "/auth", "/forgot-password", "/reset-password", "/", "/about", "/contact"]

  const isPublicRoute = publicRoutes.some(
    (route) => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route + "/"),
  )

  const isStaticFile =
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/favicon") ||
    request.nextUrl.pathname.startsWith("/api") ||
    request.nextUrl.pathname.includes(".")

  if (isStaticFile) {
    return supabaseResponse
  }

  const needsAuthCheck = !isPublicRoute || request.nextUrl.pathname === "/login"

  if (!needsAuthCheck) {
    return supabaseResponse
  }

  const supabase = createServerClient(getSupabaseUrl(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  let user = null

  try {
    const { data, error } = await supabase.auth.getUser()
    if (!error) {
      user = data?.user
    }
  } catch {
    if (request.nextUrl.pathname === "/login") {
      return supabaseResponse
    }
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (!user && request.nextUrl.pathname === "/login") {
    return supabaseResponse
  }

  if (user) {
    let role = user.user_metadata?.role || "employee"

    if (!user.user_metadata?.role) {
      try {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
        role = profile?.role || "employee"
      } catch {
        role = "employee"
      }
    }

    const adminRoutes = ["/admin/employees", "/admin/department", "/admin/payroll", "/admin/salary", "/admin/reports"]

    const isAdminRoute = adminRoutes.some(
      (route) => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route + "/"),
    )

    if (role === "employee" && isAdminRoute) {
      const url = request.nextUrl.clone()
      url.pathname = "/employee"
      return NextResponse.redirect(url)
    }

    if (request.nextUrl.pathname === "/login") {
      const url = request.nextUrl.clone()
      url.pathname = role === "employee" ? "/employee" : "/admin"
      return NextResponse.redirect(url)
    }

    if (role === "employee" && request.nextUrl.pathname === "/admin") {
      const url = request.nextUrl.clone()
      url.pathname = "/employee"
      return NextResponse.redirect(url)
    }

    if ((role === "hr" || role === "admin") && request.nextUrl.pathname.startsWith("/employee")) {
      const url = request.nextUrl.clone()
      url.pathname = "/admin"
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
