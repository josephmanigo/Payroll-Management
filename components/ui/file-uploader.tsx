"use client"

import * as React from "react"
import { Upload, X, FileText, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface FileUploaderProps {
  accept?: string
  maxSize?: number // in MB
  onFileSelect: (file: File) => void
  onFileRemove?: () => void
  className?: string
  disabled?: boolean
  status?: "idle" | "uploading" | "success" | "error"
  progress?: number
  errorMessage?: string
}

export function FileUploader({
  accept = ".csv",
  maxSize = 5,
  onFileSelect,
  onFileRemove,
  className,
  disabled = false,
  status = "idle",
  progress = 0,
  errorMessage,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = React.useState(false)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return

    const file = e.dataTransfer.files[0]
    if (file) handleFileSelection(file)
  }

  const handleFileSelection = (file: File) => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`)
      return
    }

    setSelectedFile(file)
    onFileSelect(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelection(file)
  }

  const handleRemove = () => {
    setSelectedFile(null)
    if (inputRef.current) inputRef.current.value = ""
    onFileRemove?.()
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-all duration-200 cursor-pointer",
          isDragging && "border-primary bg-primary/5",
          !isDragging && !disabled && "border-border hover:border-primary/50 hover:bg-muted/50",
          disabled && "cursor-not-allowed opacity-50",
          status === "error" && "border-destructive bg-destructive/5",
          status === "success" && "border-emerald-500 bg-emerald-500/5",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />

        {!selectedFile ? (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Drop your file here, or click to browse</p>
            <p className="text-xs text-muted-foreground">
              {accept.replace(/\./g, "").toUpperCase()} files up to {maxSize}MB
            </p>
          </>
        ) : (
          <div className="flex items-center gap-4 w-full">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              {status === "uploading" && (
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {status === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              {status === "error" && <AlertCircle className="h-5 w-5 text-destructive" />}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove()
                }}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
      {errorMessage && status === "error" && <p className="mt-2 text-sm text-destructive">{errorMessage}</p>}
    </div>
  )
}
