"use client"

import * as React from "react"
import { Camera, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { updateEmployeeAvatar, updateProfileAvatar, removeAvatar } from "@/app/employee/avatar-actions"
import { useToast } from "@/components/ui/use-toast"
import { uploadAvatar } from "@/lib/supabase/storage"

interface ProfileAvatarUploadProps {
  currentAvatar?: string | null
  name: string
  employeeId?: string | null
  userId: string
  onAvatarUpdate?: (url: string | null) => void
  size?: "sm" | "md" | "lg"
  disabled?: boolean
}

export function ProfileAvatarUpload({
  currentAvatar,
  name,
  employeeId,
  userId,
  onAvatarUpdate,
  size = "lg",
  disabled = false,
}: ProfileAvatarUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(currentAvatar || null)
  const [isUploading, setIsUploading] = React.useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false)
  const [pendingFile, setPendingFile] = React.useState<File | null>(null)
  const { toast } = useToast()

  React.useEffect(() => {
    setPreviewUrl(currentAvatar || null)
  }, [currentAvatar])

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image size must be less than 5MB", variant: "destructive" })
      return
    }

    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setPendingFile(file)
    setShowConfirmDialog(true)
  }

  const handleConfirmUpload = async () => {
    if (!pendingFile) return

    setIsUploading(true)
    setShowConfirmDialog(false)

    try {
      // Upload to Supabase Storage
      const { url: storageUrl, error: uploadError } = await uploadAvatar(pendingFile, userId)

      if (uploadError || !storageUrl) {
        toast({ title: "Error", description: uploadError || "Failed to upload photo", variant: "destructive" })
        setPreviewUrl(currentAvatar || null)
        setIsUploading(false)
        setPendingFile(null)
        return
      }

      // Update database with storage URL
      let result
      if (employeeId) {
        result = await updateEmployeeAvatar(employeeId, storageUrl)
      } else {
        result = await updateProfileAvatar(userId, storageUrl)
      }

      if (result.success) {
        setPreviewUrl(storageUrl)
        onAvatarUpdate?.(storageUrl)
        toast({ title: "Success", description: "Profile photo updated successfully" })
      } else {
        toast({ title: "Error", description: result.error || "Failed to update photo", variant: "destructive" })
        setPreviewUrl(currentAvatar || null)
      }
    } catch (error) {
      console.error("Error uploading avatar:", error)
      toast({ title: "Error", description: "Failed to upload photo", variant: "destructive" })
      setPreviewUrl(currentAvatar || null)
    } finally {
      setIsUploading(false)
      setPendingFile(null)
    }
  }

  const handleCancelUpload = () => {
    setShowConfirmDialog(false)
    setPreviewUrl(currentAvatar || null)
    setPendingFile(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const handleRemove = async () => {
    setIsUploading(true)
    try {
      const result = await removeAvatar(employeeId || null, userId)
      if (result.success) {
        setPreviewUrl(null)
        onAvatarUpdate?.(null)
        toast({ title: "Success", description: "Profile photo removed" })
      } else {
        toast({ title: "Error", description: result.error || "Failed to remove photo", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove photo", variant: "destructive" })
    }
    setIsUploading(false)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <>
      <div className="flex flex-col items-center gap-3">
        <div className="relative group">
          <Avatar className={cn(sizeClasses[size], "border-2 border-border")}>
            {previewUrl && <AvatarImage src={previewUrl || "/placeholder.svg"} alt={name} />}
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>

          {!disabled && !isUploading && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Camera className="h-6 w-6 text-white" />
            </button>
          )}

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}

          {previewUrl && !disabled && !isUploading && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-1 -right-1 h-6 w-6 rounded-full"
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
          className="hidden"
        />

        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                {previewUrl ? "Change Photo" : "Upload Photo"}
              </>
            )}
          </Button>
        )}

        <p className="text-xs text-muted-foreground text-center">
          {previewUrl ? "Click to change or remove photo" : "Your initials will be shown if no photo is uploaded"}
        </p>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Profile Photo</DialogTitle>
            <DialogDescription>Are you sure you want to update your profile photo?</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <Avatar className="h-32 w-32 border-2 border-border">
              {previewUrl && <AvatarImage src={previewUrl || "/placeholder.svg"} alt="Preview" />}
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelUpload}>
              Cancel
            </Button>
            <Button onClick={handleConfirmUpload}>Update Photo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
