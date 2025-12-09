"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { logAuditWithCurrentUser } from "@/lib/audit-logger"

// Types
interface EmployeeData {
  id?: string
  employee_number: string
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  department: string
  position: string
  monthly_salary: number
  hire_date: string
  status: string
  user_id?: string | null
}

interface PayslipData {
  id?: string
  employee_id: string
  pay_period_start: string
  pay_period_end: string
  pay_date: string
  gross_pay: number
  total_deductions: number
  net_pay: number
  status: string
  email_sent?: boolean
  email_sent_at?: string | null
}

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// Employee CRUD operations that sync to Supabase
export async function createEmployeeInSupabase(data: EmployeeData) {
  const supabase = createAdminClient()

  const { data: employee, error } = await supabase
    .from("employees")
    .insert({
      id: crypto.randomUUID(),
      employee_number: data.employee_number,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      department: data.department,
      position: data.position,
      monthly_salary: data.monthly_salary,
      hire_date: data.hire_date,
      status: data.status,
      user_id: data.user_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error creating employee:", error)
    return { error: error.message }
  }

  await logAuditWithCurrentUser({
    action: "employee_created",
    entityType: "employee",
    entityId: employee.id,
    metadata: {
      employeeName: `${data.first_name} ${data.last_name}`,
      email: data.email,
      department: data.department,
      position: data.position,
    },
  })

  return { data: employee }
}

export async function updateEmployeeInSupabase(id: string, data: Partial<EmployeeData>) {
  const supabase = createAdminClient()

  const { data: employee, error } = await supabase
    .from("employees")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("[v0] Error updating employee:", error)
    return { error: error.message }
  }

  await logAuditWithCurrentUser({
    action: "employee_updated",
    entityType: "employee",
    entityId: id,
    metadata: {
      updatedFields: Object.keys(data),
    },
  })

  return { data: employee }
}

export async function deleteEmployeeInSupabase(id: string) {
  const supabase = createAdminClient()

  const { data: employeeInfo } = await supabase
    .from("employees")
    .select("first_name, last_name, email")
    .eq("id", id)
    .single()

  const { error } = await supabase.from("employees").delete().eq("id", id)

  if (error) {
    console.error("[v0] Error deleting employee:", error)
    return { error: error.message }
  }

  await logAuditWithCurrentUser({
    action: "employee_deleted",
    entityType: "employee",
    entityId: id,
    metadata: {
      deletedEmployee: employeeInfo
        ? {
            name: `${employeeInfo.first_name} ${employeeInfo.last_name}`,
            email: employeeInfo.email,
          }
        : null,
    },
  })

  return { success: true }
}

// Payslip CRUD operations
export async function createPayslipInSupabase(data: PayslipData) {
  const supabase = createAdminClient()

  const { data: payslip, error } = await supabase
    .from("payslips")
    .insert({
      id: data.id || crypto.randomUUID(),
      employee_id: data.employee_id,
      pay_period_start: data.pay_period_start,
      pay_period_end: data.pay_period_end,
      pay_date: data.pay_date,
      gross_pay: data.gross_pay,
      total_deductions: data.total_deductions,
      net_pay: data.net_pay,
      status: data.status,
      email_sent: data.email_sent || false,
      email_sent_at: data.email_sent_at || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error creating payslip:", error)
    return { error: error.message }
  }

  await logAuditWithCurrentUser({
    action: "payslip_generated",
    entityType: "payslip",
    entityId: payslip.id,
    metadata: {
      employeeId: data.employee_id,
      payPeriod: `${data.pay_period_start} to ${data.pay_period_end}`,
      netPay: data.net_pay,
    },
  })

  return { data: payslip }
}

export async function updatePayslipInSupabase(id: string, data: Partial<PayslipData>) {
  const supabase = createAdminClient()

  const { data: payslip, error } = await supabase
    .from("payslips")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("[v0] Error updating payslip:", error)
    return { error: error.message }
  }

  await logAuditWithCurrentUser({
    action: "payslip_updated",
    entityType: "payslip",
    entityId: id,
    metadata: {
      updatedFields: Object.keys(data),
    },
  })

  return { data: payslip }
}

export async function deletePayslipInSupabase(id: string) {
  const supabase = createAdminClient()

  const { data: payslipInfo } = await supabase
    .from("payslips")
    .select("employee_id, pay_period_start, pay_period_end")
    .eq("id", id)
    .single()

  const { error } = await supabase.from("payslips").delete().eq("id", id)

  if (error) {
    console.error("[v0] Error deleting payslip:", error)
    return { error: error.message }
  }

  await logAuditWithCurrentUser({
    action: "payslip_deleted",
    entityType: "payslip",
    entityId: id,
    metadata: {
      deletedPayslip: payslipInfo
        ? {
            employeeId: payslipInfo.employee_id,
            payPeriod: `${payslipInfo.pay_period_start} to ${payslipInfo.pay_period_end}`,
          }
        : null,
    },
  })

  return { success: true }
}

// Bulk sync employees from local store to Supabase
export async function syncEmployeesToSupabase(
  employees: Array<{
    id: string
    employeeNumber: string
    firstName: string
    lastName: string
    email: string
    phone?: string
    department: string
    position: string
    monthlySalary: number
    hireDate: string | Date
    status: string
    userId?: string | null
  }>,
) {
  const supabase = createAdminClient()

  const results = {
    synced: 0,
    failed: 0,
    errors: [] as string[],
  }

  for (const emp of employees) {
    // First, check if employee already exists by email (unique identifier)
    const { data: existingEmployee } = await supabase
      .from("employees")
      .select("id")
      .eq("email", emp.email)
      .maybeSingle()

    const employeeData = {
      employee_number: emp.employeeNumber,
      first_name: emp.firstName,
      last_name: emp.lastName,
      email: emp.email,
      phone: emp.phone || null,
      department: emp.department,
      position: emp.position,
      monthly_salary: emp.monthlySalary,
      hire_date: typeof emp.hireDate === "string" ? emp.hireDate : emp.hireDate.toISOString().split("T")[0],
      status: emp.status,
      user_id: emp.userId || null,
      updated_at: new Date().toISOString(),
    }

    let error

    if (existingEmployee) {
      // Update existing employee
      const result = await supabase.from("employees").update(employeeData).eq("id", existingEmployee.id)

      error = result.error
    } else {
      // Insert new employee with a fresh UUID
      const result = await supabase.from("employees").insert({
        id: crypto.randomUUID(),
        ...employeeData,
        created_at: new Date().toISOString(),
      })

      error = result.error
    }

    if (error) {
      results.failed++
      results.errors.push(`${emp.email}: ${error.message}`)
    } else {
      results.synced++
    }
  }

  return results
}

// Bulk create payslips
export async function createPayslipsBatch(
  payslips: Array<{
    employeeId: string
    employeeEmail?: string // Added optional email for lookup
    payPeriodStart: string | Date
    payPeriodEnd: string | Date
    payDate: string | Date
    grossPay: number
    totalDeductions: number
    netPay: number
    status: string
  }>,
) {
  const supabase = createAdminClient()

  const payslipRecords = []

  for (const p of payslips) {
    let employeeUUID = p.employeeId

    // If the employeeId is not a valid UUID, we need to look it up
    if (!isValidUUID(p.employeeId)) {
      // Try to find employee by email if provided
      if (p.employeeEmail) {
        const { data: employee } = await supabase
          .from("employees")
          .select("id")
          .eq("email", p.employeeEmail)
          .maybeSingle()

        if (employee) {
          employeeUUID = employee.id
        } else {
          console.error(`[v0] Employee not found for email: ${p.employeeEmail}`)
          continue // Skip this payslip
        }
      } else {
        console.error(`[v0] Invalid employee ID and no email provided: ${p.employeeId}`)
        continue // Skip this payslip
      }
    }

    payslipRecords.push({
      id: crypto.randomUUID(),
      employee_id: employeeUUID,
      pay_period_start:
        typeof p.payPeriodStart === "string" ? p.payPeriodStart : p.payPeriodStart.toISOString().split("T")[0],
      pay_period_end: typeof p.payPeriodEnd === "string" ? p.payPeriodEnd : p.payPeriodEnd.toISOString().split("T")[0],
      pay_date: typeof p.payDate === "string" ? p.payDate : p.payDate.toISOString().split("T")[0],
      gross_pay: p.grossPay,
      total_deductions: p.totalDeductions,
      net_pay: p.netPay,
      status: p.status,
      email_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  if (payslipRecords.length === 0) {
    return { error: "No valid payslips to create", data: [], count: 0 }
  }

  const { data, error } = await supabase.from("payslips").insert(payslipRecords).select()

  if (error) {
    console.error("[v0] Error creating payslips batch:", error)
    return { error: error.message }
  }

  return { data, count: data.length }
}

// Get all employees (for admin)
export async function getEmployeesFromSupabase() {
  const supabase = await createClient()

  const { data, error } = await supabase.from("employees").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching employees:", error)
    return { error: error.message }
  }

  return { data }
}

// Get all payslips (for admin)
export async function getPayslipsFromSupabase() {
  const supabase = await createClient()

  const { data, error } = await supabase.from("payslips").select("*").order("pay_date", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching payslips:", error)
    return { error: error.message }
  }

  return { data }
}
