"use server"

import { createClient } from "@/lib/supabase/server"
import { logAuditWithCurrentUser } from "@/lib/audit-logger"

const AVATAR_BUCKET = "avatars"

// Server-side storage utilities
export async function uploadAvatarServer(
  file: File,
  userId: string,
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient()

  const fileExt = file.name.split(".").pop()
  const fileName = `${userId}-${Date.now()}.${fileExt}`
  const filePath = `${userId}/${fileName}`

  const { data, error } = await supabase.storage.from(AVATAR_BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    upsert: true,
  })

  if (error) {
    return { url: null, error: error.message }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath)

  await logAuditWithCurrentUser({
    action: "avatar_updated",
    entityType: "profile",
    entityId: userId,
    metadata: {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    },
  })

  return { url: publicUrl, error: null }
}
