"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Users,
  Wallet,
  Calendar,
  ArrowRight,
  Clock,
  Building2,
  CalendarDays,
  Bell,
  CheckCircle2,
  AlertCircle,
  Activity,
  MoreHorizontal,
  Banknote,
  RefreshCw,
  FileText,
  Download,
  Mail,
  TrendingUp,
} from "lucide-react"
import { AdminLayout } from "@/components/layout/admin-layout"
import { StatCard } from "@/components/ui/stat-card"
import { PayrollSummaryCard } from "@/components/ui/payroll-summary-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatCurrency, formatDate, getInitials, getStatusColor } from "@/lib/utils"
import { usePayrollStore } from "@/lib/store"
import type { Employee, PayrollRun } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { PayrollAreaChart } from "@/components/charts/payroll-area-chart"
import { DepartmentRadialChart } from "@/components/charts/department-radial-chart"
import { SendPayslipDialog } from "@/components/send-payslip-dialog"
import { createClient } from "@/lib/supabase/client"
import { useRealtimeAdminLeaveRequests } from "@/hooks/use-realtime-leave"
import { useRealtimeAdminBonusRequests } from "@/hooks/use-realtime-bonus"
import { approveLeaveRequest, rejectLeaveRequest } from "@/app/admin/leave/actions"
import { approveBonusRequest, rejectBonusRequest } from "@/app/admin/bonus/actions"

const STATUS_COLORS = {
  pending: { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-500" },
  approved: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500" },
  processing: { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500" },
}

const COLORS = [
  "#6366f1", // Indigo
  "#22c55e", // Green
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#8b5cf6", // Violet
  "#0ea5e9", // Sky Blue
  "#ef4444", // Red
  "#84cc16", // Lime
]

export default function AdminDashboard() {
  const {
    employees,
    payrollRuns,
    payrollItems,
    salaryAdjustments,
    processPayroll,
    finalizePayroll,
    approveSalaryAdjustment,
  } = usePayrollStore()
  const [mounted, setMounted] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRun | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const [payrollDialogOpen, setPayrollDialogOpen] = useState(false)
  const [sendPayslipDialogOpen, setSendPayslipDialogOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const { pendingLeaveRequests, loading: leavesLoading, refetch: refetchLeaves } = useRealtimeAdminLeaveRequests()
  const {
    pendingRequests: pendingBonusRequests,
    loading: bonusLoading,
    refetch: refetchBonus,
  } = useRealtimeAdminBonusRequests()

  const payrollTrendData = useState(() => {
    const data = []
    const today = new Date()
    const baseGross =
      payrollRuns
        .filter((p) => p.status === "finalized" || p.status === "approved")
        .reduce((sum, p) => sum + p.totalNet, 0) * 1.2
    const baseNet = payrollRuns
      .filter((p) => p.status === "finalized" || p.status === "approved")
      .reduce((sum, p) => sum + p.totalNet, 0)

    for (let i = 89; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)

      const variation = Math.sin(i * 0.1) * 0.15 + Math.random() * 0.1
      const dailyGross = (baseGross / 30) * (1 + variation)
      const dailyNet = (baseNet / 30) * (1 + variation)

      data.push({
        date: date.toISOString().split("T")[0],
        gross: Math.round(dailyGross),
        net: Math.round(dailyNet),
      })
    }
    return data
  })

  useEffect(() => {
    setMounted(true)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUserId(data.user.id)
      }
    })
  }, [])

  if (!mounted) {
    return (
      <AdminLayout title="Dashboard" subtitle="Welcome back! Here's your payroll overview.">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    )
  }

  const activeEmployees = employees.filter((e) => e.status === "active")
  const recentPayroll = payrollRuns.find((p) => p.status === "approved") || payrollRuns[0]
  const recentHires = [...employees]
    .sort((a, b) => new Date(b.hireDate).getTime() - new Date(a.hireDate).getTime())
    .slice(0, 5)

  const pendingLeaves = pendingLeaveRequests
  const pendingSalaryAdjustments = salaryAdjustments.filter((s) => s.status === "pending")
  const draftPayrolls = payrollRuns.filter((p) => p.status === "draft" || p.status === "processing")
  const pendingItemsCount = pendingLeaves.length + pendingBonusRequests.length

  const departments = ["Engineering", "Sales", "Marketing", "HR", "Finance", "Operations", "Customer Support"]
  const departmentBreakdown = departments
    .map((dept) => {
      const deptEmployees = activeEmployees.filter((e) => e.department === dept)
      return {
        department: dept,
        count: deptEmployees.length,
        totalSalary: deptEmployees.reduce((sum, e) => sum + e.monthlySalary, 0),
      }
    })
    .filter((d) => d.count > 0)

  const currentMonthTotal = payrollRuns
    .filter((p) => p.status === "finalized" || p.status === "approved")
    .reduce((sum, p) => sum + p.totalNet, 0)

  const lastMonthTotal = currentMonthTotal * 0.97

  const pendingPayrolls = draftPayrolls.length
  const upcomingPayDate = payrollRuns.find((p) => p.status === "approved")?.payDate

  const leaves = pendingLeaveRequests // Declare the leaves variable here

  const handleApproveBonus = async (bonusId: string) => {
    setIsProcessing(true)
    try {
      const result = await approveBonusRequest(bonusId)
      if (result.success) {
        toast({
          title: "Bonus Approved",
          description: "The bonus request has been approved successfully.",
        })
        refetchBonus()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to approve bonus request",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve bonus request",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectBonus = async (bonusId: string) => {
    setIsProcessing(true)
    try {
      const result = await rejectBonusRequest(bonusId)
      if (result.success) {
        toast({
          title: "Bonus Rejected",
          description: "The bonus request has been rejected.",
        })
        refetchBonus()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to reject bonus request",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject bonus request",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const notifications = [
    ...leaves.slice(0, 3).map((l) => ({
      id: l.id,
      type: "leave" as const,
      message: `Leave request from ${l.employees?.first_name || "Unknown"}`,
      status: l.status,
      date: l.created_at,
    })),
    ...pendingBonusRequests.slice(0, 3).map((b) => ({
      id: b.id,
      type: "bonus" as const,
      message: `Bonus request from ${b.employees?.first_name || "Unknown"} - ${formatCurrency(b.amount)}`,
      status: b.status,
      date: b.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  const handleViewPayroll = (payroll: PayrollRun) => {
    setSelectedPayroll(payroll)
    setPayrollDialogOpen(true)
  }

  const handleProcessPayroll = (payroll: PayrollRun) => {
    if (payroll.status === "draft") {
      processPayroll(payroll.id)
      toast({
        title: "Payroll Processing",
        description: "Payroll is being processed. It will be approved shortly.",
      })
    } else if (payroll.status === "approved") {
      finalizePayroll(payroll.id)
      toast({
        title: "Payroll Finalized",
        description: "Payroll has been finalized and payments will be processed.",
      })
    }
  }

  const handleApproveLeave = async (leaveId: string) => {
    if (!currentUserId) {
      toast({
        title: "Error",
        description: "You must be logged in to approve leave requests.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    const result = await approveLeaveRequest(leaveId, currentUserId)
    setIsProcessing(false)

    if (result.success) {
      toast({
        title: "Leave Approved",
        description: "The leave request has been approved.",
      })
      refetchLeaves()
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to approve leave request.",
        variant: "destructive",
      })
    }
  }

  const handleRejectLeave = async (leaveId: string) => {
    if (!currentUserId) {
      toast({
        title: "Error",
        description: "You must be logged in to reject leave requests.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    const result = await rejectLeaveRequest(leaveId, currentUserId)
    setIsProcessing(false)

    if (result.success) {
      toast({
        title: "Leave Rejected",
        description: "The leave request has been rejected.",
      })
      refetchLeaves()
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to reject leave request.",
        variant: "destructive",
      })
    }
  }

  const handleApproveSalaryAdjustment = (id: string) => {
    approveSalaryAdjustment(id)
    toast({
      title: "Salary Adjustment Approved",
      description: "The salary adjustment has been approved and applied.",
    })
  }

  const handleExportPayroll = () => {
    if (!selectedPayroll) return
    const payrollEmployees = payrollItems.filter((item) => item.payrollRunId === selectedPayroll.id)
    const csvContent = [
      ["Employee", "Gross Pay", "Deductions", "Net Pay"],
      ...payrollEmployees.map((item) => {
        const emp = employees.find((e) => e.id === item.employeeId)
        return [
          emp ? `${emp.firstName} ${emp.lastName}` : "Unknown",
          item.grossPay.toString(),
          item.totalDeductions.toString(),
          item.netPay.toString(),
        ]
      }),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `payroll-${selectedPayroll.payPeriodStart}-${selectedPayroll.payPeriodEnd}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({
      title: "Export Successful",
      description: "Payroll data has been exported to CSV.",
    })
  }

  const handleSendPayslips = () => {
    setSendPayslipDialogOpen(true)
  }

  const selectedPayrollItems = selectedPayroll
    ? payrollItems
        .filter((item) => item.payrollRunId === selectedPayroll.id)
        .map((item) => ({
          ...item,
          employee: employees.find((e) => e.id === item.employeeId),
        }))
    : []

  return (
    <AdminLayout title="Dashboard" subtitle="Welcome back! Here's your payroll overview.">
      <div className="space-y-6">
        {/* Alert Banner */}
        {pendingItemsCount > 0 && (
          <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-200">
                    {pendingItemsCount} pending item{pendingItemsCount > 1 ? "s" : ""} require attention
                  </p>
                  <p className="text-sm text-amber-700/80 dark:text-amber-300/80">
                    {pendingLeaves.length} leave requests, {pendingBonusRequests.length} bonus requests
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotifications(true)}
                className="bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
              >
                Review All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/admin/employees" className="block">
            <StatCard
              title="Total Employees"
              value={employees.length}
              description={`${activeEmployees.length} active`}
              icon={<Users className="h-5 w-5" />}
              trend={{ value: 4.5, direction: "up" }}
              variant="primary"
              className="h-full cursor-pointer hover:scale-[1.02] transition-transform"
            />
          </Link>
          <Link href="/admin/payroll" className="block">
            <StatCard
              title="This Month's Payroll"
              value={formatCurrency(currentMonthTotal)}
              description="vs last month"
              icon={<Wallet className="h-5 w-5" />}
              trend={{
                value: Math.round(((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100),
                direction: "up",
              }}
              variant="success"
              className="h-full cursor-pointer hover:scale-[1.02] transition-transform"
            />
          </Link>
          <Link href="/admin/payroll" className="block">
            <StatCard
              title="Pending Payrolls"
              value={pendingPayrolls}
              description="Awaiting processing"
              icon={<Clock className="h-5 w-5" />}
              variant="warning"
              className="h-full cursor-pointer hover:scale-[1.02] transition-transform"
            />
          </Link>
          <Link href="/admin/payroll" className="block">
            <StatCard
              title="Next Pay Date"
              value={upcomingPayDate ? formatDate(upcomingPayDate) : "N/A"}
              description="Semi-monthly cycle"
              icon={<Calendar className="h-5 w-5" />}
              variant="info"
              className="h-full cursor-pointer hover:scale-[1.02] transition-transform"
            />
          </Link>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly Payroll Trend */}
          <PayrollAreaChart data={payrollTrendData[0]} />

          {/* Department Distribution */}
          <Card className="overflow-hidden border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    Department Distribution
                  </CardTitle>
                  <CardDescription>Click a department to view employees</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-xl">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push("/admin/department")}>
                      View All Departments
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/admin/reports")}>View Reports</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.location.reload()}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Data
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <DepartmentRadialChart data={departmentBreakdown} />
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Current Payroll */}
          <div className="lg:col-span-2">
            {recentPayroll && (
              <PayrollSummaryCard
                payrollRun={recentPayroll}
                onView={() => handleViewPayroll(recentPayroll)}
                onProcess={
                  recentPayroll.status === "draft" || recentPayroll.status === "approved"
                    ? () => handleProcessPayroll(recentPayroll)
                    : undefined
                }
              />
            )}
          </div>

          {/* Recent Hires */}
          <Card className="overflow-hidden border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Recent Hires</CardTitle>
                  <CardDescription>New team members</CardDescription>
                </div>
                <Link href="/admin/employees">
                  <Button variant="ghost" size="sm" className="gap-1 rounded-lg">
                    View All <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {recentHires.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-accent transition-colors"
                  onClick={() => setSelectedEmployee(employee)}
                >
                  <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {getInitials(employee.firstName, employee.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {employee.firstName} {employee.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{employee.position}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0 rounded-lg">
                    {employee.department}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Activity & Approvals */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Activity */}
          <Card className="overflow-hidden border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                Recent Activity
              </CardTitle>
              <CardDescription>Latest actions in the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {notifications.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-accent/30">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      activity.type === "leave"
                        ? "bg-blue-500/10"
                        : activity.type === "salary"
                          ? "bg-emerald-500/10"
                          : activity.type === "bonus"
                            ? "bg-purple-500/10"
                            : "bg-amber-500/10"
                    }`}
                  >
                    {activity.type === "leave" ? (
                      <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    ) : activity.type === "salary" ? (
                      <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : activity.type === "bonus" ? (
                      <div className="h-4 w-4"></div> // Placeholder for missing icon
                    ) : (
                      <div className="h-4 w-4"></div> // Placeholder for missing icon
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(activity.date)}</p>
                  </div>
                  <Badge variant="secondary" className={`${getStatusColor(activity.status)} rounded-lg`}>
                    {activity.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          <Card className="overflow-hidden border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                Pending Approvals
              </CardTitle>
              <CardDescription>Items requiring your action</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingLeaves.slice(0, 3).map((leave) => {
                const employee = leave.employees
                return (
                  <div key={leave.id} className="flex items-center justify-between p-3 rounded-xl bg-accent/30">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                        <CalendarDays className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {employee?.first_name} {employee?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {leave.leave_type} - {leave.total_days} days
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-600"
                        onClick={() => handleApproveLeave(leave.id)}
                        disabled={isProcessing}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg hover:bg-red-500/10 hover:text-red-600"
                        onClick={() => handleRejectLeave(leave.id)}
                        disabled={isProcessing}
                      >
                        <AlertCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
              {pendingBonusRequests.slice(0, 3).map((bonus) => {
                const employee = bonus.employees
                return (
                  <div key={bonus.id} className="flex items-center justify-between p-3 rounded-xl bg-accent/30">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
                        <div className="h-4 w-4"></div> {/* Placeholder for missing icon */}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {employee?.first_name} {employee?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">Bonus Request - {formatCurrency(bonus.amount)}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-600"
                        onClick={() => handleApproveBonus(bonus.id)}
                        disabled={isProcessing}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg hover:bg-red-500/10 hover:text-red-600"
                        onClick={() => handleRejectBonus(bonus.id)}
                        disabled={isProcessing}
                      >
                        <AlertCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
              {pendingSalaryAdjustments.slice(0, 3).map((adjustment) => {
                const employee = employees.find((e) => e.id === adjustment.employeeId)
                return (
                  <div key={adjustment.id} className="flex items-center justify-between p-3 rounded-xl bg-accent/30">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {employee?.firstName} {employee?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">Salary Adjustment</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-lg hover:bg-primary/10"
                      onClick={() => router.push("/admin/salary")}
                    >
                      Review
                    </Button>
                  </div>
                )
              })}
              {pendingLeaves.length === 0 &&
                draftPayrolls.length === 0 &&
                pendingSalaryAdjustments.length === 0 &&
                pendingBonusRequests.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">All caught up!</p>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Employee Detail Dialog */}
      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
            <DialogDescription>Quick view of employee information</DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                  <AvatarFallback className="text-xs">
                    {getInitials(selectedEmployee.firstName, selectedEmployee.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold">
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">{selectedEmployee.position}</p>
                  <Badge variant="secondary" className="mt-1 rounded-lg">
                    {selectedEmployee.department}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Salary</p>
                  <p className="font-semibold">{formatCurrency(selectedEmployee.monthlySalary)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Hire Date</p>
                  <p className="font-semibold">{formatDate(selectedEmployee.hireDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-semibold truncate">{selectedEmployee.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(selectedEmployee.status)} variant="secondary">
                    {selectedEmployee.status}
                  </Badge>
                </div>
              </div>
              <Button
                className="w-full rounded-xl"
                onClick={() => {
                  router.push(`/admin/employees?id=${selectedEmployee.id}`)
                  setSelectedEmployee(null)
                }}
              >
                <div className="h-4 w-4"></div> {/* Placeholder for missing icon */}
                View Full Profile
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Notifications Dialog */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle>Pending Items</DialogTitle>
            <DialogDescription>Review and take action on pending requests</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="leaves" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl">
              <TabsTrigger value="leaves" className="rounded-lg">
                Leaves ({pendingLeaves.length})
              </TabsTrigger>
              <TabsTrigger value="bonus" className="rounded-lg">
                Bonus ({pendingBonusRequests.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="leaves" className="space-y-2 mt-4 max-h-[300px] overflow-y-auto">
              {pendingLeaves.map((leave) => {
                const employee = leave.employees
                return (
                  <div key={leave.id} className="flex items-center justify-between p-3 rounded-xl bg-accent/50">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {employee ? getInitials(employee.first_name, employee.last_name) : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold">
                          {employee?.first_name} {employee?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {leave.leave_type} - {leave.total_days} days
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-600"
                        onClick={() => handleApproveLeave(leave.id)}
                        disabled={isProcessing}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-lg hover:bg-red-500/10 hover:text-red-600"
                        onClick={() => handleRejectLeave(leave.id)}
                        disabled={isProcessing}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                )
              })}
              {pendingLeaves.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No pending leave requests</p>
              )}
            </TabsContent>
            <TabsContent value="bonus" className="space-y-2 mt-4 max-h-[300px] overflow-y-auto">
              {pendingBonusRequests.map((bonus) => {
                const employee = bonus.employees
                return (
                  <div key={bonus.id} className="flex items-center justify-between p-3 rounded-xl bg-accent/50">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {employee ? getInitials(employee.first_name, employee.last_name) : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold">
                          {employee?.first_name} {employee?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(bonus.amount)} - {bonus.reason || "No reason provided"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-600"
                        onClick={() => handleApproveBonus(bonus.id)}
                        disabled={isProcessing}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-lg hover:bg-red-500/10 hover:text-red-600"
                        onClick={() => handleRejectBonus(bonus.id)}
                        disabled={isProcessing}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                )
              })}
              {pendingBonusRequests.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No pending bonus requests</p>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Payroll Details Dialog */}
      <Dialog open={payrollDialogOpen} onOpenChange={setPayrollDialogOpen}>
        <DialogContent className="max-w-[98vw] w-full max-h-[95vh] overflow-y-auto xl:max-w-[1400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Payroll Details
            </DialogTitle>
            <DialogDescription>
              {selectedPayroll &&
                `${formatDate(selectedPayroll.payPeriodStart)} - ${formatDate(selectedPayroll.payPeriodEnd)}`}
            </DialogDescription>
          </DialogHeader>
          {selectedPayroll && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="flex flex-wrap gap-4">
                <Card className="flex-1 min-w-[140px] p-4">
                  <p className="text-xs text-muted-foreground mb-1">Gross Pay</p>
                  <p className="text-lg font-bold text-emerald-500 whitespace-nowrap">
                    {formatCurrency(selectedPayroll.totalGross)}
                  </p>
                </Card>
                <Card className="flex-1 min-w-[140px] p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Deductions</p>
                  <p className="text-lg font-bold text-red-500 whitespace-nowrap">
                    -{formatCurrency(selectedPayroll.totalDeductions)}
                  </p>
                </Card>
                <Card className="flex-1 min-w-[140px] p-4">
                  <p className="text-xs text-muted-foreground mb-1">Withholding Tax</p>
                  <p className="text-lg font-bold text-orange-500 whitespace-nowrap">
                    -{formatCurrency(selectedPayroll.totalWithholdingTax || 0)}
                  </p>
                </Card>
                <Card className="flex-1 min-w-[140px] p-4">
                  <p className="text-xs text-muted-foreground mb-1">Net Pay</p>
                  <p className="text-lg font-bold text-primary whitespace-nowrap">
                    {formatCurrency(selectedPayroll.totalNet)}
                  </p>
                </Card>
              </div>

              {/* Government Contributions */}
              <Card className="p-4">
                <h4 className="font-semibold mb-3">Government Contributions</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">SSS</span>
                    <span className="font-semibold">{formatCurrency(selectedPayroll.totalSSS || 0)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">PhilHealth</span>
                    <span className="font-semibold">{formatCurrency(selectedPayroll.totalPhilHealth || 0)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Pag-IBIG</span>
                    <span className="font-semibold">{formatCurrency(selectedPayroll.totalPagIbig || 0)}</span>
                  </div>
                </div>
              </Card>

              {/* Employee Breakdown */}
              <Card className="p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Employee Breakdown ({selectedPayroll.employeeCount} employees)
                </h4>
                <div className="max-h-[300px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b sticky top-0 bg-card">
                      <tr>
                        <th className="text-left py-2 min-w-[180px]">Employee</th>
                        <th className="text-right py-2 min-w-[100px]">Gross</th>
                        <th className="text-right py-2 min-w-[100px]">Deductions</th>
                        <th className="text-right py-2 min-w-[100px]">Net Pay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPayrollItems.map((item) => {
                        return (
                          <tr key={item.id} className="border-b border-border/50">
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs">
                                    {item.employee ? getInitials(item.employee.firstName, item.employee.lastName) : "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {item.employee ? `${item.employee.firstName} ${item.employee.lastName}` : "Unknown"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{item.employee?.department}</p>
                                </div>
                              </div>
                            </td>
                            <td className="text-right py-2">{formatCurrency(item.grossPay)}</td>
                            <td className="text-right py-2 text-red-500">-{formatCurrency(item.totalDeductions)}</td>
                            <td className="text-right py-2 text-primary font-semibold">
                              {formatCurrency(item.netPay)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleExportPayroll} className="gap-2 bg-transparent">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={handleSendPayslips} className="gap-2">
              <Mail className="h-4 w-4" />
              Send Payslips
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Payslip Dialog */}
      <SendPayslipDialog
        open={sendPayslipDialogOpen}
        onOpenChange={setSendPayslipDialogOpen}
        payrollItems={selectedPayrollItems}
        payrollRun={selectedPayroll}
      />
    </AdminLayout>
  )
}
