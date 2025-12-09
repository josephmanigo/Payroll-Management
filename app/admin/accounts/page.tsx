"use client"

import * as React from "react"
import {
  UserPlus,
  Shield,
  Loader2,
  CheckCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  Users,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { createAccount, type UserRole } from "./actions"
import { createClient } from "@/lib/supabase/client"
import { AdminLayout } from "@/components/layout/admin-layout"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface AdminUser {
  id: string
  email: string
  full_name: string
  role: string
  created_at: string
}

const roleOptions: { value: UserRole; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: "admin",
    label: "Administrator",
    description: "Full system access and management capabilities",
    icon: <ShieldCheck className="h-5 w-5" />,
  },
]

export default function AdminAccountsPage() {
  const [isLoading, setIsLoading] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [adminUsers, setAdminUsers] = React.useState<AdminUser[]>([])
  const [loadingUsers, setLoadingUsers] = React.useState(true)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [formData, setFormData] = React.useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "admin" as UserRole,
  })

  // Fetch existing admin/HR users
  React.useEffect(() => {
    const fetchAdminUsers = async () => {
      const supabase = createClient()

      // First get profiles with admin role
      const { data: profileAdmins } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, created_at")
        .eq("role", "admin")
        .order("created_at", { ascending: false })

      // Also check current user - if they're admin but not in profiles, add them
      const {
        data: { user },
      } = await supabase.auth.getUser()

      let allAdmins = profileAdmins || []

      // If current user is admin (from metadata) but not in the list, add them
      if (user && user.user_metadata?.role === "admin") {
        const isInList = allAdmins.some((admin) => admin.id === user.id)
        if (!isInList) {
          allAdmins = [
            {
              id: user.id,
              email: user.email || "",
              full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Admin",
              role: "admin",
              created_at: user.created_at || new Date().toISOString(),
            },
            ...allAdmins,
          ]
        }
      }

      setAdminUsers(allAdmins)
      setLoadingUsers(false)
    }

    fetchAdminUsers()
  }, [success])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleRoleChange = (value: UserRole) => {
    setFormData((prev) => ({
      ...prev,
      role: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters")
      setIsLoading(false)
      return
    }

    const result = await createAccount({
      email: formData.email,
      password: formData.password,
      fullName: formData.fullName,
      role: formData.role,
    })

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    setSuccess(true)
    setIsLoading(false)
  }

  const copyCredentials = () => {
    navigator.clipboard.writeText(`Email: ${formData.email}\nPassword: ${formData.password}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resetForm = () => {
    setSuccess(false)
    setFormData({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "admin",
    })
  }

  const handleDeleteAdmin = async (userId: string, userEmail: string) => {
    setDeletingId(userId)
    try {
      const response = await fetch("/api/admin/delete-account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, userEmail }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete admin account")
      }

      // Remove user from local state
      setAdminUsers((prev) => prev.filter((user) => user.id !== userId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete admin account")
    } finally {
      setDeletingId(null)
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default"
      default:
        return "outline"
    }
  }

  return (
    <AdminLayout title="Admin Accounts" subtitle="Create and manage administrator accounts">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Create Account Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Create Admin Account
            </CardTitle>
            <CardDescription>Create a new administrator account with full system access.</CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center text-center py-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 mb-4">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <h3 className="font-semibold text-lg">Account Created Successfully</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    The account for <strong>{formData.email}</strong> has been created.
                  </p>
                </div>

                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <span className="text-sm font-medium">{formData.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Password:</span>
                    <span className="text-sm font-medium font-mono">{formData.password}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Role:</span>
                    <Badge variant={getRoleBadgeVariant(formData.role)} className="capitalize">
                      {formData.role}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={copyCredentials}>
                    {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copied ? "Copied!" : "Copy Credentials"}
                  </Button>
                  <Button className="flex-1" onClick={resetForm}>
                    Create Another
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="admin@company.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label>Account Role</Label>
                  <RadioGroup value={formData.role} onValueChange={handleRoleChange} className="space-y-2">
                    {roleOptions.map((option) => (
                      <div key={option.value}>
                        <RadioGroupItem value={option.value} id={option.value} className="peer sr-only" />
                        <Label
                          htmlFor={option.value}
                          className="flex items-center gap-3 rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
                            {option.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-none">{option.label}</p>
                            <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 6 characters"
                      value={formData.password}
                      onChange={handleChange}
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Account
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Existing Admin Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Existing Admin Users
            </CardTitle>
            <CardDescription>Current administrators in the system.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : adminUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No admin accounts found</p>
                <p className="text-xs">Create your first admin account to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {adminUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-sm font-semibold text-primary">
                        {user.full_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2) || "U"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.full_name || "Unnamed User"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize shrink-0">
                      {user.role}
                    </Badge>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          disabled={deletingId === user.id}
                        >
                          {deletingId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Admin Account</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the admin account for{" "}
                            <strong>{user.full_name || user.email}</strong>? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteAdmin(user.id, user.email)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
