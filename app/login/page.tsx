"use client"

import * as React from "react"
import Link from "next/link"
import { Building2, Eye, EyeOff, Loader2 } from "lucide-react"
import { AnimatedButton } from "@/components/ui/animated-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { MobileNav } from "@/components/mobile-nav"
import { ThemeToggle } from "@/components/theme-toggle"

export default function LoginPage() {
  const [isLoading, setIsLoading] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isCheckingSession, setIsCheckingSession] = React.useState(true)

  React.useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const role = user.user_metadata?.role || "employee"
        window.location.href = role === "employee" ? "/employee" : "/admin"
      } else {
        setIsCheckingSession(false)
      }
    }
    checkUser()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    console.log("[v0] Attempting login for:", email)

    const supabase = createClient()

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      console.log("[v0] Auth error:", authError.message, authError)

      if (authError.message.includes("Email not confirmed")) {
        setError("Please check your email and click the confirmation link before logging in.")
      } else if (authError.message.includes("Invalid login credentials")) {
        setError(
          "Invalid email or password. If you're an employee, please contact your admin to create or reset your account.",
        )
      } else {
        setError(authError.message)
      }
      setIsLoading(false)
      return
    }

    if (data.session && data.user) {
      console.log("[v0] Login successful, user:", data.user?.email, "role:", data.user?.user_metadata?.role)

      const role = data.user.user_metadata?.role || "employee"

      // Get user's display name
      let displayName: string | null = null

      if (role === "employee") {
        // Get employee name from employees table
        const { data: employee } = await supabase
          .from("employees")
          .select("first_name, last_name")
          .eq("user_id", data.user.id)
          .maybeSingle()

        if (employee) {
          displayName = `${employee.first_name} ${employee.last_name}`.trim()
        }
      } else {
        // Get admin/hr name from profiles table
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", data.user.id)
          .maybeSingle()

        if (profile) {
          displayName = profile.full_name
        }
      }

      // Log the login action
      try {
        await fetch("/api/audit-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: data.user.id,
            userRole: role,
            userName: displayName || data.user.email?.split("@")[0] || null,
            userEmail: data.user.email,
            action: "login",
            entityType: "auth",
            metadata: { method: "password" },
          }),
        })
        console.log("[v0] Login audit logged for:", displayName || data.user.email)
      } catch (auditErr) {
        console.error("[v0] Failed to log audit:", auditErr)
      }

      window.location.href = role === "employee" ? "/employee" : "/admin"
    }
  }

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="w-full border-b bg-background">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link
            href="/"
            className="flex items-center gap-2 transition-all duration-200 hover:opacity-80 hover:scale-105"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-base sm:text-lg">Payroll Management</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              About Us
            </Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contact Us
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <AnimatedButton variant="outline" disabled className="cursor-default opacity-70">
              Sign in
            </AnimatedButton>
          </div>
          <div className="flex md:hidden items-center gap-1">
            <ThemeToggle />
            <MobileNav />
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                <Building2 className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl">Welcome back</CardTitle>
            <CardDescription className="text-sm">Sign in to your Payroll Management account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="you@example.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="remember" />
                  <Label htmlFor="remember" className="text-sm font-normal">
                    Remember me
                  </Label>
                </div>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <AnimatedButton type="submit" fullWidth disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </AnimatedButton>
            </form>
          </CardContent>
        </Card>
      </div>

      <footer className="border-t py-6 md:py-8 mt-auto bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-left">
            <Link
              href="/"
              className="flex items-center gap-2 transition-all duration-200 hover:opacity-80 hover:scale-105"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Building2 className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold">Payroll Management</span>
            </Link>
            <p className="text-sm text-muted-foreground">© 2025 Payroll Management. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
