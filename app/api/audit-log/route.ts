import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, userRole, userName, userEmail, action, entityType, entityId, metadata } = body

    const adminClient = createAdminClient()

    const { error } = await adminClient.from("audit_logs").insert({
      user_id: userId || null,
      user_role: userRole || "employee",
      user_name: userName || null,
      user_email: userEmail || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error("[Audit Log API] Error:", error.message)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error("[Audit Log API] Error:", errorMsg)
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 })
  }
}
