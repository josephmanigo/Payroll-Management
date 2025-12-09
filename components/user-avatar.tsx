"use client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  src?: string | null
  name?: string
  className?: string
  fallbackClassName?: string
}

export function UserAvatar({ src, name = "User", className, fallbackClassName }: UserAvatarProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Avatar className={cn("ring-2 ring-primary/20", className)}>
      {src && <AvatarImage src={src || "/placeholder.svg"} alt={name} />}
      <AvatarFallback className={cn("bg-primary/10 text-primary font-semibold", fallbackClassName)}>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
