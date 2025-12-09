// Server-side storage utilities should use the server client directly where needed
import { createClient } from "@/lib/supabase/client"

const AVATAR_BUCKET = "avatars"
const DOCUMENTS_BUCKET = "documents"
const PAYSLIPS_BUCKET = "payslips"

// Client-side storage utilities
export async function uploadAvatar(file: File, userId: string): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient()

  // Generate unique filename
  const fileExt = file.name.split(".").pop()
  const fileName = `${userId}-${Date.now()}.${fileExt}`
  const filePath = `${userId}/${fileName}`

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage.from(AVATAR_BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    upsert: true,
  })

  if (error) {
    console.error("Error uploading avatar:", error)
    return { url: null, error: error.message }
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath)

  return { url: publicUrl, error: null }
}

export async function deleteAvatar(avatarUrl: string): Promise<{ success: boolean; error: string | null }> {
  if (!avatarUrl) return { success: true, error: null }

  const supabase = createClient()

  // Extract file path from URL
  const urlParts = avatarUrl.split(`${AVATAR_BUCKET}/`)
  if (urlParts.length < 2) return { success: false, error: "Invalid avatar URL" }

  const filePath = urlParts[1]

  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([filePath])

  if (error) {
    console.error("Error deleting avatar:", error)
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

export async function uploadDocument(
  file: File,
  employeeId: string,
  docType: string,
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient()

  const fileExt = file.name.split(".").pop()
  const fileName = `${docType}-${Date.now()}.${fileExt}`
  const filePath = `${employeeId}/${fileName}`

  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  })

  if (error) {
    return { url: null, error: error.message }
  }

  // Get signed URL for private files (valid for 1 hour)
  const { data: signedUrlData, error: signedError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(filePath, 3600)

  if (signedError) {
    return { url: null, error: signedError.message }
  }

  return { url: signedUrlData.signedUrl, error: null }
}

export async function uploadPayslip(
  pdfBlob: Blob,
  employeeId: string,
  payPeriod: string,
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient()

  const fileName = `payslip-${payPeriod}-${Date.now()}.pdf`
  const filePath = `${employeeId}/${fileName}`

  const { data, error } = await supabase.storage.from(PAYSLIPS_BUCKET).upload(filePath, pdfBlob, {
    cacheControl: "3600",
    contentType: "application/pdf",
    upsert: false,
  })

  if (error) {
    return { url: null, error: error.message }
  }

  return { url: filePath, error: null }
}

export async function getPayslipSignedUrl(filePath: string): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient()

  const { data, error } = await supabase.storage.from(PAYSLIPS_BUCKET).createSignedUrl(filePath, 3600) // 1 hour validity

  if (error) {
    return { url: null, error: error.message }
  }

  return { url: data.signedUrl, error: null }
}
