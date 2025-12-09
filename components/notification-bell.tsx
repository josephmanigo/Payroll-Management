"use client"

import { useState } from "react"
import { Bell, CheckCheck, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications"
import { cn, PESO_SIGN } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

interface NotificationBellProps {
  userId: string | null
}

function fixPesoSign(text: string): string {
  // Replace corrupted UTF-8 peso sign (â‚±) with proper peso sign
  return text.replace(/â‚±/g, PESO_SIGN)
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } =
    useRealtimeNotifications(userId)

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  const handleNotificationClick = async (notificationId: string) => {
    await markAsRead(notificationId)
  }

  const getTypeStyles = (type: string) => {
    switch (type) {
      case "success":
        return "border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
      case "warning":
        return "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
      case "error":
        return "border-l-red-500 bg-red-50/50 dark:bg-red-950/20"
      default:
        return "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto p-1 text-xs" onClick={handleMarkAllAsRead}>
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No notifications yet</div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "px-3 py-2 border-l-4 cursor-pointer hover:bg-accent/50 transition-colors",
                  getTypeStyles(notification.type),
                  !notification.read && "font-medium",
                )}
                onClick={() => handleNotificationClick(notification.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{fixPesoSign(notification.title)}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{fixPesoSign(notification.message)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {notification.link && (
                      <Link href={notification.link} onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    )}
                    {!notification.read && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
