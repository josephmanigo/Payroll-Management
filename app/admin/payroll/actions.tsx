"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit-logger"
import { calculateAllDeductions } from "@/lib/deduction-calculator"

async function getAdminUserInfo() {
  try {
    const serverSupabase = await createClient()
    const {
      data: { user },
    } = await serverSupabase.auth.getUser()

    let adminName = "System"
    let adminRole: "admin" | "hr" | "employee" = "admin"
    let adminEmail: string | null = null

    if (user) {
      adminEmail = user.email || null
      const { data: adminProfile } = await serverSupabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .maybeSingle()
      adminName = adminProfile?.full_name || user.email?.split("@")[0] || "Admin"
      adminRole = (adminProfile?.role as "admin" | "hr" | "employee") || "admin"
    }

    return { user, adminName, adminRole, adminEmail }
  } catch (error) {
    console.error("[v0] Error getting admin user info:", error)
    // Return fallback values so operations can still proceed
    return { user: null, adminName: "Admin", adminRole: "admin" as const, adminEmail: null }
  }
}

export async function deletePayroll(payrollId: string) {
  const supabase = createAdminClient()
  const { user, adminName, adminRole, adminEmail } = await getAdminUserInfo()

  // Get payslip info before deleting
  const { data: payslip } = await supabase
    .from("payslips")
    .select("employee_id, pay_period_start, pay_period_end, net_pay")
    .eq("id", payrollId)
    .single()

  const { error } = await supabase.from("payslips").delete().eq("id", payrollId)

  if (error) {
    console.error("[v0] Error deleting payroll:", error)
    return { success: false, error: error.message }
  }

  await logAudit({
    userId: user?.id || null,
    userName: adminName,
    userEmail: adminEmail,
    userRole: adminRole,
    action: "payroll_deleted",
    entityType: "payroll",
    entityId: payrollId,
    metadata: {
      payPeriodStart: payslip?.pay_period_start,
      payPeriodEnd: payslip?.pay_period_end,
      netPay: payslip?.net_pay,
    },
  })

  revalidatePath("/admin/payroll")
  revalidatePath("/admin/payslips")
  revalidatePath("/employee")

  return { success: true }
}

export async function deletePayslipsByPeriod(payPeriodStart: string, payPeriodEnd: string) {
  const supabase = createAdminClient()
  const { user, adminName, adminRole, adminEmail } = await getAdminUserInfo()

  const { data, error } = await supabase
    .from("payslips")
    .delete()
    .eq("pay_period_start", payPeriodStart)
    .eq("pay_period_end", payPeriodEnd)
    .select()

  if (error) {
    console.error("[v0] Error deleting payslips by period:", error)
    return { success: false, error: error.message, count: 0 }
  }

  await logAudit({
    userId: user?.id || null,
    userName: adminName,
    userEmail: adminEmail,
    userRole: adminRole,
    action: "payslips_bulk_deleted",
    entityType: "payroll",
    entityId: `${payPeriodStart}_${payPeriodEnd}`,
    metadata: {
      payPeriodStart,
      payPeriodEnd,
      deletedCount: data?.length || 0,
    },
  })

  revalidatePath("/admin/payroll")
  revalidatePath("/admin/payslips")
  revalidatePath("/employee")

  return { success: true, count: data?.length || 0 }
}

export async function deleteAllPayslips() {
  const supabase = createAdminClient()
  const { user, adminName, adminRole, adminEmail } = await getAdminUserInfo()

  const { data, error } = await supabase
    .from("payslips")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000")
    .select()

  if (error) {
    console.error("[v0] Error deleting all payslips:", error)
    return { success: false, error: error.message, count: 0 }
  }

  await logAudit({
    userId: user?.id || null,
    userName: adminName,
    userEmail: adminEmail,
    userRole: adminRole,
    action: "payslips_all_deleted",
    entityType: "payroll",
    entityId: "all",
    metadata: {
      deletedCount: data?.length || 0,
    },
  })

  revalidatePath("/admin/payroll")
  revalidatePath("/admin/payslips")
  revalidatePath("/employee")

  return { success: true, count: data?.length || 0 }
}

export async function sendPayslipEmail(data: {
  employeeEmail: string
  employeeName: string
  payPeriod: string
  grossPay: number
  netPay: number
  totalDeductions: number
  basicPay?: number
  overtimePay?: number
  allowances?: number
  sssContribution?: number
  philHealthContribution?: number
  pagIbigContribution?: number
  withholdingTax?: number
  payslipId?: string
}) {
  const { user, adminName, adminRole, adminEmail } = await getAdminUserInfo()

  console.log(`[v0] Sending payslip email to ${data.employeeEmail}`)

  const brevoApiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.SMTP_USER || process.env.BREVO_FROM_EMAIL

  if (!brevoApiKey) {
    console.error("[v0] BREVO_API_KEY not configured")
    return { success: false, error: "Email service not configured. Please add BREVO_API_KEY." }
  }

  if (!senderEmail) {
    console.error("[v0] SMTP_USER or BREVO_FROM_EMAIL not configured")
    return { success: false, error: "Sender email not configured. Please add SMTP_USER or BREVO_FROM_EMAIL." }
  }

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount)
  }

  const sss = data.sssContribution || 0
  const philHealth = data.philHealthContribution || 0
  const pagIbig = data.pagIbigContribution || 0
  const tax = data.withholdingTax || 0
  const calculatedTotalDeductions = sss + philHealth + pagIbig + tax
  const calculatedNetPay = data.grossPay - calculatedTotalDeductions

  // Build the HTML email content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Payslip</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 12px 12px 0 0; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Payroll Management</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your Payslip is Ready</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
            Hello <strong>${data.employeeName}</strong>,
          </p>
          
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 25px;">
            Your payslip for <strong>${data.payPeriod}</strong> is now available. Here's a summary:
          </p>
          
          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Earnings</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Basic Pay</td>
                <td style="padding: 8px 0; color: #374151; font-size: 14px; text-align: right; font-weight: 500;">${formatCurrency(data.basicPay || 0)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Overtime Pay</td>
                <td style="padding: 8px 0; color: #374151; font-size: 14px; text-align: right; font-weight: 500;">${formatCurrency(data.overtimePay || 0)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Allowances</td>
                <td style="padding: 8px 0; color: #374151; font-size: 14px; text-align: right; font-weight: 500;">${formatCurrency(data.allowances || 0)}</td>
              </tr>
              <tr style="border-top: 1px solid #e5e7eb;">
                <td style="padding: 12px 0 8px 0; color: #374151; font-size: 14px; font-weight: 600;">Gross Pay</td>
                <td style="padding: 12px 0 8px 0; color: #059669; font-size: 16px; text-align: right; font-weight: 700;">${formatCurrency(data.grossPay)}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #fef2f2; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 16px; border-bottom: 1px solid #fecaca; padding-bottom: 10px;">Deductions</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">SSS</td>
                <td style="padding: 8px 0; color: #dc2626; font-size: 14px; text-align: right; font-weight: 500;">-${formatCurrency(sss)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">PhilHealth</td>
                <td style="padding: 8px 0; color: #dc2626; font-size: 14px; text-align: right; font-weight: 500;">-${formatCurrency(philHealth)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Pag-IBIG</td>
                <td style="padding: 8px 0; color: #dc2626; font-size: 14px; text-align: right; font-weight: 500;">-${formatCurrency(pagIbig)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Withholding Tax</td>
                <td style="padding: 8px 0; color: #dc2626; font-size: 14px; text-align: right; font-weight: 500;">-${formatCurrency(tax)}</td>
              </tr>
              <tr style="border-top: 1px solid #fecaca;">
                <td style="padding: 12px 0 8px 0; color: #374151; font-size: 14px; font-weight: 600;">Total Deductions</td>
                <td style="padding: 12px 0 8px 0; color: #dc2626; font-size: 16px; text-align: right; font-weight: 700;">-${formatCurrency(calculatedTotalDeductions)}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 8px; padding: 25px; text-align: center;">
            <p style="color: rgba(255,255,255,0.9); margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Net Pay</p>
            <p style="color: white; margin: 0; font-size: 32px; font-weight: 700;">${formatCurrency(calculatedNetPay)}</p>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            This is an automated email from Payroll Management System.<br>
            Please contact HR if you have any questions about your payslip.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          email: senderEmail,
          name: "Payroll Management",
        },
        to: [{ email: data.employeeEmail.trim().toLowerCase(), name: data.employeeName }],
        subject: `Your Payslip for ${data.payPeriod}`,
        htmlContent: htmlContent,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error("[v0] Brevo API error:", result)
      return {
        success: false,
        error: result.message || `Failed to send email (${response.status})`,
      }
    }

    console.log(`[v0] Payslip email sent successfully to ${data.employeeEmail}, messageId: ${result.messageId}`)

    // Update the payslip email_sent status in database if payslipId is provided
    if (data.payslipId) {
      const supabase = createAdminClient()
      const { error: updateError } = await supabase
        .from("payslips")
        .update({ email_sent: true, updated_at: new Date().toISOString() })
        .eq("id", data.payslipId)

      if (updateError) {
        console.error("[v0] Failed to update email_sent status:", updateError)
      }
    }

    // Log the audit
    await logAudit({
      userId: user?.id || null,
      userName: user?.email?.split("@")[0] || "Admin",
      userEmail: user?.email || null,
      userRole: "admin",
      action: "payslip_sent",
      entityType: "payslip",
      entityId: data.payslipId || data.employeeEmail,
      metadata: {
        employeeName: data.employeeName,
        employeeEmail: data.employeeEmail,
        payPeriod: data.payPeriod,
        netPay: calculatedNetPay,
        grossPay: data.grossPay,
        messageId: result.messageId,
      },
    })

    revalidatePath("/admin/payroll")
    revalidatePath("/admin/payslips")
    revalidatePath("/employee")

    return { success: true }
  } catch (error) {
    console.error("[v0] Error sending payslip email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    }
  }
}

export async function sendPayslipToSelf(data: {
  employeeEmail: string
  employeeName: string
  payPeriod: string
  grossPay: number
  netPay: number
  totalDeductions: number
  basicPay?: number
  overtimePay?: number
  allowances?: number
  sssContribution?: number
  philHealthContribution?: number
  pagIbigContribution?: number
  withholdingTax?: number
  payslipId?: string
}) {
  const serverSupabase = await createClient()
  const {
    data: { user },
  } = await serverSupabase.auth.getUser()

  console.log(`[v0] Sending payslip to self: ${data.employeeEmail}`)

  const brevoApiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.SMTP_USER || process.env.BREVO_FROM_EMAIL

  if (!brevoApiKey) {
    console.error("[v0] BREVO_API_KEY not configured")
    return { success: false, error: "Email service not configured. Please add BREVO_API_KEY." }
  }

  if (!senderEmail) {
    console.error("[v0] SMTP_USER or BREVO_FROM_EMAIL not configured")
    return { success: false, error: "Sender email not configured. Please add SMTP_USER or BREVO_FROM_EMAIL." }
  }

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount)
  }

  const totalDeductions = data.totalDeductions || 0
  const grossPay = data.grossPay || 0
  const netPay = grossPay - totalDeductions

  // Build the HTML email content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Payslip</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 12px 12px 0 0; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Payroll Management</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your Payslip is Ready</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
            Hello <strong>${data.employeeName}</strong>,
          </p>
          
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 25px;">
            Your payslip for <strong>${data.payPeriod}</strong> is now available. Here's a summary:
          </p>
          
          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Earnings</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Basic Pay</td>
                <td style="padding: 8px 0; color: #374151; font-size: 14px; text-align: right; font-weight: 500;">${formatCurrency(data.basicPay || grossPay)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Overtime Pay</td>
                <td style="padding: 8px 0; color: #374151; font-size: 14px; text-align: right; font-weight: 500;">${formatCurrency(data.overtimePay || 0)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Allowances</td>
                <td style="padding: 8px 0; color: #374151; font-size: 14px; text-align: right; font-weight: 500;">${formatCurrency(data.allowances || 0)}</td>
              </tr>
              <tr style="border-top: 1px solid #e5e7eb;">
                <td style="padding: 12px 0 8px 0; color: #374151; font-size: 14px; font-weight: 600;">Gross Pay</td>
                <td style="padding: 12px 0 8px 0; color: #059669; font-size: 16px; text-align: right; font-weight: 700;">${formatCurrency(grossPay)}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #fef2f2; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 16px; border-bottom: 1px solid #fecaca; padding-bottom: 10px;">Deductions</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-top: 1px solid #fecaca;">
                <td style="padding: 12px 0 8px 0; color: #374151; font-size: 14px; font-weight: 600;">Total Deductions</td>
                <td style="padding: 12px 0 8px 0; color: #dc2626; font-size: 16px; text-align: right; font-weight: 700;">-${formatCurrency(totalDeductions)}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 8px; padding: 25px; text-align: center;">
            <p style="color: rgba(255,255,255,0.9); margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Net Pay</p>
            <p style="color: white; margin: 0; font-size: 32px; font-weight: 700;">${formatCurrency(netPay)}</p>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            This is an automated email from Payroll Management System.<br>
            Please contact HR if you have any questions about your payslip.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          email: senderEmail,
          name: "Payroll Management",
        },
        to: [{ email: data.employeeEmail.trim().toLowerCase(), name: data.employeeName }],
        subject: `Your Payslip for ${data.payPeriod}`,
        htmlContent: htmlContent,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error("[v0] Brevo API error:", result)
      return {
        success: false,
        error: result.message || `Failed to send email (${response.status})`,
      }
    }

    console.log(`[v0] Payslip email sent successfully to ${data.employeeEmail}, messageId: ${result.messageId}`)

    // Update the payslip email_sent status in database if payslipId is provided
    if (data.payslipId) {
      const supabase = createAdminClient()
      const { error: updateError } = await supabase
        .from("payslips")
        .update({ email_sent: true, email_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", data.payslipId)

      if (updateError) {
        console.error("[v0] Failed to update email_sent status:", updateError)
      }
    }

    // Log the audit
    await logAudit({
      userId: user?.id || null,
      userName: data.employeeName,
      userEmail: data.employeeEmail,
      userRole: "employee",
      action: "payslip_emailed",
      entityType: "payroll",
      entityId: data.payslipId || data.employeeEmail,
      metadata: {
        payPeriod: data.payPeriod,
        netPay: netPay,
        grossPay: grossPay,
        messageId: result.messageId,
        selfSent: true,
      },
    })

    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error("[v0] Error sending payslip email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    }
  }
}

export async function createPayroll(data: {
  payPeriodStart: string
  payPeriodEnd: string
  payDate: string
  employeeIds: string[]
}) {
  const supabase = createAdminClient()
  const { user, adminName, adminRole, adminEmail } = await getAdminUserInfo()

  // Get employees for the payroll
  const { data: employees, error: empError } = await supabase.from("employees").select("*").in("id", data.employeeIds)

  if (empError) {
    console.error("[v0] Error fetching employees for payroll:", empError)
    return { success: false, error: empError.message }
  }

  if (!employees || employees.length === 0) {
    return { success: false, error: "No employees found for payroll" }
  }

  // Create payslips for each employee with proper calculations
  const payslips = employees.map((emp) => {
    const monthlySalary = emp.monthly_salary || 0
    // Semi-monthly basic pay
    const basicPay = monthlySalary / 2

    // Calculate deductions using Philippine tax rates
    // SSS (based on monthly salary, divided by 2 for semi-monthly)
    const sssMonthly = Math.min(Math.max(monthlySalary * 0.045, 180), 1350)
    const sss = sssMonthly / 2

    // PhilHealth (5% of monthly salary, split between employee and employer, divided by 2)
    const philHealthMonthly = Math.min(monthlySalary * 0.025, 2500)
    const philHealth = philHealthMonthly / 2

    // Pag-IBIG (2% of monthly salary capped at 100, divided by 2)
    const pagIbigMonthly = Math.min(monthlySalary * 0.02, 100)
    const pagIbig = pagIbigMonthly / 2

    // Withholding tax calculation (simplified)
    const taxableIncome = basicPay - sss - philHealth - pagIbig
    let withholdingTax = 0
    if (taxableIncome > 20833) {
      if (taxableIncome <= 33332) {
        withholdingTax = (taxableIncome - 20833) * 0.15
      } else if (taxableIncome <= 66666) {
        withholdingTax = 1875 + (taxableIncome - 33332) * 0.2
      } else if (taxableIncome <= 166666) {
        withholdingTax = 8541.8 + (taxableIncome - 66666) * 0.25
      } else if (taxableIncome <= 666666) {
        withholdingTax = 33541.8 + (taxableIncome - 166666) * 0.3
      } else {
        withholdingTax = 183541.8 + (taxableIncome - 666666) * 0.35
      }
    }

    const totalDeductions = sss + philHealth + pagIbig + withholdingTax
    const netPay = basicPay - totalDeductions

    return {
      employee_id: emp.id,
      pay_period_start: data.payPeriodStart,
      pay_period_end: data.payPeriodEnd,
      pay_date: data.payDate,
      gross_pay: basicPay,
      total_deductions: totalDeductions,
      net_pay: netPay,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  })

  const { data: result, error } = await supabase.from("payslips").insert(payslips).select()

  if (error) {
    console.error("[v0] Error creating payroll:", error)
    return { success: false, error: error.message }
  }

  await logAudit({
    userId: user?.id || null,
    userName: adminName,
    userEmail: adminEmail,
    userRole: adminRole,
    action: "payroll_created",
    entityType: "payroll",
    entityId: `${data.payPeriodStart}_${data.payPeriodEnd}`,
    metadata: {
      payPeriodStart: data.payPeriodStart,
      payPeriodEnd: data.payPeriodEnd,
      payDate: data.payDate,
      employeeCount: data.employeeIds.length,
      totalGross: payslips.reduce((sum, p) => sum + p.gross_pay, 0),
      totalNet: payslips.reduce((sum, p) => sum + p.net_pay, 0),
    },
  })

  revalidatePath("/admin/payroll")
  revalidatePath("/admin/payslips")
  revalidatePath("/employee")

  return { success: true, count: result?.length || 0 }
}

export async function deletePayrollByPeriod(payPeriodStart: string, payPeriodEnd: string) {
  const supabase = createAdminClient()
  const { user, adminName, adminRole, adminEmail } = await getAdminUserInfo()

  console.log("[v0] deletePayrollByPeriod called with:", { payPeriodStart, payPeriodEnd })

  // Get count before deleting for audit
  const { data: payslips, error: countError } = await supabase
    .from("payslips")
    .select("id, employee_id, net_pay")
    .eq("pay_period_start", payPeriodStart)
    .eq("pay_period_end", payPeriodEnd)

  console.log("[v0] Found payslips to delete:", payslips?.length || 0, "error:", countError?.message)

  if (countError) {
    console.error("[v0] Error counting payslips:", countError)
    return { success: false, error: countError.message }
  }

  if (!payslips || payslips.length === 0) {
    console.log("[v0] No payslips found for period")
    return { success: false, error: "No payslips found for this period." }
  }

  const count = payslips.length
  const totalNetPay = payslips.reduce((sum, p) => sum + (p.net_pay || 0), 0)

  // Delete all payslips for this period
  const { error } = await supabase
    .from("payslips")
    .delete()
    .eq("pay_period_start", payPeriodStart)
    .eq("pay_period_end", payPeriodEnd)

  if (error) {
    console.error("[v0] Error deleting payroll by period:", error)
    return { success: false, error: error.message }
  }

  console.log("[v0] Successfully deleted", count, "payslips")

  await logAudit({
    userId: user?.id || null,
    userName: adminName,
    userEmail: adminEmail,
    userRole: adminRole,
    action: "payroll_deleted",
    entityType: "payroll",
    entityId: `${payPeriodStart}_${payPeriodEnd}`,
    metadata: {
      payPeriodStart,
      payPeriodEnd,
      deletedCount: count,
      totalNetPay,
    },
  })

  revalidatePath("/admin/payroll")
  revalidatePath("/admin/payslips")
  revalidatePath("/employee")

  return { success: true, count }
}

export async function processPayroll(payPeriodStart: string, payPeriodEnd: string) {
  const supabase = createAdminClient()
  const { user, adminName, adminRole, adminEmail } = await getAdminUserInfo()

  const { data: payslips, error: fetchError } = await supabase
    .from("payslips")
    .select("*")
    .eq("pay_period_start", payPeriodStart)
    .eq("pay_period_end", payPeriodEnd)

  if (fetchError) {
    return { success: false, error: fetchError.message }
  }

  const { error } = await supabase
    .from("payslips")
    .update({
      status: "processed",
      updated_at: new Date().toISOString(),
    })
    .eq("pay_period_start", payPeriodStart)
    .eq("pay_period_end", payPeriodEnd)

  if (error) {
    console.error("[v0] Error processing payroll:", error)
    return { success: false, error: error.message }
  }

  await logAudit({
    userId: user?.id || null,
    userName: adminName,
    userEmail: adminEmail,
    userRole: adminRole,
    action: "payroll_processed",
    entityType: "payroll",
    entityId: `${payPeriodStart}_${payPeriodEnd}`,
    metadata: {
      payPeriodStart,
      payPeriodEnd,
      payslipCount: payslips?.length || 0,
      totalNet: payslips?.reduce((sum, p) => sum + (p.net_pay || 0), 0) || 0,
    },
  })

  revalidatePath("/admin/payroll")
  revalidatePath("/admin/payslips")
  revalidatePath("/employee")

  return { success: true }
}

export async function viewPayslips(filters?: {
  payPeriodStart?: string
  payPeriodEnd?: string
  employeeId?: string
}) {
  const supabase = createAdminClient()
  const { user, adminName, adminRole, adminEmail } = await getAdminUserInfo()

  let query = supabase
    .from("payslips")
    .select(`
      *,
      employees (
        id,
        first_name,
        last_name,
        email,
        department,
        position,
        employee_number
      )
    `)
    .order("pay_date", { ascending: false })

  if (filters?.payPeriodStart) {
    query = query.eq("pay_period_start", filters.payPeriodStart)
  }
  if (filters?.payPeriodEnd) {
    query = query.eq("pay_period_end", filters.payPeriodEnd)
  }
  if (filters?.employeeId) {
    query = query.eq("employee_id", filters.employeeId)
  }

  const { data, error } = await query

  if (error) {
    console.error("[v0] Error fetching payslips:", error)
    return { success: false, error: error.message, data: [] }
  }

  await logAudit({
    userId: user?.id || null,
    userName: adminName,
    userEmail: adminEmail,
    userRole: adminRole,
    action: "payslips_viewed",
    entityType: "payslip",
    metadata: {
      payslipCount: data?.length || 0,
      filters,
    },
  })

  return { success: true, data: data || [] }
}

export async function getAllPayrollRuns() {
  const supabase = createAdminClient()

  console.log("[v0] getAllPayrollRuns: Fetching all payslips from database...")

  const { data: payslips, error } = await supabase
    .from("payslips")
    .select(`
      *,
      employees (
        id,
        first_name,
        last_name,
        email,
        department,
        position,
        employee_number,
        monthly_salary
      )
    `)
    .order("pay_period_start", { ascending: false })

  if (error) {
    console.error("[v0] getAllPayrollRuns error:", error)
    return { success: false, error: error.message, payrollRuns: [], payrollItems: [] }
  }

  console.log("[v0] getAllPayrollRuns: Found", payslips?.length || 0, "payslips")

  // Group payslips by pay period to create payroll runs
  const payrollRunsMap = new Map<
    string,
    {
      payPeriodStart: string
      payPeriodEnd: string
      payDate: string
      payslips: typeof payslips
    }
  >()

  payslips?.forEach((payslip) => {
    const key = `${payslip.pay_period_start}_${payslip.pay_period_end}`
    if (!payrollRunsMap.has(key)) {
      payrollRunsMap.set(key, {
        payPeriodStart: payslip.pay_period_start,
        payPeriodEnd: payslip.pay_period_end,
        payDate: payslip.pay_date,
        payslips: [],
      })
    }
    payrollRunsMap.get(key)!.payslips.push(payslip)
  })

  // Convert payslips to PayrollItem format with calculated deductions FIRST
  const payrollItemsData =
    payslips?.map((p) => {
      const emp = p.employees as any
      const monthlySalary = emp?.monthly_salary || 0
      // Use gross_pay if available, otherwise calculate from monthly salary
      const grossPay = p.gross_pay || monthlySalary / 2 // semi-monthly

      const deductions = calculateAllDeductions(monthlySalary > 0 ? monthlySalary : grossPay * 2)

      return {
        id: p.id,
        payrollRunId: `${p.pay_period_start}_${p.pay_period_end}`,
        employeeId: p.employee_id,
        payPeriodStart: new Date(p.pay_period_start),
        payPeriodEnd: new Date(p.pay_period_end),
        payDate: new Date(p.pay_date),
        basicPay: grossPay,
        overtimePay: 0,
        overtimeHours: 0,
        allowances: 0,
        grossPay: grossPay,
        sssContribution: deductions.sssContribution / 2, // Semi-monthly
        philHealthContribution: deductions.philHealthContribution / 2, // Semi-monthly
        pagIbigContribution: deductions.pagIbigContribution / 2, // Semi-monthly
        withholdingTax: deductions.withholdingTax / 2, // Semi-monthly
        otherDeductions: 0,
        totalDeductions: p.total_deductions || deductions.totalDeductions / 2,
        netPay: p.net_pay || 0,
        status:
          p.status === "paid"
            ? ("finalized" as const)
            : p.status === "processed"
              ? ("approved" as const)
              : ("processed" as const),
        createdAt: new Date(p.created_at),
        updatedAt: new Date(p.updated_at),
        employeeName: emp ? `${emp.first_name} ${emp.last_name}` : "Unknown",
        employeeEmail: emp?.email || "",
        department: emp?.department || "",
        position: emp?.position || "",
        monthlySalary: monthlySalary,
      }
    }) || []

  // Convert to PayrollRun format with aggregated totals
  const payrollRuns = Array.from(payrollRunsMap.entries()).map(([key, data]) => {
    // Get payroll items for this run to calculate totals
    const runItems = payrollItemsData.filter((item) => item.payrollRunId === key)

    const totalGross = runItems.reduce((sum, item) => sum + (item.grossPay || 0), 0)
    const totalDeductions = runItems.reduce((sum, item) => sum + (item.totalDeductions || 0), 0)
    const totalNet = runItems.reduce((sum, item) => sum + (item.netPay || 0), 0)
    const totalSSS = runItems.reduce((sum, item) => sum + (item.sssContribution || 0), 0)
    const totalPhilHealth = runItems.reduce((sum, item) => sum + (item.philHealthContribution || 0), 0)
    const totalPagIbig = runItems.reduce((sum, item) => sum + (item.pagIbigContribution || 0), 0)
    const totalWithholdingTax = runItems.reduce((sum, item) => sum + (item.withholdingTax || 0), 0)

    // Determine status based on payslip statuses
    const statuses = data.payslips.map((p) => p.status)
    let status: "draft" | "processing" | "approved" | "finalized" = "draft"
    if (statuses.every((s) => s === "paid")) {
      status = "finalized"
    } else if (statuses.every((s) => s === "processed" || s === "paid")) {
      status = "approved"
    } else if (statuses.some((s) => s === "processed")) {
      status = "processing"
    } else if (statuses.some((s) => s === "pending")) {
      status = "draft"
    }

    return {
      id: key,
      payPeriodStart: new Date(data.payPeriodStart),
      payPeriodEnd: new Date(data.payPeriodEnd),
      payDate: new Date(data.payDate),
      status,
      totalEmployees: data.payslips.length,
      employeeCount: data.payslips.length,
      totalGross,
      totalDeductions,
      totalNet,
      totalSSS,
      totalPhilHealth,
      totalPagIbig,
      totalWithholdingTax,
      createdBy: "system",
      createdAt: new Date(data.payslips[0]?.created_at || new Date()),
      updatedAt: new Date(data.payslips[0]?.updated_at || new Date()),
    }
  })

  return {
    success: true,
    payrollRuns,
    payrollItems: payrollItemsData,
  }
}
