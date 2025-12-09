"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, Building2, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { AnimatedButton } from "@/components/ui/animated-button"
import { useTheme } from "@/components/theme-provider"

interface NavLink {
  href: string
  label: string
}

interface MobileNavProps {
  links?: NavLink[]
}

const defaultLinks: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact Us" },
]

export function MobileNav({ links = defaultLinks }: MobileNavProps) {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[350px]">
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 pb-6 border-b">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Payroll Management</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-2 py-6 flex-1">
            {links.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}

            {/* Theme Toggle Section */}
            <div className="px-4 py-3 mt-2 border-t pt-4">
              <span className="text-sm font-medium text-muted-foreground mb-2 block">Theme</span>
              <div className="flex gap-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                  className="flex-1"
                >
                  <Sun className="h-4 w-4 mr-1" />
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                  className="flex-1"
                >
                  <Moon className="h-4 w-4 mr-1" />
                  Dark
                </Button>
              </div>
            </div>
          </nav>

          <div className="border-t pt-6">
            <Link href="/login" onClick={() => setOpen(false)}>
              <AnimatedButton className="w-full">Sign in</AnimatedButton>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
