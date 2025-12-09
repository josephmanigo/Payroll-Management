import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { logAudit } from "@/lib/audit-logger"

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()

    // Check if the current user is an admin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: currentUserProfile } = await supabase
      .from("profiles")
      .select("role, full_name, email")
      .eq("id", user.id)
      .single()

    if (currentUserProfile?.role !== "admin") {
      return NextResponse.json({ error: "Only admins can delete accounts" }, { status: 403 })
    }

    const { userId, userEmail } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Prevent deleting own account
    if (userId === user.id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 })
    }

    const { data: deletedUserProfile } = await supabase
      .from("profiles")
      .select("full_name, email, role")
      .eq("id", userId)
      .single()

    // Use admin client to delete the user from auth
    const adminClient = createAdminClient()

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId)

    if (deleteAuthError) {
      console.error("Error deleting user from auth:", deleteAuthError)
      return NextResponse.json({ error: "Failed to delete user authentication" }, { status: 500 })
    }

    // Delete from profiles table (should cascade, but doing explicitly)
    const { error: deleteProfileError } = await supabase.from("profiles").delete().eq("id", userId)

    if (deleteProfileError) {
      console.error("Error deleting profile:", deleteProfileError)
      // User auth is already deleted, so we just log this
    }

    await logAudit({
      userId: user.id,
      userName: currentUserProfile.full_name,
      userEmail: currentUserProfile.email,
      userRole: "admin",
      action: "admin_deleted",
      entityType: "admin",
      entityId: userId,
      metadata: {
        deletedUserEmail: deletedUserProfile?.email || userEmail,
        deletedUserName: deletedUserProfile?.full_name || "Unknown",
        deletedUserRole: deletedUserProfile?.role || "admin",
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in delete account:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
