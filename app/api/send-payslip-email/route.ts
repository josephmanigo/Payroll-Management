import { type NextRequest, NextResponse } from "next/server"

interface SendPayslipRequest {
  employeeEmail: string
  subject: string
  messageBody: string
  pdfBase64?: string // PDF as base64 string
  filename?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SendPayslipRequest = await request.json()

    // Validate required fields
    if (!body.employeeEmail || !body.subject || !body.messageBody) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: employeeEmail, subject, and messageBody are required",
        },
        { status: 400 },
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.employeeEmail)) {
      return NextResponse.json({ success: false, error: "Invalid email address format" }, { status: 400 })
    }

    const brevoApiKey = process.env.BREVO_API_KEY
    const senderEmail = process.env.SMTP_USER

    if (!brevoApiKey) {
      return NextResponse.json(
        { success: false, error: "BREVO_API_KEY not configured. Get your API key from brevo.com" },
        { status: 500 },
      )
    }

    if (!senderEmail) {
      return NextResponse.json({ success: false, error: "SMTP_USER not configured for sender email" }, { status: 500 })
    }

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
        to: [{ email: body.employeeEmail.replace(/\s+/g, "").toLowerCase() }],
        subject: body.subject,
        htmlContent: body.messageBody,
        attachment: body.pdfBase64
          ? [
              {
                name: body.filename || "payslip.pdf",
                content: body.pdfBase64,
              },
            ]
          : undefined,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error("[v0] Brevo API error:", result)
      return NextResponse.json(
        {
          success: false,
          error: result.message || "Failed to send email via Brevo",
        },
        { status: response.status },
      )
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId || `brevo_${Date.now()}`,
      message: "Email sent successfully",
    })
  } catch (error) {
    console.error("API route error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to send email"

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
