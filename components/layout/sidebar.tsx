"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Building2,
  CalendarDays,
  Wallet,
  FileText,
  BarChart3,
  UserCheck,
  Gift,
  Activity,
  ShieldCheck,
} from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { logout } from "@/app/login/actions"
import { createClient } from "@/lib/supabase/client"
import { useIsMobile } from "@/hooks/use-mobile"
import { ProfileAvatarUpload } from "@/components/profile-avatar-upload"

interface SidebarProps {
  className?: string
  onNavigate?: () => void
}

interface UserInfo {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
  role: string
  employeeId?: string | null
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin", roles: ["admin", "hr"] },
  { icon: Users, label: "Employees", href: "/admin/employees", roles: ["admin", "hr"] },
  { icon: Building2, label: "Departments", href: "/admin/department", roles: ["admin", "hr"] },
  { icon: UserCheck, label: "Attendance", href: "/admin/attendance", roles: ["admin", "hr"] },
  { icon: CalendarDays, label: "Leave", href: "/admin/leave", roles: ["admin", "hr"] },
  { icon: Gift, label: "Bonus Requests", href: "/admin/bonus", roles: ["admin", "hr"] },
  { icon: Wallet, label: "Salary", href: "/admin/salary", roles: ["admin", "hr"] },
  { icon: FileText, label: "Payroll", href: "/admin/payroll", roles: ["admin", "hr"] },
  { icon: BarChart3, label: "Reports", href: "/admin/reports", roles: ["admin", "hr"] },
  { icon: Activity, label: "Audit Logs", href: "/admin/audit-logs", roles: ["admin", "hr"] },
  { icon: ShieldCheck, label: "Admin Accounts", href: "/admin/accounts", roles: ["admin"] },
]

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const [collapsed, setCollapsed] = React.useState(false)
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  const [user, setUser] = React.useState<UserInfo | null>(null)
  const [showProfileDialog, setShowProfileDialog] = React.useState(false)
  const isMobile = useIsMobile()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (isMobile) {
      setCollapsed(false)
    }
  }, [isMobile])

  React.useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (authUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", authUser.id)
          .maybeSingle()

        const { data: employee } = await supabase
          .from("employees")
          .select("id")
          .eq("user_id", authUser.id)
          .maybeSingle()

        setUser({
          id: authUser.id,
          name:
            profile?.full_name ||
            authUser.user_metadata?.full_name ||
            authUser.user_metadata?.name ||
            authUser.email?.split("@")[0] ||
            "User",
          email: authUser.email || "",
          avatarUrl: authUser.user_metadata?.avatar_url || null,
          role: profile?.role || authUser.user_metadata?.role || "employee",
          employeeId: employee?.id || null,
        })
      }
    }

    fetchUser()
  }, [])

  const filteredNavItems = navItems.filter((item) => {
    if (!user) return false
    return item.roles.includes(user.role)
  })

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
    } catch (error) {
      console.error("Logout error:", error)
      setIsLoggingOut(false)
    }
  }

  const handleNavClick = () => {
    if (onNavigate) {
      onNavigate()
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrator"
      case "hr":
        return "HR Manager"
      default:
        return "Employee"
    }
  }

  const handleAvatarUpdate = (url: string | null) => {
    if (user) {
      setUser({ ...user, avatarUrl: url })
    }
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex h-screen flex-col bg-card border-r border-border transition-all duration-300 ease-in-out",
          collapsed && !isMobile ? "w-[72px]" : "w-[260px]",
          className,
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          <Link href="/admin" className="flex items-center gap-3" onClick={handleNavClick}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            {(!collapsed || isMobile) && (
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight">Payroll</span>
                <span className="text-[10px] text-muted-foreground font-medium">Management System</span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3">
          <div className="space-y-1.5">
            {filteredNavItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`)
              const NavItem = (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-transform duration-200",
                      !isActive && "group-hover:scale-110",
                    )}
                  />
                  {(!collapsed || isMobile) && <span>{item.label}</span>}
                </Link>
              )

              if (collapsed && !isMobile) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{NavItem}</TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return <div key={item.href}>{NavItem}</div>
            })}
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-border p-3 space-y-2">
          {/* Collapse Button - Hide on mobile */}
          {!isMobile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size={collapsed ? "icon" : "default"}
                  onClick={() => setCollapsed(!collapsed)}
                  className={cn(
                    "w-full text-muted-foreground hover:bg-accent hover:text-foreground",
                    collapsed ? "h-10 w-10" : "justify-start gap-3 px-3",
                  )}
                >
                  {collapsed ? (
                    <ChevronRight className="h-5 w-5" />
                  ) : (
                    <>
                      <ChevronLeft className="h-5 w-5" />
                      <span>Collapse</span>
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">Expand sidebar</TooltipContent>}
            </Tooltip>
          )}

          {/* Theme Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={collapsed && !isMobile ? "icon" : "default"}
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className={cn(
                  "w-full text-muted-foreground hover:bg-accent hover:text-foreground",
                  collapsed && !isMobile ? "h-10 w-10" : "justify-start gap-3 px-3",
                )}
              >
                {mounted ? (
                  resolvedTheme === "dark" ? (
                    <Sun className="h-5 w-5 shrink-0" />
                  ) : (
                    <Moon className="h-5 w-5 shrink-0" />
                  )
                ) : (
                  <Sun className="h-5 w-5 shrink-0 opacity-0" />
                )}
                {(!collapsed || isMobile) && (
                  <span>{mounted ? (resolvedTheme === "dark" ? "Light mode" : "Dark mode") : "Toggle theme"}</span>
                )}
              </Button>
            </TooltipTrigger>
            {collapsed && !isMobile && <TooltipContent side="right">Toggle theme</TooltipContent>}
          </Tooltip>

          {/* User Card - Added click to open profile dialog */}
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl bg-accent/50 p-2.5 mt-2 cursor-pointer hover:bg-accent/70 transition-colors",
              collapsed && !isMobile && "justify-center p-2",
            )}
            onClick={() => setShowProfileDialog(true)}
          >
            <Avatar className="h-9 w-9 ring-2 ring-primary/20">
              {user?.avatarUrl && <AvatarImage src={user.avatarUrl || "/placeholder.svg"} />}
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {user ? getInitials(user.name) : "U"}
              </AvatarFallback>
            </Avatar>
            {(!collapsed || isMobile) && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{user?.name || "Loading..."}</p>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {user ? getRoleLabel(user.role) : ""}
                  </Badge>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLogout()
                      }}
                      disabled={isLoggingOut}
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <LogOut className={cn("h-4 w-4", isLoggingOut && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Logout</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
          {collapsed && !isMobile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full h-10 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className={cn("h-5 w-5", isLoggingOut && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Logout</TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>

      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Profile Settings</DialogTitle>
            <DialogDescription>
              Update your profile photo. Your initials will be displayed if no photo is uploaded.
            </DialogDescription>
          </DialogHeader>
          {user && (
            <div className="py-4">
              <ProfileAvatarUpload
                currentAvatar={user.avatarUrl}
                name={user.name}
                employeeId={user.employeeId}
                userId={user.id}
                onAvatarUpdate={handleAvatarUpdate}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
