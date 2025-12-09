"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { LeaveRequest } from "@/lib/types"

interface LeaveRequestWithEmployee extends LeaveRequest {
  employees?: {
    id: string
    first_name: string
    last_name: string
    email: string
    department: string
    position: string
    employee_number: string
  }
}

interface AdminLeaveCalendarProps {
  leaveRequests: LeaveRequestWithEmployee[]
  showOnlyApproved?: boolean
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

const leaveTypeColors: Record<string, string> = {
  vacation: "bg-blue-500",
  sick: "bg-red-500",
  emergency: "bg-orange-500",
  maternity: "bg-pink-500",
  paternity: "bg-indigo-500",
  bereavement: "bg-purple-500",
  unpaid: "bg-gray-500",
}

export function AdminLeaveCalendar({ leaveRequests, showOnlyApproved = true }: AdminLeaveCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const startingDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const previousMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToToday = () => setCurrentDate(new Date())

  // Filter and map leaves to dates
  const leaveMap = useMemo(() => {
    const map = new Map<string, LeaveRequestWithEmployee[]>()

    const filteredLeaves = showOnlyApproved
      ? leaveRequests.filter((leave) => leave.status === "approved")
      : leaveRequests

    filteredLeaves.forEach((leave) => {
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
  }, [leaveRequests, showOnlyApproved])

  const renderCalendarDays = () => {
    const days = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-[120px] border border-border/50 bg-muted/20" />)
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
            "min-h-[120px] border border-border/50 p-1.5 transition-colors",
            isToday && "bg-primary/5 border-primary",
            isWeekend && "bg-muted/30",
          )}
        >
          <div
            className={cn(
              "text-sm font-medium mb-1.5 flex items-center justify-between",
              isToday && "text-primary font-bold",
            )}
          >
            <span>{day}</span>
            {dayLeaves.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                <Users className="h-3 w-3 mr-0.5" />
                {dayLeaves.length}
              </Badge>
            )}
          </div>
          <div className="space-y-1 overflow-hidden">
            {dayLeaves.slice(0, 3).map((leave, idx) => (
              <div
                key={`${leave.id}-${idx}`}
                className={cn(
                  "text-[10px] px-1.5 py-1 rounded text-white truncate",
                  leaveTypeColors[leave.leave_type] || "bg-gray-500",
                )}
                title={`${leave.employees?.first_name} ${leave.employees?.last_name} - ${leave.leave_type}`}
              >
                <span className="font-medium">
                  {leave.employees?.first_name} {leave.employees?.last_name?.charAt(0)}.
                </span>
                <span className="opacity-80 ml-1 capitalize">({leave.leave_type})</span>
              </div>
            ))}
            {dayLeaves.length > 3 && (
              <div className="text-[10px] text-muted-foreground font-medium pl-1">+{dayLeaves.length - 3} more</div>
            )}
          </div>
        </div>,
      )
    }

    return days
  }

  // Stats for the current month
  const monthStats = useMemo(() => {
    const approvedLeaves = leaveRequests.filter((l) => l.status === "approved")
    const monthLeaves = approvedLeaves.filter((leave) => {
      const start = new Date(leave.start_date)
      const end = new Date(leave.end_date)
      return (
        (start.getMonth() === month && start.getFullYear() === year) ||
        (end.getMonth() === month && end.getFullYear() === year)
      )
    })

    const uniqueEmployees = new Set(monthLeaves.map((l) => l.employee_id))
    const totalDays = monthLeaves.reduce((sum, l) => sum + l.total_days, 0)

    return {
      totalLeaves: monthLeaves.length,
      uniqueEmployees: uniqueEmployees.size,
      totalDays,
    }
  }, [leaveRequests, month, year])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">
            {MONTHS[month]} {year}
          </h3>
          <p className="text-sm text-muted-foreground">
            {monthStats.totalLeaves} approved leaves • {monthStats.uniqueEmployees} employees • {monthStats.totalDays}{" "}
            total days
          </p>
        </div>
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
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(leaveTypeColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={cn("w-3 h-3 rounded", color)} />
            <span className="capitalize">{type}</span>
          </div>
        ))}
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
