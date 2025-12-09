"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { LeaveRequest } from "@/lib/types"

interface LeaveCalendarProps {
  leaveRequests: LeaveRequest[]
  onDateClick?: (date: Date) => void
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export function LeaveCalendar({ leaveRequests, onDateClick }: LeaveCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const startingDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Create a map of dates that have leave requests
  const leaveMap = useMemo(() => {
    const map = new Map<string, LeaveRequest[]>()

    leaveRequests.forEach((leave) => {
      const start = new Date(leave.start_date)
      const end = new Date(leave.end_date)

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split("T")[0]
        const existing = map.get(key) || []
        existing.push(leave)
        map.set(key, existing)
      }
    })

    return map
  }, [leaveRequests])

  const getLeaveStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-emerald-500"
      case "pending":
        return "bg-amber-500"
      case "rejected":
        return "bg-red-500"
      case "cancelled":
        return "bg-muted-foreground/50"
      default:
        return "bg-muted-foreground"
    }
  }

  const renderCalendarDays = () => {
    const days = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-border/50 bg-muted/20" />)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateKey = date.toISOString().split("T")[0]
      const dayLeaves = leaveMap.get(dateKey) || []
      const isToday = date.getTime() === today.getTime()
      const isWeekend = date.getDay() === 0 || date.getDay() === 6

      days.push(
        <div
          key={day}
          className={cn(
            "h-24 border border-border/50 p-1 cursor-pointer transition-colors hover:bg-accent/50",
            isToday && "bg-primary/5 border-primary",
            isWeekend && "bg-muted/30",
          )}
          onClick={() => onDateClick?.(date)}
        >
          <div className={cn("text-sm font-medium mb-1", isToday && "text-primary font-bold")}>{day}</div>
          <div className="space-y-0.5 overflow-hidden">
            {dayLeaves.slice(0, 2).map((leave, idx) => (
              <div
                key={`${leave.id}-${idx}`}
                className={cn("text-[10px] px-1 py-0.5 rounded text-white truncate", getLeaveStatusColor(leave.status))}
                title={`${leave.leave_type} - ${leave.status}`}
              >
                {leave.leave_type}
              </div>
            ))}
            {dayLeaves.length > 2 && (
              <div className="text-[10px] text-muted-foreground">+{dayLeaves.length - 2} more</div>
            )}
          </div>
        </div>,
      )
    }

    return days
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {MONTHS[month]} {year}
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span>Approved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Rejected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-muted-foreground/50" />
          <span>Cancelled</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {DAYS.map((day) => (
            <div key={day} className="py-2 text-center text-sm font-medium border-b">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">{renderCalendarDays()}</div>
      </div>
    </div>
  )
}
