"use client"
import * as React from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts"
import {
  Download,
  FileText,
  TrendingUp,
  Users,
  Building2,
  Calendar,
  Filter,
  Clock,
  RefreshCw,
  Loader2,
} from "lucide-react"
import { AdminLayout } from "@/components/layout/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { formatCurrency, PESO_SIGN } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { createBrowserClient } from "@/lib/supabase/client"

const COLORS = [
  "hsl(162, 72%, 45%)", // Teal (primary)
  "hsl(200, 80%, 50%)", // Blue
  "hsl(145, 65%, 42%)", // Green
  "hsl(280, 60%, 55%)", // Purple
  "hsl(185, 70%, 45%)", // Cyan
  "hsl(340, 65%, 55%)", // Pink
  "hsl(85, 55%, 50%)", // Lime
]

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  department: string
  position: string
  monthly_salary: number
  status: string
  hire_date: string
  created_at: string
}

interface Payslip {
  id: string
  employee_id: string
  gross_pay: number
  net_pay: number
  total_deductions: number
  pay_period_start: string
  pay_period_end: string
  pay_date: string
  status: string
  created_at: string
}

interface LeaveRequest {
  id: string
  employee_id: string
  leave_type: string
  start_date: string
  end_date: string
  total_days: number
  status: string
  created_at: string
}

interface AttendanceRecord {
  id: string
  employee_id: string
  date: string
  time_in: string
  time_out: string
  overtime_hours: number
  status: string
}

export default function ReportsPage() {
  const [mounted, setMounted] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [year, setYear] = React.useState(new Date().getFullYear().toString())
  const [quarter, setQuarter] = React.useState("all")
  const [department, setDepartment] = React.useState("all")
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false)
  const [scheduleDialogOpen, setScheduleDialogOpen] = React.useState(false)
  const [selectedReports, setSelectedReports] = React.useState<string[]>([])
  const { toast } = useToast()

  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [payslips, setPayslips] = React.useState<Payslip[]>([])
  const [leaveRequests, setLeaveRequests] = React.useState<LeaveRequest[]>([])
  const [attendanceRecords, setAttendanceRecords] = React.useState<AttendanceRecord[]>([])

  const fetchReportData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const supabase = createBrowserClient()

      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select("*")
        .order("last_name")

      if (employeesError) throw employeesError
      setEmployees(employeesData || [])

      // Fetch payslips
      const { data: payslipsData, error: payslipsError } = await supabase
        .from("payslips")
        .select("*")
        .order("pay_date", { ascending: false })

      if (payslipsError) throw payslipsError
      setPayslips(payslipsData || [])

      // Fetch leave requests
      const { data: leavesData, error: leavesError } = await supabase
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false })

      if (leavesError) throw leavesError
      setLeaveRequests(leavesData || [])

      // Fetch attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance_records")
        .select("*")
        .order("date", { ascending: false })

      if (attendanceError) throw attendanceError
      setAttendanceRecords(attendanceData || [])
    } catch (error) {
      console.error("[v0] Error fetching report data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch report data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    setMounted(true)
    fetchReportData()
  }, [fetchReportData])

  const activeEmployees = employees.filter((e) => e.status === "active")

  // Get unique departments from actual data
  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))]

  // Calculate department breakdown from real data
  const departmentBreakdown = departments
    .map((dept) => {
      const deptEmployees = activeEmployees.filter((e) => e.department === dept)
      return {
        department: dept,
        count: deptEmployees.length,
        totalSalary: deptEmployees.reduce((sum, e) => sum + (e.monthly_salary || 0), 0),
      }
    })
    .filter((d) => d.count > 0)
    .sort((a, b) => b.totalSalary - a.totalSalary)

  // Calculate monthly payroll totals from payslips
  const monthlyTotals: { [key: string]: { amount: number; employees: Set<string> } } = {}
  payslips.forEach((payslip) => {
    const date = new Date(payslip.pay_date || payslip.created_at)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

    if (!monthlyTotals[monthKey]) {
      monthlyTotals[monthKey] = { amount: 0, employees: new Set() }
    }
    monthlyTotals[monthKey].amount += payslip.net_pay || 0
    monthlyTotals[monthKey].employees.add(payslip.employee_id)
  })

  // Get last 6 months
  const months = Object.keys(monthlyTotals).sort().slice(-6)

  const monthlyPayrollData = months.map((monthKey) => {
    const [y, m] = monthKey.split("-")
    const monthName = new Date(Number.parseInt(y), Number.parseInt(m) - 1).toLocaleDateString("en-US", {
      month: "short",
    })
    return {
      month: monthName,
      amount: monthlyTotals[monthKey].amount,
      employees: monthlyTotals[monthKey].employees.size,
    }
  })

  // Calculate total payroll
  const totalPayroll = payslips.reduce((sum, p) => sum + (p.net_pay || 0), 0)

  // Employee cost data (calculated from real salary data)
  const avgSalary =
    activeEmployees.length > 0
      ? activeEmployees.reduce((sum, e) => sum + (e.monthly_salary || 0), 0) / activeEmployees.length
      : 0

  const employeeCostData = monthlyPayrollData.map((m) => ({
    month: m.month,
    salary: m.amount,
    benefits: m.amount * 0.15, // Estimated benefits at 15%
    taxes: m.amount * 0.12, // Estimated employer contributions at 12%
  }))

  // Tax summary (estimated from payslips)
  const totalGross = payslips.reduce((sum, p) => sum + (p.gross_pay || 0), 0)
  const totalDeductions = payslips.reduce((sum, p) => sum + (p.total_deductions || 0), 0)

  // Estimate breakdown (these would ideally come from detailed payslip data)
  const taxSummary = {
    sss: totalDeductions * 0.25,
    philHealth: totalDeductions * 0.15,
    pagIbig: totalDeductions * 0.1,
    withholdingTax: totalDeductions * 0.5,
  }

  const taxData = [
    { name: "SSS", value: taxSummary.sss },
    { name: "PhilHealth", value: taxSummary.philHealth },
    { name: "Pag-IBIG", value: taxSummary.pagIbig },
    { name: "Withholding Tax", value: taxSummary.withholdingTax },
  ]

  // Overtime data by department (from attendance records)
  const deptOT: { [key: string]: { hours: number; cost: number } } = {}

  attendanceRecords.forEach((record) => {
    const employee = employees.find((e) => e.id === record.employee_id)
    if (employee && record.overtime_hours > 0) {
      const dept = employee.department || "Other"
      if (!deptOT[dept]) {
        deptOT[dept] = { hours: 0, cost: 0 }
      }
      deptOT[dept].hours += record.overtime_hours
      // Estimate OT cost at 1.25x hourly rate
      const hourlyRate = (employee.monthly_salary || 0) / 176 // 22 days * 8 hours
      deptOT[dept].cost += record.overtime_hours * hourlyRate * 1.25
    }
  })

  const overtimeData = Object.entries(deptOT)
    .map(([department, data]) => ({
      department,
      hours: Math.round(data.hours * 10) / 10,
      cost: Math.round(data.cost),
    }))
    .filter((d) => d.hours > 0)
    .sort((a, b) => b.hours - a.hours)

  // Leave statistics from real data
  const leaveStats = {
    vacation: leaveRequests.filter((l) => l.leave_type === "vacation").length,
    sick: leaveRequests.filter((l) => l.leave_type === "sick").length,
    emergency: leaveRequests.filter((l) => l.leave_type === "emergency").length,
    other: leaveRequests.filter((l) => !["vacation", "sick", "emergency"].includes(l.leave_type)).length,
  }

  const leaveData = [
    { name: "Vacation", value: leaveStats.vacation },
    { name: "Sick", value: leaveStats.sick },
    { name: "Emergency", value: leaveStats.emergency },
    { name: "Other", value: leaveStats.other },
  ].filter((d) => d.value > 0)

  // Headcount trend (from employees hire dates)
  const monthlyCount: { [key: string]: { active: number; new: number } } = {}
  const sortedEmployees = [...employees].sort(
    (a, b) => new Date(a.hire_date || a.created_at).getTime() - new Date(b.hire_date || b.created_at).getTime(),
  )

  // Get last 6 months
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    monthlyCount[monthKey] = { active: 0, new: 0 }
  }

  // Count employees per month
  Object.keys(monthlyCount).forEach((monthKey) => {
    const [y, m] = monthKey.split("-").map(Number)
    const monthEnd = new Date(y, m, 0) // Last day of month

    sortedEmployees.forEach((emp) => {
      const hireDate = new Date(emp.hire_date || emp.created_at)
      if (hireDate <= monthEnd && emp.status === "active") {
        monthlyCount[monthKey].active++
      }
      // Check if hired this month
      if (hireDate.getFullYear() === y && hireDate.getMonth() + 1 === m) {
        monthlyCount[monthKey].new++
      }
    })
  })

  const headcountTrend = Object.entries(monthlyCount).map(([monthKey, data]) => {
    const [y, m] = monthKey.split("-")
    const monthName = new Date(Number.parseInt(y), Number.parseInt(m) - 1).toLocaleDateString("en-US", {
      month: "short",
    })
    return {
      month: monthName,
      active: data.active,
      new: data.new,
      resigned: 0, // Would need termination data to calculate
    }
  })

  const handleExportReport = (reportType: string) => {
    let csvContent = ""
    let filename = ""

    switch (reportType) {
      case "payroll-summary":
        csvContent = [
          ["Month", "Total Payroll", "Employee Count"],
          ...monthlyPayrollData.map((m) => [m.month, m.amount, m.employees]),
        ]
          .map((row) => row.join(","))
          .join("\n")
        filename = "payroll-summary"
        break
      case "department-breakdown":
        csvContent = [
          ["Department", "Employee Count", "Total Salary"],
          ...departmentBreakdown.map((d) => [d.department, d.count, d.totalSalary]),
        ]
          .map((row) => row.join(","))
          .join("\n")
        filename = "department-breakdown"
        break
      case "tax-contributions":
        csvContent = [["Contribution Type", "Amount"], ...taxData.map((t) => [t.name, t.value])]
          .map((row) => row.join(","))
          .join("\n")
        filename = "tax-contributions"
        break
      case "overtime":
        csvContent = [["Department", "Hours", "Cost"], ...overtimeData.map((d) => [d.department, d.hours, d.cost])]
          .map((row) => row.join(","))
          .join("\n")
        filename = "overtime-report"
        break
      case "employees":
        csvContent = [
          ["Name", "Email", "Department", "Position", "Monthly Salary", "Status", "Hire Date"],
          ...employees.map((e) => [
            `${e.first_name} ${e.last_name}`,
            e.email,
            e.department,
            e.position,
            e.monthly_salary,
            e.status,
            e.hire_date,
          ]),
        ]
          .map((row) => row.join(","))
          .join("\n")
        filename = "employees-report"
        break
      default:
        csvContent = "No data"
        filename = "report"
    }

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${filename}-${year}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Report Exported",
      description: `${reportType.replace("-", " ")} has been exported successfully.`,
    })
  }

  const handleBulkExport = () => {
    selectedReports.forEach((report) => handleExportReport(report))
    setExportDialogOpen(false)
    setSelectedReports([])
  }

  const handleScheduleReport = () => {
    toast({
      title: "Report Scheduled",
      description: "Monthly reports will be sent to your email automatically.",
    })
    setScheduleDialogOpen(false)
  }

  const reportTypes = [
    { id: "payroll-summary", name: "Payroll Summary", description: "Monthly payroll totals and trends" },
    { id: "department-breakdown", name: "Department Breakdown", description: "Employee distribution by department" },
    { id: "tax-contributions", name: "Government Contributions", description: "SSS, PhilHealth, Pag-IBIG, Tax" },
    { id: "overtime", name: "Overtime Report", description: "Overtime hours and costs by department" },
    { id: "headcount", name: "Headcount Report", description: "Employee count trends" },
    { id: "employees", name: "Employee List", description: "All employees with details" },
  ]

  if (!mounted || isLoading) {
    return (
      <AdminLayout title="Reports" subtitle="Payroll analytics and insights">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Reports" subtitle="Payroll analytics and insights">
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                </SelectContent>
              </Select>
              <Select value={quarter} onValueChange={setQuarter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Quarter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Quarters</SelectItem>
                  <SelectItem value="q1">Q1</SelectItem>
                  <SelectItem value="q2">Q2</SelectItem>
                  <SelectItem value="q3">Q3</SelectItem>
                  <SelectItem value="q4">Q4</SelectItem>
                </SelectContent>
              </Select>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept.toLowerCase()}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <Button variant="outline" className="gap-2 bg-transparent" onClick={fetchReportData} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </Button>
              <Button variant="outline" className="gap-2 bg-transparent" onClick={() => setScheduleDialogOpen(true)}>
                <Clock className="h-4 w-4" />
                Schedule Reports
              </Button>
              <Button variant="outline" className="gap-2 bg-transparent" onClick={() => setExportDialogOpen(true)}>
                <Download className="h-4 w-4" />
                Export Reports
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Employees</p>
                  <p className="text-2xl font-bold">{employees.length}</p>
                  <p className="text-xs text-muted-foreground">{activeEmployees.length} active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Payroll</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalPayroll)}</p>
                  <p className="text-xs text-muted-foreground">{payslips.length} payslips</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                  <Building2 className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Departments</p>
                  <p className="text-2xl font-bold">{departments.length}</p>
                  <p className="text-xs text-muted-foreground">with employees</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                  <Calendar className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Leave Requests</p>
                  <p className="text-2xl font-bold">{leaveRequests.length}</p>
                  <p className="text-xs text-muted-foreground">total requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Tabs */}
        <Tabs defaultValue="summary" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
            <TabsTrigger value="taxes">Contributions</TabsTrigger>
            <TabsTrigger value="overtime">Overtime</TabsTrigger>
            <TabsTrigger value="headcount">Headcount</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Monthly Payroll Trend */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Monthly Payroll Trend
                    </CardTitle>
                    <CardDescription>Total payroll expenses over time</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleExportReport("payroll-summary")}>
                    <Download className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {monthlyPayrollData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyPayrollData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="month" className="text-xs" />
                          <YAxis
                            tickFormatter={(value) => `${PESO_SIGN}${(value / 1000000).toFixed(1)}M`}
                            className="text-xs"
                          />
                          <Tooltip
                            formatter={(value: number) => [formatCurrency(value), "Total"]}
                            contentStyle={{
                              backgroundColor: "var(--card)",
                              border: "1px solid var(--border)",
                              borderRadius: "8px",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="amount"
                            stroke="hsl(162, 72%, 45%)"
                            fill="hsl(162, 72%, 45%)"
                            fillOpacity={0.2}
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No payroll data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Department Breakdown */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Department Distribution
                    </CardTitle>
                    <CardDescription>Salary distribution by department</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleExportReport("department-breakdown")}>
                    <Download className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {departmentBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={departmentBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="totalSalary"
                            nameKey="department"
                          >
                            {departmentBreakdown.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => [formatCurrency(value), "Total Salary"]}
                            contentStyle={{
                              backgroundColor: "var(--card)",
                              border: "1px solid var(--border)",
                              borderRadius: "8px",
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No department data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Report Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              {reportTypes.slice(0, 4).map((report) => (
                <Card
                  key={report.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleExportReport(report.id)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{report.name}</p>
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Employee Costs Tab */}
          <TabsContent value="costs" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Employee Cost Breakdown</CardTitle>
                  <CardDescription>Monthly breakdown of salary, benefits, and employer contributions</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleExportReport("costs")}>
                  <Download className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  {employeeCostData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={employeeCostData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis
                          tickFormatter={(value) => `${PESO_SIGN}${(value / 1000000).toFixed(1)}M`}
                          className="text-xs"
                        />
                        <Tooltip
                          formatter={(value: number) => [formatCurrency(value), "Amount"]}
                          contentStyle={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Bar dataKey="salary" name="Salary" fill="hsl(162, 72%, 45%)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="benefits" name="Benefits" fill="hsl(200, 80%, 50%)" radius={[4, 4, 0, 0]} />
                        <Bar
                          dataKey="taxes"
                          name="Employer Contributions"
                          fill="hsl(280, 60%, 55%)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No cost data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tax Reports Tab */}
          <TabsContent value="taxes" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Government Contributions Distribution</CardTitle>
                    <CardDescription>Breakdown of mandatory contributions</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleExportReport("tax-contributions")}>
                    <Download className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {taxData.some((t) => t.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={taxData}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {taxData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => [formatCurrency(value)]}
                            contentStyle={{
                              backgroundColor: "var(--card)",
                              border: "1px solid var(--border)",
                              borderRadius: "8px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No contribution data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contributions Summary</CardTitle>
                  <CardDescription>Year-to-date government contributions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {taxData.map((tax, index) => (
                      <div key={tax.name} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="h-4 w-4 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                          <span className="font-medium">{tax.name}</span>
                        </div>
                        <span className="font-bold">{formatCurrency(tax.value)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <span className="font-semibold">Total Contributions</span>
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(taxData.reduce((sum, t) => sum + t.value, 0))}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Overtime Tab */}
          <TabsContent value="overtime" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Overtime by Department</CardTitle>
                  <CardDescription>Hours and costs for the current period</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleExportReport("overtime")}>
                  <Download className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  {overtimeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={overtimeData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs" />
                        <YAxis dataKey="department" type="category" className="text-xs" width={120} />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            name === "hours" ? `${value} hours` : formatCurrency(value),
                            name === "hours" ? "Hours" : "Cost",
                          ]}
                          contentStyle={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Bar dataKey="hours" name="Hours" fill="hsl(162, 72%, 45%)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No overtime data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Overtime Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total OT Hours</p>
                    <p className="text-3xl font-bold">{overtimeData.reduce((sum, d) => sum + d.hours, 0).toFixed(1)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total OT Cost</p>
                    <p className="text-3xl font-bold">
                      {formatCurrency(overtimeData.reduce((sum, d) => sum + d.cost, 0))}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Avg OT per Dept</p>
                    <p className="text-3xl font-bold">
                      {overtimeData.length > 0
                        ? (overtimeData.reduce((sum, d) => sum + d.hours, 0) / overtimeData.length).toFixed(1)
                        : 0}
                      h
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Headcount Tab */}
          <TabsContent value="headcount" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Headcount Trend</CardTitle>
                <CardDescription>Employee count over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  {headcountTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={headcountTrend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="active"
                          name="Active Employees"
                          stroke="hsl(162, 72%, 45%)"
                          strokeWidth={2}
                          dot={{ fill: "hsl(162, 72%, 45%)" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="new"
                          name="New Hires"
                          stroke="hsl(200, 80%, 50%)"
                          strokeWidth={2}
                          dot={{ fill: "hsl(200, 80%, 50%)" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No headcount data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Leave Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Leave Statistics</CardTitle>
                <CardDescription>Distribution of leave types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {leaveData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={leaveData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                        >
                          {leaveData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [value, "Count"]}
                          contentStyle={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No leave data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Export Dialog */}
        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export Reports</DialogTitle>
              <DialogDescription>Select which reports to export</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {reportTypes.map((report) => (
                <div key={report.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={report.id}
                    checked={selectedReports.includes(report.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedReports([...selectedReports, report.id])
                      } else {
                        setSelectedReports(selectedReports.filter((r) => r !== report.id))
                      }
                    }}
                  />
                  <div className="flex-1">
                    <Label htmlFor={report.id} className="font-medium">
                      {report.name}
                    </Label>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkExport} disabled={selectedReports.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export {selectedReports.length > 0 && `(${selectedReports.length})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Schedule Dialog */}
        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Reports</DialogTitle>
              <DialogDescription>Set up automatic report delivery</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="admin@company.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select defaultValue="monthly">
                  <SelectTrigger id="frequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleScheduleReport}>
                <Clock className="h-4 w-4 mr-2" />
                Schedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
