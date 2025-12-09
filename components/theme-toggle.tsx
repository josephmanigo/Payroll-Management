"use client"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const isDark = theme === "dark"

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative h-8 w-14 rounded-full bg-muted p-1 transition-colors duration-300 hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {/* Sliding pill background */}
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-primary shadow-md transition-all duration-300 ease-in-out ${
          isDark ? "left-7" : "left-1"
        }`}
      />

      {/* Sun icon */}
      <span
        className={`absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center transition-all duration-300 ${
          isDark ? "text-muted-foreground opacity-50" : "text-primary-foreground opacity-100"
        }`}
      >
        <Sun className="h-3.5 w-3.5" />
      </span>

      {/* Moon icon */}
      <span
        className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center transition-all duration-300 ${
          isDark ? "text-primary-foreground opacity-100" : "text-muted-foreground opacity-50"
        }`}
      >
        <Moon className="h-3.5 w-3.5" />
      </span>
    </button>
  )
}
