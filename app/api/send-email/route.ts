import { type NextRequest, NextResponse } from "next/server"

interface EmailRequest {
  to: string
  subject: string
  html: string
  attachments?: Array<{
    filename: string
    content: string // base64 encoded
    contentType?: string
  }>
}

function sanitizeEmail(email: string): string {
  return email.replace(/\s+/g, "").toLowerCase()
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export async function POST(request: NextRequest) {
  try {
    const body: EmailRequest = await request.json()

    const sanitizedEmail = sanitizeEmail(body.to)

    if (!isValidEmail(sanitizedEmail)) {
      console.error("[v0] Invalid email address:", body.to, "->", sanitizedEmail)
      return NextResponse.json({ success: false, error: `Invalid email address: ${body.to}` }, { status: 400 })
    }

    const brevoApiKey = process.env.BREVO_API_KEY
    const senderEmail = process.env.SMTP_USER

    console.log("[v0] Brevo /send-email called with:", {
      originalEmail: body.to,
      sanitizedEmail: sanitizedEmail,
      subject: body.subject,
      hasApiKey: !!brevoApiKey,
      hasSenderEmail: !!senderEmail,
    })

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
        to: [{ email: sanitizedEmail }],
        subject: body.subject,
        htmlContent: body.html,
        attachment: body.attachments?.map((att) => ({
          name: att.filename,
          content: att.content,
        })),
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

    console.log("[v0] Email sent successfully via Brevo:", result)

    return NextResponse.json({
      success: true,
      messageId: result.messageId || `brevo_${Date.now()}`,
    })
  } catch (error) {
    console.error("[v0] Failed to send email:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to send email" },
      { status: 500 },
    )
  }
}
