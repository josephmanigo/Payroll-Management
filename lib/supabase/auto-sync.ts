"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { logAuditWithCurrentUser } from "@/lib/audit-logger"
import type { Employee, PayrollItem } from "@/lib/types"

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// Auto-sync a single employee to Supabase
export async function syncEmployeeToSupabase(employee: Employee): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[Auto-Sync] Starting sync for employee:", employee.email)
    const supabase = createAdminClient()

    // Check if employee exists by email
    const { data: existing, error: selectError } = await supabase
      .from("employees")
      .select("id, user_id")
      .eq("email", employee.email)
      .maybeSingle()

    if (selectError) {
      console.error("[Auto-Sync] Select error:", selectError.message)
      return { success: false, error: selectError.message }
    }

    let hireDateStr: string
    if (typeof employee.hireDate === "string") {
      hireDateStr = employee.hireDate.split("T")[0]
    } else if (employee.hireDate instanceof Date) {
      hireDateStr = employee.hireDate.toISOString().split("T")[0]
    } else {
      hireDateStr = new Date().toISOString().split("T")[0]
    }

    const employeeData = {
      employee_number: employee.employeeNumber || employee.id,
      first_name: employee.firstName,
      last_name: employee.lastName,
      email: employee.email,
      phone: employee.phone || null,
      department: employee.department,
      position: employee.position,
      monthly_salary: employee.monthlySalary,
      hire_date: hireDateStr,
      status: employee.status || "active",
      user_id: employee.userId || existing?.user_id || null,
      updated_at: new Date().toISOString(),
    }

    console.log("[Auto-Sync] Employee data to sync:", JSON.stringify(employeeData))

    if (existing) {
      // Update existing
      const { error } = await supabase.from("employees").update(employeeData).eq("id", existing.id)

      if (error) {
        console.error("[Auto-Sync] Failed to update employee:", error.message)
        return { success: false, error: error.message }
      }
      console.log("[Auto-Sync] Employee updated:", employee.email)

      await logAuditWithCurrentUser({
        action: "employee_synced",
        entityType: "employee",
        entityId: existing.id,
        metadata: {
          employeeName: `${employee.firstName} ${employee.lastName}`,
          email: employee.email,
          operation: "update",
        },
      })

      return { success: true }
    } else {
      // Insert new
      const newId = crypto.randomUUID()
      console.log("[Auto-Sync] Inserting new employee with ID:", newId)

      const { error } = await supabase.from("employees").insert({
        id: newId,
        ...employeeData,
        created_at: new Date().toISOString(),
      })

      if (error) {
        console.error("[Auto-Sync] Failed to create employee:", error.message, error)
        return { success: false, error: error.message }
      }
      console.log("[Auto-Sync] Employee created successfully:", employee.email)

      await logAuditWithCurrentUser({
        action: "employee_synced",
        entityType: "employee",
        entityId: newId,
        metadata: {
          employeeName: `${employee.firstName} ${employee.lastName}`,
          email: employee.email,
          operation: "insert",
        },
      })

      return { success: true }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error("[Auto-Sync] Error syncing employee:", errorMsg)
    return { success: false, error: errorMsg }
  }
}

export async function insertEmployeeToDatabase(employeeData: {
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
  userId?: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = createAdminClient()

    const id = crypto.randomUUID()
    const { error } = await supabase.from("employees").insert({
      id,
      employee_number: employeeData.employeeNumber,
      first_name: employeeData.firstName,
      last_name: employeeData.lastName,
      email: employeeData.email,
      phone: employeeData.phone || null,
      department: employeeData.department,
      position: employeeData.position,
      monthly_salary: employeeData.monthlySalary,
      hire_date:
        typeof employeeData.hireDate === "string"
          ? employeeData.hireDate
          : employeeData.hireDate.toISOString().split("T")[0],
      status: employeeData.status,
      user_id: employeeData.userId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error("[Auto-Sync] Failed to insert employee:", error.message)
      return { success: false, error: error.message }
    }

    console.log("[Auto-Sync] Employee inserted directly:", employeeData.email)

    await logAuditWithCurrentUser({
      action: "employee_created",
      entityType: "employee",
      entityId: id,
      metadata: {
        employeeName: `${employeeData.firstName} ${employeeData.lastName}`,
        email: employeeData.email,
        department: employeeData.department,
        position: employeeData.position,
      },
    })

    return { success: true, id }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error("[Auto-Sync] Error inserting employee:", errorMsg)
    return { success: false, error: errorMsg }
  }
}

// Auto-delete employee from Supabase
export async function deleteEmployeeFromSupabase(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()

    const { data: employee } = await supabase
      .from("employees")
      .select("id, first_name, last_name")
      .eq("email", email)
      .maybeSingle()

    const { error } = await supabase.from("employees").delete().eq("email", email)

    if (error) {
      console.error("[Auto-Sync] Failed to delete employee:", error.message)
      return { success: false, error: error.message }
    }
    console.log("[Auto-Sync] Employee deleted:", email)

    await logAuditWithCurrentUser({
      action: "employee_deleted",
      entityType: "employee",
      entityId: employee?.id || null,
      metadata: {
        employeeName: employee ? `${employee.first_name} ${employee.last_name}` : email,
        email,
      },
    })

    return { success: true }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error("[Auto-Sync] Error deleting employee:", errorMsg)
    return { success: false, error: errorMsg }
  }
}

// Auto-sync a single payslip to Supabase
export async function syncPayslipToSupabase(
  payslip: PayrollItem,
  employeeEmail: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()

    // First, get the employee's Supabase UUID by email
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("id, first_name, last_name")
      .eq("email", employeeEmail)
      .maybeSingle()

    if (empError) {
      console.error("[Auto-Sync] Error finding employee:", empError.message)
      return { success: false, error: empError.message }
    }

    if (!employee) {
      console.error("[Auto-Sync] Employee not found for payslip:", employeeEmail)
      return { success: false, error: `Employee not found: ${employeeEmail}` }
    }

    const formatDate = (date: Date | string | undefined): string => {
      if (!date) return new Date().toISOString().split("T")[0]
      if (typeof date === "string") return date.split("T")[0]
      return date.toISOString().split("T")[0]
    }

    const payPeriodStartStr = formatDate(payslip.payPeriodStart)
    const payPeriodEndStr = formatDate(payslip.payPeriodEnd)
    const payDateStr = formatDate(payslip.payDate)

    // Check if payslip exists by employee_id and pay period
    const { data: existing } = await supabase
      .from("payslips")
      .select("id")
      .eq("employee_id", employee.id)
      .eq("pay_period_start", payPeriodStartStr)
      .eq("pay_period_end", payPeriodEndStr)
      .maybeSingle()

    const payslipData = {
      employee_id: employee.id,
      pay_period_start: payPeriodStartStr,
      pay_period_end: payPeriodEndStr,
      pay_date: payDateStr,
      gross_pay: payslip.grossPay,
      total_deductions: payslip.totalDeductions,
      net_pay: payslip.netPay,
      status: payslip.status,
      email_sent: payslip.emailSent || false,
      email_sent_at: payslip.emailSentAt ? new Date(payslip.emailSentAt).toISOString() : null,
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      // Update existing
      const { error } = await supabase.from("payslips").update(payslipData).eq("id", existing.id)

      if (error) {
        console.error("[Auto-Sync] Failed to update payslip:", error.message)
        return { success: false, error: error.message }
      }
      console.log("[Auto-Sync] Payslip updated for:", employeeEmail)

      await logAuditWithCurrentUser({
        action: "payslip_synced",
        entityType: "payroll",
        entityId: existing.id,
        metadata: {
          employeeName: `${employee.first_name} ${employee.last_name}`,
          email: employeeEmail,
          payPeriod: `${payPeriodStartStr} - ${payPeriodEndStr}`,
          netPay: payslip.netPay,
          operation: "update",
        },
      })

      return { success: true }
    } else {
      // Insert new
      const newId = crypto.randomUUID()
      const { error } = await supabase.from("payslips").insert({
        id: newId,
        ...payslipData,
        created_at: new Date().toISOString(),
      })

      if (error) {
        console.error("[Auto-Sync] Failed to create payslip:", error.message)
        return { success: false, error: error.message }
      }
      console.log("[Auto-Sync] Payslip created for:", employeeEmail)

      await logAuditWithCurrentUser({
        action: "payslip_synced",
        entityType: "payroll",
        entityId: newId,
        metadata: {
          employeeName: `${employee.first_name} ${employee.last_name}`,
          email: employeeEmail,
          payPeriod: `${payPeriodStartStr} - ${payPeriodEndStr}`,
          netPay: payslip.netPay,
          operation: "insert",
        },
      })

      return { success: true }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error("[Auto-Sync] Error syncing payslip:", errorMsg)
    return { success: false, error: errorMsg }
  }
}

// Auto-delete payslip from Supabase
export async function deletePayslipFromSupabase(payslipId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()

    // Only delete if it's a valid UUID (already synced to Supabase)
    if (isValidUUID(payslipId)) {
      const { data: payslip } = await supabase
        .from("payslips")
        .select("id, employee_id, pay_period_start, pay_period_end, net_pay, employees(first_name, last_name, email)")
        .eq("id", payslipId)
        .maybeSingle()

      const { error } = await supabase.from("payslips").delete().eq("id", payslipId)

      if (error) {
        console.error("[Auto-Sync] Failed to delete payslip:", error.message)
        return { success: false, error: error.message }
      }
      console.log("[Auto-Sync] Payslip deleted:", payslipId)

      const emp = payslip?.employees as { first_name: string; last_name: string; email: string } | null
      await logAuditWithCurrentUser({
        action: "payslip_deleted",
        entityType: "payroll",
        entityId: payslipId,
        metadata: {
          employeeName: emp ? `${emp.first_name} ${emp.last_name}` : "Unknown",
          email: emp?.email || "Unknown",
          payPeriod: payslip ? `${payslip.pay_period_start} - ${payslip.pay_period_end}` : "Unknown",
          netPay: payslip?.net_pay,
        },
      })

      return { success: true }
    }
    return { success: true } // Not synced yet, nothing to delete
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error("[Auto-Sync] Error deleting payslip:", errorMsg)
    return { success: false, error: errorMsg }
  }
}

// Bulk sync all employees (for initial sync)
export async function bulkSyncEmployeesToSupabase(employees: Employee[]) {
  console.log("[Auto-Sync] Starting bulk sync for", employees.length, "employees")
  const results = { synced: 0, failed: 0, errors: [] as string[] }

  if (!employees || employees.length === 0) {
    console.log("[Auto-Sync] No employees to sync")
    return results
  }

  for (const employee of employees) {
    console.log("[Auto-Sync] Syncing employee:", employee.email, employee.firstName, employee.lastName)
    const result = await syncEmployeeToSupabase(employee)
    if (result.success) {
      results.synced++
      console.log("[Auto-Sync] Successfully synced:", employee.email)
    } else {
      results.failed++
      results.errors.push(`${employee.email}: ${result.error}`)
      console.error("[Auto-Sync] Failed to sync:", employee.email, result.error)
    }
  }

  console.log("[Auto-Sync] Bulk sync complete:", results)

  await logAuditWithCurrentUser({
    action: "employees_bulk_synced",
    entityType: "employee",
    metadata: {
      totalProcessed: employees.length,
      synced: results.synced,
      failed: results.failed,
    },
  })

  return results
}
