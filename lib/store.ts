"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Employee, PayrollRun, PayrollItem, Department, Leave, SalaryAdjustment } from "./types"
import { mockPayrollRuns, mockPayrollItems } from "./mock-data"
import { calculatePayroll } from "@/lib/ph-tax-calculator"
import { logAuditFromClient } from "@/lib/audit-logger-client"

async function updateEmployeeSalaryInSupabase(employeeId: string, newSalary: number, previousSalary: number) {
  try {
    const response = await fetch("/api/update-employee-salary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, newSalary, previousSalary }),
    })
    if (!response.ok) {
      console.error("[v0] Failed to update employee salary in Supabase")
    }
  } catch (error) {
    console.error("[v0] Error updating employee salary in Supabase:", error)
  }
}

async function syncPayslipToSupabase(payrollItem: PayrollItem, employeeEmail: string) {}

const mockDepartments: Department[] = [
  {
    id: "dept-1",
    name: "Engineering",
    description: "Software development and IT infrastructure",
    employeeCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "dept-2",
    name: "Sales",
    description: "Sales and business development",
    employeeCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "dept-3",
    name: "Marketing",
    description: "Marketing and brand management",
    employeeCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "dept-4",
    name: "HR",
    description: "Human resources and talent management",
    employeeCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "dept-5",
    name: "Finance",
    description: "Financial operations and accounting",
    employeeCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "dept-6",
    name: "Operations",
    description: "Business operations and project management",
    employeeCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "dept-7",
    name: "Customer Support",
    description: "Customer service and technical support",
    employeeCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const mockLeaves: Leave[] = [
  {
    id: "leave-1",
    employeeId: "emp-001",
    type: "vacation",
    startDate: new Date("2025-12-20"),
    endDate: new Date("2025-12-25"),
    totalDays: 5,
    reason: "Holiday vacation",
    status: "approved",
    approvedBy: "user-001",
    approvedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "leave-2",
    employeeId: "emp-003",
    type: "sick",
    startDate: new Date("2025-12-10"),
    endDate: new Date("2025-12-11"),
    totalDays: 2,
    reason: "Flu",
    status: "approved",
    approvedBy: "user-001",
    approvedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "leave-3",
    employeeId: "emp-005",
    type: "emergency",
    startDate: new Date("2025-12-15"),
    endDate: new Date("2025-12-16"),
    totalDays: 2,
    reason: "Family emergency",
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const mockSalaryAdjustments: SalaryAdjustment[] = []

interface PayrollStore {
  // Employees
  employees: Employee[]
  setEmployees: (employees: Employee[]) => void
  addEmployee: (employee: Omit<Employee, "id" | "createdAt" | "updatedAt"> | Employee) => void
  updateEmployee: (id: string, data: Partial<Employee>) => void
  deleteEmployee: (id: string) => void

  // Payroll Runs
  payrollRuns: PayrollRun[]
  addPayrollRun: (payrollRun: Omit<PayrollRun, "id" | "createdAt" | "updatedAt">) => PayrollRun
  updatePayrollRun: (id: string, data: Partial<PayrollRun>) => void
  processPayroll: (id: string) => void
  approvePayroll: (id: string) => void
  finalizePayroll: (id: string) => void
  setPayrollRuns: (payrollRuns: PayrollRun[]) => void

  // Payroll Items
  payrollItems: PayrollItem[]
  setPayrollItems: (payrollItems: PayrollItem[]) => void
  getPayrollItemsByRunId: (runId: string) => PayrollItem[]
  markPayrollItemsAsSent: (itemIds: string[]) => void
  updatePayrollItem: (id: string, data: Partial<PayrollItem>, syncToEmployee?: boolean) => void

  departments: Department[]
  addDepartment: (department: Omit<Department, "id" | "createdAt" | "updatedAt" | "employeeCount">) => void
  updateDepartment: (id: string, data: Partial<Department>) => void
  deleteDepartment: (id: string) => void

  leaves: Leave[]
  addLeave: (leave: Omit<Leave, "id" | "createdAt" | "updatedAt">) => void
  updateLeave: (id: string, data: Partial<Leave>) => void
  approveLeave: (id: string) => void
  rejectLeave: (id: string) => void

  salaryAdjustments: SalaryAdjustment[]
  addSalaryAdjustment: (adjustment: Omit<SalaryAdjustment, "id" | "createdAt" | "updatedAt">) => void
  updateSalaryAdjustment: (id: string, data: Partial<SalaryAdjustment>) => void
  approveSalaryAdjustment: (id: string) => void
  rejectSalaryAdjustment: (id: string) => void

  // UI State
  selectedEmployeeIds: string[]
  setSelectedEmployeeIds: (ids: string[]) => void
}

export const usePayrollStore = create<PayrollStore>()(
  persist(
    (set, get) => ({
      employees: [],
      payrollRuns: mockPayrollRuns,
      payrollItems: Array.isArray(mockPayrollItems) ? mockPayrollItems : [],
      departments: mockDepartments,
      leaves: mockLeaves,
      salaryAdjustments: Array.isArray(mockSalaryAdjustments) ? mockSalaryAdjustments : [],
      selectedEmployeeIds: [],

      setEmployees: (employees) => set({ employees }),

      addEmployee: (employeeData) => {
        const newEmployee: Employee = {
          ...employeeData,
          id: `emp-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        set((state) => ({
          employees: [...state.employees, newEmployee],
        }))

        logAuditFromClient({
          action: "employee_created",
          entityType: "employee",
          entityId: newEmployee.id,
          metadata: {
            employeeName: `${newEmployee.firstName} ${newEmployee.lastName}`,
            employeeEmail: newEmployee.email,
            employeeNumber: newEmployee.employeeNumber,
            department: newEmployee.department,
            position: newEmployee.position,
            monthlySalary: newEmployee.monthlySalary,
          },
        })
      },

      updateEmployee: (id, data) => {
        const oldEmployee = get().employees.find((emp) => emp.id === id)
        set((state) => ({
          employees: state.employees.map((emp) => (emp.id === id ? { ...emp, ...data, updatedAt: new Date() } : emp)),
        }))

        const updatedEmployee = get().employees.find((emp) => emp.id === id)
        logAuditFromClient({
          action: "employee_updated",
          entityType: "employee",
          entityId: id,
          metadata: {
            employeeName: updatedEmployee
              ? `${updatedEmployee.firstName} ${updatedEmployee.lastName}`
              : oldEmployee
                ? `${oldEmployee.firstName} ${oldEmployee.lastName}`
                : null,
            employeeEmail: updatedEmployee?.email || oldEmployee?.email,
            changes: data,
          },
        })
      },

      deleteEmployee: (id) => {
        const employee = get().employees.find((emp) => emp.id === id)
        set((state) => ({
          employees: state.employees.filter((emp) => emp.id !== id),
        }))

        if (employee) {
          logAuditFromClient({
            action: "employee_deleted",
            entityType: "employee",
            entityId: id,
            metadata: {
              employeeName: `${employee.firstName} ${employee.lastName}`,
              employeeEmail: employee.email,
              employeeNumber: employee.employeeNumber,
              department: employee.department,
            },
          })
        }
      },

      // Payroll Runs
      payrollRuns: mockPayrollRuns,
      addPayrollRun: (runData) => {
        const newRun: PayrollRun = {
          ...runData,
          id: `payroll-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        set((state) => ({
          payrollRuns: [...state.payrollRuns, newRun],
        }))

        // Generate payroll items for selected employees
        const selectedIds = get().selectedEmployeeIds
        const employees = get().employees
        const newItems: PayrollItem[] = selectedIds
          .map((empId) => {
            const emp = employees.find((e) => e.id === empId)
            if (!emp) return null

            const overtimeHours = Math.random() > 0.7 ? Math.floor(Math.random() * 20) : 0
            const calc = calculatePayroll(emp.monthlySalary, overtimeHours, 0, true)

            return {
              id: `item-${Date.now()}-${empId}`,
              payrollRunId: newRun.id,
              employeeId: empId,
              payPeriodStart: runData.payPeriodStart,
              payPeriodEnd: runData.payPeriodEnd,
              payDate: runData.payDate,
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
          .filter(Boolean) as PayrollItem[]

        set((state) => ({
          payrollItems: [...state.payrollItems, ...newItems],
        }))

        logAuditFromClient({
          action: "payroll_created",
          entityType: "payroll",
          entityId: newRun.id,
          metadata: {
            payPeriod: `${runData.payPeriodStart.toISOString().split("T")[0]} - ${runData.payPeriodEnd.toISOString().split("T")[0]}`,
            payPeriodStart: runData.payPeriodStart.toISOString(),
            payPeriodEnd: runData.payPeriodEnd.toISOString(),
            payDate: runData.payDate.toISOString(),
            employeeCount: selectedIds.length,
            totalGross: runData.totalGross,
            totalNet: runData.totalNet,
            totalDeductions: runData.totalDeductions,
          },
        })
      },

      updatePayrollRun: (id, data) => {
        set((state) => ({
          payrollRuns: state.payrollRuns.map((run) =>
            run.id === id ? { ...run, ...data, updatedAt: new Date() } : run,
          ),
        }))
      },

      processPayroll: (id) => {
        set((state) => ({
          payrollRuns: state.payrollRuns.map((run) =>
            run.id === id ? { ...run, status: "processing", updatedAt: new Date() } : run,
          ),
        }))
        setTimeout(() => {
          set((state) => ({
            payrollRuns: state.payrollRuns.map((run) =>
              run.id === id ? { ...run, status: "approved", updatedAt: new Date() } : run,
            ),
          }))
        }, 1500)
      },

      approvePayroll: (id) => {
        set((state) => ({
          payrollRuns: state.payrollRuns.map((run) =>
            run.id === id ? { ...run, status: "approved", approvedBy: "user-001", updatedAt: new Date() } : run,
          ),
        }))
      },

      finalizePayroll: (id) => {
        set((state) => ({
          payrollRuns: state.payrollRuns.map((run) =>
            run.id === id ? { ...run, status: "finalized", finalizedAt: new Date(), updatedAt: new Date() } : run,
          ),
        }))
      },

      setPayrollRuns: (payrollRuns) => set({ payrollRuns }),

      // Payroll Items
      payrollItems: Array.isArray(mockPayrollItems) ? mockPayrollItems : [],
      getPayrollItemsByRunId: (runId) => {
        return get().payrollItems.filter((item) => item.payrollRunId === runId)
      },

      setPayrollItems: (payrollItems) => set({ payrollItems }),

      markPayrollItemsAsSent: (itemIds) => {
        set((state) => ({
          payrollItems: state.payrollItems.map((item) =>
            itemIds.includes(item.id) ? { ...item, emailSent: true, emailSentAt: new Date() } : item,
          ),
        }))

        const items = get().payrollItems.filter((item) => itemIds.includes(item.id))
        const employees = get().employees
        items.forEach((item) => {
          const employee = employees.find((emp) => emp.id === item.employeeId)
          if (employee) {
            syncPayslipToSupabase(item, employee.email)
          }
        })
      },

      updatePayrollItem: (id, data, syncToEmployee = true) => {
        const oldItem = get().payrollItems.find((item) => item.id === id)
        const employee = oldItem ? get().employees.find((emp) => emp.id === oldItem.employeeId) : null

        // Update the payroll item
        set((state) => ({
          payrollItems: state.payrollItems.map((item) =>
            item.id === id ? { ...item, ...data, updatedAt: new Date() } : item,
          ),
        }))

        // If basicPay changed and syncToEmployee is true, update employee's monthly salary
        if (syncToEmployee && data.basicPay !== undefined && oldItem && employee) {
          // Calculate the new monthly salary from the semi-monthly basic pay
          // Since payroll uses semi-monthly (basicPay = monthlySalary / 2)
          const newMonthlySalary = data.basicPay * 2

          // Only update if the salary actually changed
          if (newMonthlySalary !== employee.monthlySalary) {
            const previousSalary = employee.monthlySalary

            // Update employee's monthly salary in the store
            get().updateEmployee(employee.id, { monthlySalary: newMonthlySalary })

            // Also update in Supabase directly
            updateEmployeeSalaryInSupabase(employee.id, newMonthlySalary, previousSalary)

            // Log audit for salary adjustment
            logAuditFromClient({
              action: "salary_adjustment_approved",
              entityType: "salary",
              entityId: id,
              metadata: {
                employeeName: `${employee.firstName} ${employee.lastName}`,
                employeeEmail: employee.email,
                adjustmentType: newMonthlySalary > previousSalary ? "increase" : "decrease",
                adjustmentAmount: Math.abs(newMonthlySalary - previousSalary),
                previousSalary: previousSalary,
                newSalary: newMonthlySalary,
                source: "payroll_adjustment",
                reason: "Salary adjusted via payroll processing",
              },
            })
          }
        }

        // Log audit for payroll item update
        logAuditFromClient({
          action: "payroll_processed",
          entityType: "payroll",
          entityId: id,
          metadata: {
            employeeName: employee ? `${employee.firstName} ${employee.lastName}` : null,
            changes: data,
            previousBasicPay: oldItem?.basicPay,
            newBasicPay: data.basicPay,
          },
        })
      },

      // Departments
      departments: mockDepartments,
      addDepartment: (departmentData) => {
        const newDepartment: Department = {
          ...departmentData,
          id: `dept-${Date.now()}`,
          employeeCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        set((state) => ({
          departments: [...state.departments, newDepartment],
        }))

        logAuditFromClient({
          action: "department_created",
          entityType: "department",
          entityId: newDepartment.id,
          metadata: {
            departmentName: newDepartment.name,
            description: newDepartment.description,
            managerId: newDepartment.managerId,
          },
        })
      },

      updateDepartment: (id, data) => {
        const oldDepartment = get().departments.find((dept) => dept.id === id)
        set((state) => ({
          departments: state.departments.map((dept) =>
            dept.id === id ? { ...dept, ...data, updatedAt: new Date() } : dept,
          ),
        }))

        logAuditFromClient({
          action: "department_updated",
          entityType: "department",
          entityId: id,
          metadata: {
            departmentName: data.name || oldDepartment?.name,
            previousName: oldDepartment?.name,
            changes: data,
          },
        })
      },

      deleteDepartment: (id) => {
        const department = get().departments.find((dept) => dept.id === id)
        set((state) => ({
          departments: state.departments.filter((dept) => dept.id !== id),
        }))

        if (department) {
          logAuditFromClient({
            action: "department_deleted",
            entityType: "department",
            entityId: id,
            metadata: {
              departmentName: department.name,
              description: department.description,
            },
          })
        }
      },

      // Leaves
      leaves: mockLeaves,
      addLeave: (leaveData) => {
        const newLeave: Leave = {
          ...leaveData,
          id: `leave-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        set((state) => ({
          leaves: [...state.leaves, newLeave],
        }))
      },

      updateLeave: (id, data) => {
        set((state) => ({
          leaves: state.leaves.map((leave) => (leave.id === id ? { ...leave, ...data, updatedAt: new Date() } : leave)),
        }))
      },

      approveLeave: (id) => {
        set((state) => ({
          leaves: state.leaves.map((leave) =>
            leave.id === id
              ? { ...leave, status: "approved", approvedBy: "user-001", approvedAt: new Date(), updatedAt: new Date() }
              : leave,
          ),
        }))
      },

      rejectLeave: (id) => {
        set((state) => ({
          leaves: state.leaves.map((leave) =>
            leave.id === id ? { ...leave, status: "rejected", updatedAt: new Date() } : leave,
          ),
        }))
      },

      // Salary Adjustments
      salaryAdjustments: Array.isArray(mockSalaryAdjustments) ? mockSalaryAdjustments : [],
      addSalaryAdjustment: (adjustmentData) => {
        const newAdjustment: SalaryAdjustment = {
          ...adjustmentData,
          id: `adj-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        set((state) => ({
          salaryAdjustments: [...state.salaryAdjustments, newAdjustment],
        }))

        const employee = get().employees.find((emp) => emp.id === adjustmentData.employeeId)
        logAuditFromClient({
          action: "salary_adjustment_created",
          entityType: "salary",
          entityId: newAdjustment.id,
          metadata: {
            entityName: employee ? `${employee.firstName} ${employee.lastName}` : null,
            employeeId: adjustmentData.employeeId,
            type: adjustmentData.type,
            amount: adjustmentData.amount,
            reason: adjustmentData.reason,
            effectiveDate: adjustmentData.effectiveDate,
          },
        })
      },

      updateSalaryAdjustment: (id, data) => {
        const oldAdjustment = get().salaryAdjustments.find((adj) => adj.id === id)
        const employee = oldAdjustment ? get().employees.find((emp) => emp.id === oldAdjustment.employeeId) : null

        set((state) => ({
          salaryAdjustments: state.salaryAdjustments.map((adj) =>
            adj.id === id ? { ...adj, ...data, updatedAt: new Date() } : adj,
          ),
        }))

        logAuditFromClient({
          action: "salary_adjustment_updated",
          entityType: "salary",
          entityId: id,
          metadata: {
            entityName: employee ? `${employee.firstName} ${employee.lastName}` : null,
            changes: data,
            previousValues: oldAdjustment
              ? {
                  type: oldAdjustment.type,
                  amount: oldAdjustment.amount,
                  reason: oldAdjustment.reason,
                }
              : null,
          },
        })
      },

      approveSalaryAdjustment: (id) => {
        const adjustment = get().salaryAdjustments.find((adj) => adj.id === id)
        if (adjustment) {
          const employee = get().employees.find((emp) => emp.id === adjustment.employeeId)
          if (employee) {
            let newSalary = employee.monthlySalary
            if (adjustment.type === "increase") {
              newSalary += adjustment.amount
            } else if (adjustment.type === "decrease") {
              newSalary -= adjustment.amount
            }
            get().updateEmployee(employee.id, { monthlySalary: newSalary })
          }

          logAuditFromClient({
            action: "salary_adjustment_approved",
            entityType: "salary",
            entityId: id,
            metadata: {
              entityName: employee ? `${employee.firstName} ${employee.lastName}` : null,
              employeeId: adjustment.employeeId,
              type: adjustment.type,
              amount: adjustment.amount,
              reason: adjustment.reason,
              newSalary: employee
                ? adjustment.type === "increase"
                  ? employee.monthlySalary + adjustment.amount
                  : employee.monthlySalary - adjustment.amount
                : null,
            },
          })
        }
        set((state) => ({
          salaryAdjustments: state.salaryAdjustments.map((adj) =>
            adj.id === id
              ? { ...adj, status: "approved", approvedBy: "user-001", approvedAt: new Date(), updatedAt: new Date() }
              : adj,
          ),
        }))
      },

      rejectSalaryAdjustment: (id) => {
        const adjustment = get().salaryAdjustments.find((adj) => adj.id === id)
        const employee = adjustment ? get().employees.find((emp) => emp.id === adjustment.employeeId) : null

        set((state) => ({
          salaryAdjustments: state.salaryAdjustments.map((adj) =>
            adj.id === id ? { ...adj, status: "rejected", updatedAt: new Date() } : adj,
          ),
        }))

        if (adjustment) {
          logAuditFromClient({
            action: "salary_adjustment_rejected",
            entityType: "salary",
            entityId: id,
            metadata: {
              entityName: employee ? `${employee.firstName} ${employee.lastName}` : null,
              employeeId: adjustment.employeeId,
              type: adjustment.type,
              amount: adjustment.amount,
              reason: adjustment.reason,
            },
          })
        }
      },

      // UI State
      selectedEmployeeIds: [],
      setSelectedEmployeeIds: (ids) => {
        set({ selectedEmployeeIds: ids })
      },
    }),
    {
      name: "payroll-management-storage-v10",
      partialize: (state) => ({
        employees: state.employees,
        payrollRuns: state.payrollRuns,
        payrollItems: state.payrollItems,
        departments: state.departments,
        leaves: state.leaves,
        salaryAdjustments: state.salaryAdjustments,
      }),
    },
  ),
)
