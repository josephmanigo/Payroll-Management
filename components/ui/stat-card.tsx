"use client"

import type * as React from "react"
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  trend?: {
    value: number
    direction: "up" | "down" | "neutral"
  }
  icon?: React.ReactNode
  className?: string
  variant?: "default" | "primary" | "success" | "warning" | "info"
}

export function StatCard({ title, value, description, trend, icon, className, variant = "default" }: StatCardProps) {
  const variantStyles = {
    default: "bg-card border-border",
    primary: "bg-primary/5 border-primary/20",
    success: "bg-emerald-500/5 border-emerald-500/20",
    warning: "bg-amber-500/5 border-amber-500/20",
    info: "bg-blue-500/5 border-blue-500/20",
  }

  const iconVariantStyles = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-5 transition-all duration-200 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20",
        variantStyles[variant],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
                  trend.direction === "up" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                  trend.direction === "down" && "bg-red-500/10 text-red-600 dark:text-red-400",
                  trend.direction === "neutral" && "bg-muted text-muted-foreground",
                )}
              >
                {trend.direction === "up" && <ArrowUpRight className="h-3 w-3" />}
                {trend.direction === "down" && <ArrowDownRight className="h-3 w-3" />}
                {trend.direction === "neutral" && <Minus className="h-3 w-3" />}
                {trend.value > 0 ? "+" : ""}
                {trend.value}%
              </span>
            )}
          </div>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {icon && (
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", iconVariantStyles[variant])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
