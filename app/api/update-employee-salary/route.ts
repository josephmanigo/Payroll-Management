import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { employeeId, newSalary, previousSalary } = await request.json()

    if (!employeeId || newSalary === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Update employee's monthly salary
    const { error: updateError } = await supabase
      .from("employees")
      .update({
        monthly_salary: newSalary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", employeeId)

    if (updateError) {
      console.error("[v0] Error updating employee salary:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Create a salary adjustment record for audit trail
    const { error: adjustmentError } = await supabase.from("salary_adjustments").insert({
      employee_id: employeeId,
      type: newSalary > previousSalary ? "increase" : "decrease",
      amount: Math.abs(newSalary - previousSalary),
      reason: "Salary adjusted via payroll processing",
      effective_date: new Date().toISOString().split("T")[0],
      status: "approved",
      approved_at: new Date().toISOString(),
    })

    if (adjustmentError) {
      // Log but don't fail - the main update succeeded
      console.error("[v0] Error creating salary adjustment record:", adjustmentError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in update-employee-salary:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
