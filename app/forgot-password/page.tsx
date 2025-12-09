"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Building2, Loader2, Mail, CheckCircle } from "lucide-react"
import { AnimatedButton } from "@/components/ui/animated-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { MobileNav } from "@/components/mobile-nav"
import { ThemeToggle } from "@/components/theme-toggle"

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)
  const [email, setEmail] = React.useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
        ? `${process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL.replace("/auth/callback", "")}/reset-password`
        : `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
      return
    }

    setSuccess(true)
    setIsLoading(false)
  }

  if (success) {
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
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <MobileNav />
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/20">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
              </div>
              <CardTitle className="text-xl sm:text-2xl">Check your email</CardTitle>
              <CardDescription className="text-sm">
                We&apos;ve sent a password reset link to <strong>{email}</strong>. Please check your inbox and click the
                link to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Didn&apos;t receive the email? Check your spam folder or try again.
              </p>
              <div className="flex flex-col gap-2">
                <AnimatedButton onClick={() => setSuccess(false)} variant="outline" fullWidth>
                  Try again
                </AnimatedButton>
                <Link href="/login">
                  <AnimatedButton fullWidth variant="ghost">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Sign In
                  </AnimatedButton>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
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
          <div className="flex items-center gap-1">
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
                <Mail className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl">Forgot your password?</CardTitle>
            <CardDescription className="text-sm">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </CardDescription>
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
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <AnimatedButton type="submit" fullWidth disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </AnimatedButton>
            </form>
            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Link>
            </div>
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
