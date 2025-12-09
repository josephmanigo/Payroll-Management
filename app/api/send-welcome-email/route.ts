import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email, firstName, tempPassword } = await request.json()

    // Check if we have email configuration
    const hasResend = process.env.RESEND_API_KEY
    const hasBrevo = process.env.BREVO_API_KEY
    const hasSmtp = process.env.SMTP_USER

    if (!hasResend && !hasBrevo && !hasSmtp) {
      return NextResponse.json(
        {
          success: false,
          error: "No email service configured",
        },
        { status: 400 },
      )
    }

    const loginUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/login` : "/login"

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome to Payroll Management!</h1>
        <p>Hello ${firstName},</p>
        <p>Your employee account has been created. You can now log in to view your payslips and personal information.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
        </div>
        <p style="color: #666;">Please change your password after your first login for security.</p>
        <a href="${loginUrl}" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 10px;">
          Log In Now
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This is an automated message from Payroll Management. Please do not reply to this email.
        </p>
      </div>
    `

    // Try Resend first
    if (hasResend) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
          to: email,
          subject: "Welcome to Payroll Management - Your Account Details",
          html: htmlContent,
        }),
      })

      if (res.ok) {
        return NextResponse.json({ success: true })
      }
    }

    // Try Brevo (Sendinblue) as fallback
    if (hasBrevo) {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": process.env.BREVO_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { email: process.env.BREVO_FROM_EMAIL || "noreply@payroll.com", name: "Payroll Management" },
          to: [{ email }],
          subject: "Welcome to Payroll Management - Your Account Details",
          htmlContent,
        }),
      })

      if (res.ok) {
        return NextResponse.json({ success: true })
      }
    }

    return NextResponse.json({ success: false, error: "Failed to send email" }, { status: 500 })
  } catch (error) {
    console.error("Send welcome email error:", error)
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 })
  }
}
