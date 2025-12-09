import type { Employee, PayrollRun, PayrollItem, DashboardStats, User } from "./types"
import { calculatePayroll } from "./ph-tax-calculator"

export { calculatePayroll }

// Philippine banks
const banks = [
  "BDO Unibank",
  "BPI",
  "Metrobank",
  "Landbank",
  "PNB",
  "Security Bank",
  "UnionBank",
  "RCBC",
  "EastWest Bank",
  "China Bank",
  "GCash",
  "Maya",
]

export const mockEmployees: Employee[] = []

export function generatePayrollItems(
  payrollRunId: string,
  employees: Employee[],
  payPeriodStart?: Date | string,
  payPeriodEnd?: Date | string,
  payDate?: Date | string,
): PayrollItem[] {
  const activeEmployees = employees.filter((e) => e.status === "active")

  // Default dates if not provided
  const defaultStart = payPeriodStart ? new Date(payPeriodStart) : new Date()
  const defaultEnd = payPeriodEnd ? new Date(payPeriodEnd) : new Date()
  const defaultPayDate = payDate ? new Date(payDate) : new Date()

  return activeEmployees.map((emp, index) => {
    // Use deterministic values based on employee index instead of random
    const overtimeHours = index % 3 === 0 ? 8 : 0
    const allowances = index % 2 === 0 ? 2000 : 0

    const calc = calculatePayroll(emp.monthlySalary, overtimeHours, allowances, true)

    return {
      id: `pi-${emp.id}-${payrollRunId}`,
      payrollRunId,
      employeeId: emp.id,
      employee: emp,
      payPeriodStart: defaultStart,
      payPeriodEnd: defaultEnd,
      payDate: defaultPayDate,
      basicPay: calc.basicPay,
      overtimePay: calc.overtimePay,
      overtimeHours,
      allowances: calc.allowances,
      grossPay: calc.grossPay,
      sssContribution: calc.sss.employee,
      philHealthContribution: calc.philHealth.employee,
      pagIbigContribution: calc.pagIbig.employee,
      withholdingTax: calc.withholdingTax,
      otherDeductions: 0,
      totalDeductions: calc.totalDeductions,
      netPay: calc.netPay,
      status: "processed" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  })
}

export const mockPayrollRuns: PayrollRun[] = []

export const mockPayrollItems: PayrollItem[] = []

// Calculate department breakdown
const departments = ["Engineering", "Sales", "Marketing", "HR", "Finance", "Operations", "Customer Support"]
const departmentBreakdown = departments.map((dept) => {
  return {
    department: dept,
    count: 0,
    totalSalary: 0,
  }
})

export const mockDashboardStats: DashboardStats = {
  totalEmployees: 0,
  activeEmployees: 0,
  totalPayrollThisMonth: 0,
  totalPayrollLastMonth: 0,
  pendingPayrolls: 0,
  upcomingPayDate: new Date(),
  departmentBreakdown,
  monthlyPayrollTrend: [
    { month: "Jul", amount: 0 },
    { month: "Aug", amount: 0 },
    { month: "Sep", amount: 0 },
    { month: "Oct", amount: 0 },
    { month: "Nov", amount: 0 },
    { month: "Dec", amount: 0 },
  ],
}

export const mockUser: User = {
  id: "user-001",
  email: "admin@company.com.ph",
  name: "Admin User",
  role: "admin",
  avatarUrl: undefined,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date(),
}
