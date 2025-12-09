"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  FileText,
  User,
  Calendar,
  Download,
  Eye,
  Loader2,
  LogOut,
  Mail,
  CheckCircle2,
  Banknote,
  CalendarDays,
  Plus,
  Clock,
  XCircle,
  Building2,
  Gift,
  Camera,
  Lock,
  EyeOff,
  X,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { useTheme } from "@/components/theme-provider"
import { formatCurrency, formatDate } from "@/lib/utils"
import { sendPayslipToSelf } from "@/app/admin/payroll/actions"
import {
  useRealtimeEmployee,
  useRealtimeEmployeeLeaves,
  type SupabasePayslip,
  type SupabaseEmployee,
} from "@/hooks/use-realtime-employee"
import { useRealtimeEmployeeBonusRequests } from "@/hooks/use-realtime-bonus"
import { useRealtimeTodayAttendance } from "@/hooks/use-realtime-attendance"
import { timeIn, timeOut } from "./attendance-actions"
import { TimeInPopup } from "@/components/time-in-popup"
import { TimeOutPopup } from "@/components/time-out-popup"
import { AttendanceStatusCard } from "@/components/attendance-status-card"
import { LeaveCalendar } from "@/components/leave-calendar"
import { LeaveRequestForm } from "@/components/leave-request-form"
import { BonusRequestForm } from "@/components/bonus-request-form"
import { NotificationBell } from "@/components/notification-bell"
import { cancelLeaveRequest, getCurrentEmployee, getEmployeePayslips, cancelBonusRequest } from "./actions"
import { useToast } from "@/components/ui/use-toast"
import { PesoSign } from "@/components/icons/peso-sign"
import { logAuditFromClient } from "@/lib/audit-logger-client"
import { ProfileAvatarUpload } from "@/components/profile-avatar-upload"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { changePassword } from "@/app/login/actions"

interface UserProfile {
  id: string
  email: string
  fullName: string
  role: string
}

export default function EmployeeDashboard() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [selectedPayslip, setSelectedPayslip] = useState<SupabasePayslip | null>(null)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  const [isLeaveFormOpen, setIsLeaveFormOpen] = useState(false)
  const [isBonusFormOpen, setIsBonusFormOpen] = useState(false)
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [showTimeInPopup, setShowTimeInPopup] = useState(false)
  const [showTimeOutPopup, setShowTimeOutPopup] = useState(false)
  const [hasShownTimeInPopup, setHasShownTimeInPopup] = useState(false)

  const [serverEmployee, setServerEmployee] = useState<SupabaseEmployee | null>(null)
  const [serverPayslips, setServerPayslips] = useState<SupabasePayslip[]>([])
  const [serverLoading, setServerLoading] = useState(false)
  const serverFetchAttempted = useRef(false)

  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [cancellingBonusId, setCancellingBonusId] = useState<string | null>(null)

  const {
    employee: realtimeEmployee,
    payslips: realtimePayslips,
    loading: dataLoading,
    error: realtimeError,
  } = useRealtimeEmployee(user?.id || null, user?.email || null)

  const myEmployee = realtimeEmployee || serverEmployee
  const myPayslips = realtimePayslips.length > 0 ? realtimePayslips : serverPayslips

  const fetchFromServer = useCallback(async () => {
    if (!user || serverFetchAttempted.current) return

    serverFetchAttempted.current = true
    setServerLoading(true)
    console.log("[v0] Fetching employee from server action...")
    try {
      const result = await getCurrentEmployee()
      console.log("[v0] Server getCurrentEmployee result:", result.success, result.error)
      if (result.success && result.data) {
        setServerEmployee(result.data as SupabaseEmployee)
        console.log("[v0] Server employee set:", result.data.first_name, result.data.last_name)

        // Fetch payslips too
        const payslipsResult = await getEmployeePayslips(result.data.id)
        if (payslipsResult.success) {
          setServerPayslips(payslipsResult.data as SupabasePayslip[])
          console.log("[v0] Server payslips set:", payslipsResult.data.length)
        }
      } else {
        console.log("[v0] Server fetch failed:", result.error)
      }
    } catch (err) {
      console.error("[v0] Server fetch error:", err)
    } finally {
      setServerLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user && !serverFetchAttempted.current) {
      // Always try server action for employees to ensure user_id is linked
      fetchFromServer()
    }
  }, [user, fetchFromServer])

  const {
    leaveRequests,
    pendingLeaves,
    approvedLeaves,
    rejectedLeaves,
    totalApprovedDays,
    loading: leavesLoading,
    refetch: refetchLeaves,
  } = useRealtimeEmployeeLeaves(myEmployee?.id || null)

  const {
    bonusRequests,
    pendingRequests: pendingBonusRequests,
    approvedRequests: approvedBonusRequests,
    rejectedRequests: rejectedBonusRequests,
    loading: bonusLoading,
    refetch: refetchBonus,
  } = useRealtimeEmployeeBonusRequests(myEmployee?.id || null)

  const {
    attendance: todayAttendance,
    loading: attendanceLoading,
    hasTimedIn,
    hasTimedOut,
    refetch: refetchAttendance,
  } = useRealtimeTodayAttendance({ employeeId: myEmployee?.id || null })

  useEffect(() => {
    if (myEmployee?.avatar_url) {
      setAvatarUrl(myEmployee.avatar_url)
    }
  }, [myEmployee])

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (authUser) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", authUser.id).single()

        setUser({
          id: authUser.id,
          email: authUser.email || "",
          fullName: profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "User",
          role: profile?.role || authUser.user_metadata?.role || "employee",
        })
      }
      setAuthLoading(false)
    }

    fetchUser()
  }, [])

  // CHANGE: Only show time-in popup if attendance data is fully loaded and employee has NOT timed in
  // Also persist hasShownTimeInPopup in sessionStorage to prevent showing again on page refresh
  useEffect(() => {
    // Check sessionStorage to see if popup was already shown this session
    const popupShownKey = `timeInPopupShown_${myEmployee?.id}_${new Date().toISOString().split("T")[0]}`
    const wasShownThisSession = sessionStorage.getItem(popupShownKey) === "true"

    if (wasShownThisSession) {
      setHasShownTimeInPopup(true)
      return
    }

    // Only show popup when:
    // 1. Attendance data has finished loading (!attendanceLoading)
    // 2. Employee data exists (myEmployee)
    // 3. Employee has NOT timed in yet (hasTimedIn is explicitly false)
    // 4. Popup hasn't been shown yet in this session (!hasShownTimeInPopup)
    if (!attendanceLoading && myEmployee && hasTimedIn === false && !hasShownTimeInPopup) {
      const timer = setTimeout(() => {
        setShowTimeInPopup(true)
        setHasShownTimeInPopup(true)
        sessionStorage.setItem(popupShownKey, "true")
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [attendanceLoading, myEmployee, hasTimedIn, hasShownTimeInPopup])

  const handleTimeIn = async () => {
    if (!myEmployee) return

    const result = await timeIn(myEmployee.id)
    if (result.success) {
      toast({
        title: "Timed In Successfully",
        description: `Welcome! Your time-in has been recorded.`,
      })
      refetchAttendance()
    } else {
      toast({
        title: "Time-In Failed",
        description: result.error || "Failed to record time-in.",
        variant: "destructive",
      })
    }
  }

  const handleTimeOut = async () => {
    if (!myEmployee) return

    const result = await timeOut(myEmployee.id)
    if (result.success) {
      toast({
        title: "Timed Out Successfully",
        description: `Your attendance for today has been recorded. Total: ${result.data?.total_hours?.toFixed(2)} hours`,
      })
      refetchAttendance()
    } else {
      toast({
        title: "Time-Out Failed",
        description: result.error || "Failed to record time-out.",
        variant: "destructive",
      })
    }
  }

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    if (user) {
      await logAuditFromClient({
        action: "logout",
        entityType: "auth",
        metadata: {
          userEmail: user.email,
        },
      })
    }
    await supabase.auth.signOut()
    router.push("/login")
  }

  const handleLogout = async () => {
    if (user && myEmployee) {
      const fullName = `${myEmployee.first_name} ${myEmployee.last_name}`.trim()
      try {
        await fetch("/api/audit-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            userRole: "employee",
            userName: fullName,
            userEmail: user.email,
            action: "logout",
            entityType: "auth",
            metadata: { userEmail: user.email },
          }),
        })
      } catch (err) {
        console.error("[v0] Failed to log logout:", err)
      }
    }
    await supabase.auth.signOut()
    router.push("/login")
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleDownloadPDF = async (payslip: SupabasePayslip) => {
    if (!payslip || !myEmployee) return

    setIsDownloading(true)

    const formatPayPeriod = () => {
      if (payslip.pay_period_start && payslip.pay_period_end) {
        return `${formatDate(payslip.pay_period_start)} - ${formatDate(payslip.pay_period_end)}`
      }
      return "Current Period"
    }

    const content = `
═══════════════════════════════════════════════════════════════
                         PAYSLIP
                    Payroll Management
═══════════════════════════════════════════════════════════════

EMPLOYEE INFORMATION
─────────────────────────────────────────────────────────────────
Employee Name:      ${myEmployee.first_name} ${myEmployee.last_name}
Employee No:        ${myEmployee.employee_number}
Department:         ${myEmployee.department}
Position:           ${myEmployee.position}

PAY PERIOD INFORMATION
─────────────────────────────────────────────────────────────────
Pay Period:         ${formatPayPeriod()}
Pay Date:           ${payslip.pay_date ? formatDate(payslip.pay_date) : "N/A"}

SUMMARY
─────────────────────────────────────────────────────────────────
GROSS PAY:                                    ${formatCurrency(payslip.gross_pay).padStart(15)}
TOTAL DEDUCTIONS:                             ${formatCurrency(payslip.total_deductions).padStart(15)}

═══════════════════════════════════════════════════════════════
NET PAY:                                      ${formatCurrency(payslip.net_pay).padStart(15)}
═══════════════════════════════════════════════════════════════

This is a computer-generated document. No signature required.
Generated on: ${new Date().toLocaleString()}
    `.trim()

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `payslip-${myEmployee.employee_number}-${payslip.pay_period_start ? formatDate(payslip.pay_period_start).replace(/\//g, "-") : "current"}.txt`
    a.click()
    URL.revokeObjectURL(url)

    setIsDownloading(false)

    if (user) {
      await logAuditFromClient({
        action: "payslip_downloaded",
        entityType: "payslip",
        entityId: payslip.id,
        metadata: {
          payPeriod: formatPayPeriod(),
        },
      })
    }

    toast({
      title: "Payslip Downloaded",
      description: "Your payslip has been downloaded successfully.",
    })
  }

  const handleSendEmail = async (payslip: SupabasePayslip) => {
    if (!payslip || !myEmployee || !user) return

    setIsSendingEmail(true)

    const formatPayPeriod = () => {
      if (payslip.pay_period_start && payslip.pay_period_end) {
        return `${formatDate(payslip.pay_period_start)} - ${formatDate(payslip.pay_period_end)}`
      }
      return "Current Period"
    }

    try {
      const result = await sendPayslipToSelf({
        employeeEmail: myEmployee.email,
        employeeName: `${myEmployee.first_name} ${myEmployee.last_name}`,
        payPeriod: formatPayPeriod(),
        netPay: payslip.net_pay,
        grossPay: payslip.gross_pay,
        totalDeductions: payslip.total_deductions,
        basicPay: payslip.gross_pay,
        overtimePay: 0,
        allowances: 0,
        payslipId: payslip.id,
      })

      if (result.success) {
        await logAuditFromClient({
          action: "payslip_emailed",
          entityType: "payslip",
          entityId: payslip.id,
          metadata: {
            payPeriod: formatPayPeriod(),
            recipientEmail: myEmployee.email,
          },
        })

        toast({
          title: "Email Sent",
          description: `Payslip has been sent to ${myEmployee.email}`,
        })
      } else {
        toast({
          title: "Failed to Send",
          description: result.error || "Failed to send email. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while sending the email.",
        variant: "destructive",
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleViewPayslip = async (payslip: SupabasePayslip) => {
    setSelectedPayslip(payslip)

    if (user) {
      await logAuditFromClient({
        action: "payslip_viewed",
        entityType: "payslip",
        entityId: payslip.id,
        metadata: {
          payPeriod:
            payslip.pay_period_start && payslip.pay_period_end
              ? `${formatDate(payslip.pay_period_start)} - ${formatDate(payslip.pay_period_end)}`
              : "Current Period",
        },
      })
    }
  }

  const handleCancelLeave = async (leaveId: string) => {
    const result = await cancelLeaveRequest(leaveId)
    if (result.success) {
      toast({
        title: "Leave Cancelled",
        description: "Your leave request has been cancelled.",
      })
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to cancel leave request.",
        variant: "destructive",
      })
    }
  }

  const handleLeaveSuccess = async () => {}

  const handleChangePassword = async () => {
    setPasswordError(null)
    setPasswordSuccess(false)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required")
      return
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match")
      return
    }

    setIsChangingPassword(true)
    try {
      const result = await changePassword(currentPassword, newPassword)
      if (result.success) {
        setPasswordSuccess(true)
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        toast({
          title: "Password Changed",
          description: "Your password has been updated successfully.",
        })
      } else {
        setPasswordError(result.error || "Failed to change password")
      }
    } catch (error) {
      setPasswordError("An unexpected error occurred")
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleCancelBonus = async (bonusId: string) => {
    setCancellingBonusId(bonusId)
    try {
      const result = await cancelBonusRequest(bonusId)
      if (result.success) {
        toast({
          title: "Bonus Request Cancelled",
          description: "Your bonus request has been cancelled.",
        })
        refetchBonus()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to cancel bonus request",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setCancellingBonusId(null)
    }
  }

  const getLeaveStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-500">Approved</Badge>
      case "pending":
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            Pending
          </Badge>
        )
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getBonusStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-500">Approved</Badge>
      case "pending":
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            Pending
          </Badge>
        )
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatLeaveType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ")
  }

  const loading = authLoading || dataLoading || serverLoading

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!myEmployee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Setting up your profile...</p>
        </div>
      </div>
    )
  }

  const employeeName = `${myEmployee.first_name} ${myEmployee.last_name}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/employee" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Payroll Management</h1>
              <p className="text-xs text-muted-foreground">Employee Portal</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <NotificationBell userId={user?.id || null} />
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">
                {myEmployee.first_name} {myEmployee.last_name}
              </p>
              <p className="text-xs text-muted-foreground">{myEmployee.position}</p>
            </div>
            <Avatar className="h-9 w-9 ring-2 ring-primary/20">
              {avatarUrl && <AvatarImage src={avatarUrl || "/placeholder.svg"} />}
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {getInitials(`${myEmployee.first_name} ${myEmployee.last_name}`)}
              </AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={handleSignOut} disabled={isLoggingOut}>
              {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Welcome back, {myEmployee.first_name}!</h2>
          <p className="text-muted-foreground">View your payslips, leave calendar, and personal information</p>
        </div>

        <div className="mb-6">
          <AttendanceStatusCard
            attendance={todayAttendance}
            loading={attendanceLoading}
            onTimeOut={() => setShowTimeOutPopup(true)}
          />
        </div>

        <Tabs defaultValue="payslips" className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-4">
            <TabsTrigger value="payslips" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">My Payslips</span>
              <span className="sm:hidden">Payslips</span>
            </TabsTrigger>
            <TabsTrigger value="leave" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Leave
            </TabsTrigger>
            <TabsTrigger value="bonus" className="gap-2">
              <Gift className="h-4 w-4" />
              Bonus
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">My Info</span>
              <span className="sm:hidden">Info</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payslips" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Recent Payslips
                </CardTitle>
                <CardDescription>View and download your payslips</CardDescription>
              </CardHeader>
              <CardContent>
                {myPayslips.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No payslips available yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myPayslips.map((payslip) => (
                      <div
                        key={payslip.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {payslip.pay_period_start && payslip.pay_period_end
                                ? `${formatDate(payslip.pay_period_start)} - ${formatDate(payslip.pay_period_end)}`
                                : "Pay Period"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Pay Date: {payslip.pay_date ? formatDate(payslip.pay_date) : "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4">
                          <div className="text-left sm:text-right">
                            <p className="font-semibold text-lg whitespace-nowrap">{formatCurrency(payslip.net_pay)}</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="secondary" className="text-xs">
                                {payslip.status}
                              </Badge>
                              {payslip.email_sent && (
                                <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Sent
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-lg"
                              onClick={() => handleViewPayslip(payslip)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-lg"
                              onClick={() => handleDownloadPDF(payslip)}
                              disabled={isDownloading}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 flex-shrink-0">
                      <Banknote className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">YTD Earnings</p>
                      <p className="text-xl font-bold truncate">
                        {formatCurrency(myPayslips.reduce((sum, p) => sum + p.gross_pay, 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 flex-shrink-0">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">Total Payslips</p>
                      <p className="text-xl font-bold">{myPayslips.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 flex-shrink-0">
                      <PesoSign className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">YTD Deductions</p>
                      <p className="text-xl font-bold truncate">
                        {formatCurrency(myPayslips.reduce((sum, p) => sum + p.total_deductions, 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="leave" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Leave Management</h3>
                <p className="text-sm text-muted-foreground">Request and track your leaves</p>
              </div>
              <Button onClick={() => setIsLeaveFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Request Leave
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold">
                        {leaveRequests.filter((leave) => leave.status === "pending").length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Approved</p>
                      <p className="text-2xl font-bold">
                        {leaveRequests.filter((leave) => leave.status === "approved").length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Rejected</p>
                      <p className="text-2xl font-bold">
                        {leaveRequests.filter((leave) => leave.status === "rejected").length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                      <CalendarDays className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Days Used</p>
                      <p className="text-2xl font-bold">{totalApprovedDays}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <LeaveCalendar leaveRequests={leaveRequests} />

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Requests</CardTitle>
                  <CardDescription>Your leave request history</CardDescription>
                </CardHeader>
                <CardContent>
                  {leaveRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No leave requests yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {leaveRequests.slice(0, 10).map((leave) => (
                        <div key={leave.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm">{formatLeaveType(leave.leave_type)}</p>
                              {getLeaveStatusBadge(leave.status)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(leave.start_date)} - {formatDate(leave.end_date)} ({leave.total_days} day
                              {leave.total_days > 1 ? "s" : ""})
                            </p>
                          </div>
                          {leave.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleCancelLeave(leave.id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bonus" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Bonus Requests</h3>
                <p className="text-sm text-muted-foreground">Request and track salary bonuses</p>
              </div>
              <Button onClick={() => setIsBonusFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Request Bonus
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold">{pendingBonusRequests.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Approved</p>
                      <p className="text-2xl font-bold">{approvedBonusRequests.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                      <Gift className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Approved</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(approvedBonusRequests.reduce((sum, b) => sum + b.amount, 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Bonus Requests</CardTitle>
                <CardDescription>History of your bonus requests</CardDescription>
              </CardHeader>
              <CardContent>
                {bonusRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gift className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No bonus requests yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bonusRequests.map((bonus) => (
                      <div key={bonus.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">{formatCurrency(bonus.amount)}</p>
                            {getBonusStatusBadge(bonus.status)}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">{bonus.reason}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Requested on {formatDate(bonus.created_at)}
                          </p>
                        </div>
                        {bonus.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleCancelBonus(bonus.id)}
                            disabled={cancellingBonusId === bonus.id}
                          >
                            {cancellingBonusId === bonus.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                            <span className="ml-1">Cancel</span>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            {/* Profile Photo Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" />
                  Profile Photo
                </CardTitle>
                <CardDescription>Upload or change your profile photo</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ProfileAvatarUpload
                  currentAvatar={avatarUrl}
                  name={`${myEmployee.first_name} ${myEmployee.last_name}`}
                  employeeId={myEmployee.id}
                  userId={user?.id || ""}
                  onAvatarUpdate={(url) => setAvatarUrl(url)}
                  size="lg"
                />
              </CardContent>
            </Card>

            {/* Personal Information Card - existing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Personal Information
                </CardTitle>
                <CardDescription>Your employee details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium">
                        {myEmployee.first_name} {myEmployee.last_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Employee Number</p>
                      <p className="font-medium">{myEmployee.employee_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{myEmployee.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{myEmployee.phone || "Not provided"}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Department</p>
                      <p className="font-medium">{myEmployee.department}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Position</p>
                      <p className="font-medium">{myEmployee.position}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Hire Date</p>
                      <p className="font-medium">{formatDate(myEmployee.hire_date)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={myEmployee.status === "active" ? "default" : "secondary"} className="capitalize">
                        {myEmployee.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  Change Password
                </CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {passwordSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 text-sm">
                    Password changed successfully!
                  </div>
                )}
                {passwordError && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{passwordError}</div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
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
                <Button onClick={handleChangePassword} disabled={isChangingPassword} className="w-full">
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Changing Password...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Change Password
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-primary" />
                  Compensation
                </CardTitle>
                <CardDescription>Your salary information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Salary</p>
                    <p className="text-2xl font-bold">{formatCurrency(myEmployee.monthly_salary)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Payslip Detail Dialog */}
      <Dialog open={!!selectedPayslip} onOpenChange={() => setSelectedPayslip(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payslip Details</DialogTitle>
            <DialogDescription>
              {selectedPayslip?.pay_period_start && selectedPayslip?.pay_period_end
                ? `${formatDate(selectedPayslip.pay_period_start)} - ${formatDate(selectedPayslip.pay_period_end)}`
                : "Pay Period"}
            </DialogDescription>
          </DialogHeader>
          {selectedPayslip && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Gross Pay</p>
                  <p className="text-lg font-semibold">{formatCurrency(selectedPayslip.gross_pay)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Deductions</p>
                  <p className="text-lg font-semibold text-destructive">
                    -{formatCurrency(selectedPayslip.total_deductions)}
                  </p>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">Net Pay</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(selectedPayslip.net_pay)}</p>
              </div>
              <div className="text-xs text-muted-foreground">
                Pay Date: {selectedPayslip.pay_date ? formatDate(selectedPayslip.pay_date) : "N/A"}
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => selectedPayslip && handleDownloadPDF(selectedPayslip)}
              disabled={isDownloading}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button onClick={() => selectedPayslip && handleSendEmail(selectedPayslip)} disabled={isSendingEmail}>
              {isSendingEmail ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
              Email to Me
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Request Form Dialog */}
      {myEmployee && (
        <LeaveRequestForm
          open={isLeaveFormOpen}
          onOpenChange={setIsLeaveFormOpen}
          employeeId={myEmployee.id}
          onSuccess={handleLeaveSuccess}
        />
      )}

      {/* Bonus Request Form Dialog */}
      {myEmployee && (
        <BonusRequestForm open={isBonusFormOpen} onOpenChange={setIsBonusFormOpen} employeeId={myEmployee.id} />
      )}

      {myEmployee && (
        <>
          <TimeInPopup
            open={showTimeInPopup}
            onOpenChange={setShowTimeInPopup}
            onTimeIn={handleTimeIn}
            employeeName={employeeName}
          />
          <TimeOutPopup
            open={showTimeOutPopup}
            onOpenChange={setShowTimeOutPopup}
            onTimeOut={handleTimeOut}
            timeIn={todayAttendance?.time_in || null}
          />
        </>
      )}
    </div>
  )
}
