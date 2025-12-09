"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import type { SalaryAdjustment } from "@/lib/types"
import { logAuditWithCurrentUser } from "@/lib/audit-logger"

// Database row type
interface SalaryAdjustmentRow {
  id: string
  employee_id: string
  type: string
  amount: number
  reason: string
  effective_date: string
  status: string
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

// Map database row to SalaryAdjustment type
function mapRowToSalaryAdjustment(row: SalaryAdjustmentRow): SalaryAdjustment {
  return {
    id: row.id,
    employeeId: row.employee_id,
    type: row.type as SalaryAdjustment["type"],
    amount: row.amount,
    reason: row.reason,
    effectiveDate: new Date(row.effective_date),
    status: row.status as SalaryAdjustment["status"],
    approvedBy: row.approved_by || undefined,
    approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export async function getAllSalaryAdjustments(): Promise<{
  success: boolean
  data?: SalaryAdjustment[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    console.log("[v0] getAllSalaryAdjustments: Fetching from Supabase...")

    const { data, error } = await supabase
      .from("salary_adjustments")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching salary adjustments:", error.message, error.code)
      // If table doesn't exist, return empty array instead of error
      if (error.code === "42P01" || error.message.includes("does not exist")) {
        console.log("[v0] salary_adjustments table does not exist - returning empty array")
        return { success: true, data: [] }
      }
      return { success: false, error: error.message }
    }

    const adjustments = (data || []).map(mapRowToSalaryAdjustment)
    console.log("[v0] getAllSalaryAdjustments: Found", adjustments.length, "adjustments")
    return { success: true, data: adjustments }
  } catch (error) {
    console.error("[v0] Error in getAllSalaryAdjustments:", error)
    return { success: false, error: "Failed to fetch salary adjustments" }
  }
}

export async function createSalaryAdjustment(
  adjustment: Omit<SalaryAdjustment, "id" | "createdAt" | "updatedAt" | "approvedBy" | "approvedAt">,
): Promise<{ success: boolean; data?: SalaryAdjustment; error?: string }> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    console.log("[v0] createSalaryAdjustment: Creating adjustment for employee:", adjustment.employeeId)

    const { data: employee } = await adminClient
      .from("employees")
      .select("first_name, last_name, email, monthly_salary")
      .eq("id", adjustment.employeeId)
      .single()

    const { data, error } = await supabase
      .from("salary_adjustments")
      .insert({
        employee_id: adjustment.employeeId,
        type: adjustment.type,
        amount: adjustment.amount,
        reason: adjustment.reason,
        effective_date:
          adjustment.effectiveDate instanceof Date
            ? adjustment.effectiveDate.toISOString().split("T")[0]
            : adjustment.effectiveDate,
        status: adjustment.status || "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating salary adjustment:", error.message, error.code)
      return { success: false, error: error.message }
    }

    await logAuditWithCurrentUser({
      action: "salary_adjustment_created",
      entityType: "salary",
      entityId: data.id,
      metadata: {
        employeeName: employee ? `${employee.first_name} ${employee.last_name}` : null,
        employeeEmail: employee?.email,
        currentSalary: employee?.monthly_salary,
        adjustmentType: adjustment.type,
        adjustmentAmount: adjustment.amount,
        reason: adjustment.reason,
        effectiveDate: adjustment.effectiveDate,
      },
    })

    console.log("[v0] createSalaryAdjustment: Created successfully with id:", data.id)
    revalidatePath("/admin/salary")
    revalidatePath("/admin/employees")
    return { success: true, data: mapRowToSalaryAdjustment(data) }
  } catch (error) {
    console.error("[v0] Error in createSalaryAdjustment:", error)
    return { success: false, error: "Failed to create salary adjustment" }
  }
}

export async function updateSalaryAdjustment(
  id: string,
  updates: Partial<Omit<SalaryAdjustment, "id" | "createdAt" | "updatedAt">>,
): Promise<{ success: boolean; data?: SalaryAdjustment; error?: string }> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: existing } = await supabase
      .from("salary_adjustments")
      .select("*, employees:employee_id(first_name, last_name, email)")
      .eq("id", id)
      .single()

    const updateData: Record<string, unknown> = {}
    if (updates.employeeId) updateData.employee_id = updates.employeeId
    if (updates.type) updateData.type = updates.type
    if (updates.amount !== undefined) updateData.amount = updates.amount
    if (updates.reason) updateData.reason = updates.reason
    if (updates.effectiveDate) {
      updateData.effective_date =
        updates.effectiveDate instanceof Date
          ? updates.effectiveDate.toISOString().split("T")[0]
          : updates.effectiveDate
    }
    if (updates.status) updateData.status = updates.status
    if (updates.approvedBy) updateData.approved_by = updates.approvedBy
    if (updates.approvedAt) {
      updateData.approved_at =
        updates.approvedAt instanceof Date ? updates.approvedAt.toISOString() : updates.approvedAt
    }

    const { data, error } = await supabase.from("salary_adjustments").update(updateData).eq("id", id).select().single()

    if (error) {
      console.error("Error updating salary adjustment:", error)
      return { success: false, error: error.message }
    }

    const employee = existing?.employees as { first_name: string; last_name: string; email: string } | null
    await logAuditWithCurrentUser({
      action: "salary_adjustment_updated",
      entityType: "salary",
      entityId: id,
      metadata: {
        employeeName: employee ? `${employee.first_name} ${employee.last_name}` : null,
        changes: updates,
        previousAmount: existing?.amount,
        newAmount: updates.amount ?? existing?.amount,
      },
    })

    revalidatePath("/admin/salary")
    revalidatePath("/admin/employees")
    return { success: true, data: mapRowToSalaryAdjustment(data) }
  } catch (error) {
    console.error("Error in updateSalaryAdjustment:", error)
    return { success: false, error: "Failed to update salary adjustment" }
  }
}

export async function approveSalaryAdjustment(
  id: string,
): Promise<{ success: boolean; data?: SalaryAdjustment; error?: string }> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    let approvedById: string | null = null
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle()
      approvedById = profile ? user.id : null
    }

    const { data: adjustmentData } = await adminClient
      .from("salary_adjustments")
      .select("*, employees:employee_id(id, first_name, last_name, email, monthly_salary)")
      .eq("id", id)
      .single()

    const { data, error } = await supabase
      .from("salary_adjustments")
      .update({
        status: "approved",
        approved_by: approvedById,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error approving salary adjustment:", error)
      return { success: false, error: error.message }
    }

    const employee = adjustmentData?.employees as {
      id: string
      first_name: string
      last_name: string
      email: string
      monthly_salary: number
    } | null
    if (employee && adjustmentData) {
      const currentSalary = employee.monthly_salary || 0
      let newSalary = currentSalary

      if (adjustmentData.type === "raise" || adjustmentData.type === "bonus") {
        newSalary = currentSalary + adjustmentData.amount
      } else if (adjustmentData.type === "deduction") {
        newSalary = Math.max(0, currentSalary - adjustmentData.amount)
      } else if (adjustmentData.type === "adjustment") {
        // For general adjustments, check if amount is positive or negative
        newSalary = currentSalary + adjustmentData.amount
      }

      // Update the employee's monthly salary
      const { error: updateError } = await adminClient
        .from("employees")
        .update({
          monthly_salary: newSalary,
          updated_at: new Date().toISOString(),
        })
        .eq("id", employee.id)

      if (updateError) {
        console.error("[v0] Error updating employee salary:", updateError)
      } else {
        console.log(
          `[v0] Updated employee ${employee.first_name} ${employee.last_name} salary from ${currentSalary} to ${newSalary}`,
        )
      }
    }

    await logAuditWithCurrentUser({
      action: "salary_adjustment_approved",
      entityType: "salary",
      entityId: id,
      metadata: {
        employeeName: employee ? `${employee.first_name} ${employee.last_name}` : null,
        employeeEmail: employee?.email,
        adjustmentType: adjustmentData?.type,
        adjustmentAmount: adjustmentData?.amount,
        previousSalary: employee?.monthly_salary,
        newSalary: employee ? employee.monthly_salary + (adjustmentData?.amount || 0) : null,
      },
    })

    revalidatePath("/admin/salary")
    revalidatePath("/admin/employees")
    revalidatePath("/admin")
    return { success: true, data: mapRowToSalaryAdjustment(data) }
  } catch (error) {
    console.error("Error in approveSalaryAdjustment:", error)
    return { success: false, error: "Failed to approve salary adjustment" }
  }
}

export async function rejectSalaryAdjustment(
  id: string,
): Promise<{ success: boolean; data?: SalaryAdjustment; error?: string }> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: adjustmentData } = await adminClient
      .from("salary_adjustments")
      .select("*, employees:employee_id(first_name, last_name, email)")
      .eq("id", id)
      .single()

    const { data, error } = await supabase
      .from("salary_adjustments")
      .update({ status: "rejected" })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error rejecting salary adjustment:", error)
      return { success: false, error: error.message }
    }

    const employee = adjustmentData?.employees as { first_name: string; last_name: string; email: string } | null
    await logAuditWithCurrentUser({
      action: "salary_adjustment_rejected",
      entityType: "salary",
      entityId: id,
      metadata: {
        employeeName: employee ? `${employee.first_name} ${employee.last_name}` : null,
        employeeEmail: employee?.email,
        adjustmentType: adjustmentData?.type,
        adjustmentAmount: adjustmentData?.amount,
        reason: adjustmentData?.reason,
      },
    })

    revalidatePath("/admin/salary")
    revalidatePath("/admin/employees")
    return { success: true, data: mapRowToSalaryAdjustment(data) }
  } catch (error) {
    console.error("Error in rejectSalaryAdjustment:", error)
    return { success: false, error: "Failed to reject salary adjustment" }
  }
}

export async function deleteSalaryAdjustment(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const { data: adjustmentData } = await adminClient
      .from("salary_adjustments")
      .select("*, employees:employee_id(first_name, last_name, email)")
      .eq("id", id)
      .single()

    const { error } = await supabase.from("salary_adjustments").delete().eq("id", id)

    if (error) {
      console.error("Error deleting salary adjustment:", error)
      return { success: false, error: error.message }
    }

    const employee = adjustmentData?.employees as { first_name: string; last_name: string; email: string } | null
    await logAuditWithCurrentUser({
      action: "salary_adjustment_deleted",
      entityType: "salary",
      entityId: id,
      metadata: {
        employeeName: employee ? `${employee.first_name} ${employee.last_name}` : null,
        employeeEmail: employee?.email,
        adjustmentType: adjustmentData?.type,
        adjustmentAmount: adjustmentData?.amount,
        status: adjustmentData?.status,
      },
    })

    revalidatePath("/admin/salary")
    revalidatePath("/admin/employees")
    return { success: true }
  } catch (error) {
    console.error("Error in deleteSalaryAdjustment:", error)
    return { success: false, error: "Failed to delete salary adjustment" }
  }
}
