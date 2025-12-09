"use client"
import { useEffect, useState } from "react"
import { Search, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NotificationBell } from "@/components/notification-bell"
import { createClient } from "@/lib/supabase/client"

interface HeaderProps {
  title?: string
  subtitle?: string
  onMenuClick?: () => void
  showMobileMenu?: boolean
}

export function Header({ title, subtitle, onMenuClick, showMobileMenu = false }: HeaderProps) {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
      }
    })
  }, [])

  return (
    <header className="sticky top-0 z-40 flex h-14 sm:h-16 items-center gap-2 sm:gap-4 border-b border-border bg-card/80 backdrop-blur-xl px-3 sm:px-6">
      {showMobileMenu && (
        <Button variant="ghost" size="icon" className="shrink-0" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      )}

      <div className="flex-1 min-w-0">
        {title && (
          <div className="space-y-0.5">
            <h1 className="text-base sm:text-xl font-bold tracking-tight truncate">{title}</h1>
            {subtitle && <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">{subtitle}</p>}
          </div>
        )}
      </div>

      {/* Search - hidden on mobile */}
      <div className="hidden md:flex relative w-72">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search anything..."
          className="pl-9 bg-accent/50 border-transparent hover:border-border focus-visible:border-primary focus-visible:bg-background transition-all rounded-xl"
        />
      </div>

      <NotificationBell userId={userId} />
    </header>
  )
}
