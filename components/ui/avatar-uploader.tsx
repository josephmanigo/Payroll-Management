"use client"

import * as React from "react"
import { Camera, X, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface AvatarUploaderProps {
  currentImage?: string | null
  fallback?: string
  onImageSelect: (file: File, previewUrl: string) => void
  onImageRemove?: () => void
  className?: string
  disabled?: boolean
  size?: "sm" | "md" | "lg"
}

export function AvatarUploader({
  currentImage,
  fallback = "?",
  onImageSelect,
  onImageRemove,
  className,
  disabled = false,
  size = "lg",
}: AvatarUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(currentImage || null)

  React.useEffect(() => {
    setPreviewUrl(currentImage || null)
  }, [currentImage])

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB")
      return
    }

    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    onImageSelect(file, url)
  }

  const handleRemove = () => {
    setPreviewUrl(null)
    if (inputRef.current) inputRef.current.value = ""
    onImageRemove?.()
  }

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative group">
        <Avatar className={cn(sizeClasses[size], "border-2 border-border")}>
          <AvatarImage src={previewUrl || undefined} alt="Profile" />
          <AvatarFallback className="bg-primary/10 text-primary text-2xl font-medium">
            {fallback || <User className="h-8 w-8" />}
          </AvatarFallback>
        </Avatar>

        {!disabled && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <Camera className="h-6 w-6 text-white" />
          </button>
        )}

        {previewUrl && !disabled && (
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
        disabled={disabled}
        className="hidden"
      />

      {!disabled && (
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <Camera className="mr-2 h-4 w-4" />
          {previewUrl ? "Change Photo" : "Upload Photo"}
        </Button>
      )}
    </div>
  )
}
