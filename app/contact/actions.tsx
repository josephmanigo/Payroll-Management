"use server"

import { Resend } from "resend"
import { logAudit } from "@/lib/audit-logger"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const RECIPIENT_EMAIL = "joseph.manigo@hcdc.edu.ph"

interface ContactFormData {
  firstName: string
  lastName: string
  email: string
  subject: string
  message: string
}

export async function sendContactEmail(formData: ContactFormData) {
  const { firstName, lastName, email, subject, message } = formData

  // Validate required fields
  if (!firstName || !lastName || !email || !subject || !message) {
    return { success: false, error: "All fields are required" }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { success: false, error: "Invalid email address" }
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contact Form Message</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #18181b 0%, #27272a 100%); padding: 30px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
              New Contact Form Message
            </h1>
            <p style="color: #a1a1aa; margin: 8px 0 0 0; font-size: 14px;">
              Payroll Management System
            </p>
          </div>
          
          <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="margin-bottom: 24px;">
              <h2 style="color: #18181b; font-size: 18px; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #f4f4f5;">
                Sender Information
              </h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #71717a; font-size: 14px; width: 120px;">Name:</td>
                  <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500;">${firstName} ${lastName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Email:</td>
                  <td style="padding: 8px 0; color: #18181b; font-size: 14px;">
                    <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Subject:</td>
                  <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500;">${subject}</td>
                </tr>
              </table>
            </div>
            
            <div style="margin-bottom: 24px;">
              <h2 style="color: #18181b; font-size: 18px; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #f4f4f5;">
                Message
              </h2>
              <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #18181b;">
                <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
              </div>
            </div>
            
            <div style="text-align: center; padding-top: 16px; border-top: 1px solid #f4f4f5;">
              <a href="mailto:${email}?subject=Re: ${subject}" 
                 style="display: inline-block; background-color: #18181b; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
                Reply to ${firstName}
              </a>
            </div>
          </div>
          
          <div style="text-align: center; padding: 20px;">
            <p style="color: #71717a; font-size: 12px; margin: 0;">
              This email was sent from the Payroll Management contact form.
            </p>
            <p style="color: #a1a1aa; font-size: 11px; margin: 8px 0 0 0;">
              Sent on ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
      </body>
    </html>
  `

  try {
    if (resend) {
      // Send email to recipient
      await resend.emails.send({
        from: "Payroll Management <onboarding@resend.dev>",
        to: RECIPIENT_EMAIL,
        replyTo: email,
        subject: `Contact Form: ${subject}`,
        html: htmlContent,
      })

      await logAudit({
        userId: null,
        userName: `${firstName} ${lastName}`,
        userEmail: email,
        userRole: "employee",
        action: "contact_form_submitted",
        entityType: "system",
        metadata: {
          subject,
          senderName: `${firstName} ${lastName}`,
          senderEmail: email,
        },
      })

      return { success: true, message: "Your message has been sent successfully! We'll get back to you soon." }
    } else {
      // Demo mode - log to console
      console.log("=== CONTACT FORM SUBMISSION (Demo Mode) ===")
      console.log(`To: ${RECIPIENT_EMAIL}`)
      console.log(`From: ${firstName} ${lastName} <${email}>`)
      console.log(`Subject: ${subject}`)
      console.log(`Message: ${message}`)
      console.log("============================================")

      await logAudit({
        userId: null,
        userName: `${firstName} ${lastName}`,
        userEmail: email,
        userRole: "employee",
        action: "contact_form_submitted",
        entityType: "system",
        metadata: {
          subject,
          senderName: `${firstName} ${lastName}`,
          senderEmail: email,
          demoMode: true,
        },
      })

      return {
        success: true,
        message: "Demo mode: Your message has been logged. Add RESEND_API_KEY to enable real email delivery.",
      }
    }
  } catch (error) {
    console.error("Failed to send contact email:", error)
    return { success: false, error: "Failed to send message. Please try again later." }
  }
}
