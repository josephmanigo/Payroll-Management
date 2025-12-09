"use client"

import * as React from "react"
import { format, isWeekend } from "date-fns"
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Umbrella,
  Loader2,
  Download,
  Clock,
} from "lucide-react"
import { AdminLayout } from "@/components/layout/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { StatCard } from "@/components/ui/stat-card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn, getInitials } from "@/lib/utils"
import { useRealtimeLeaveRequests } from "@/hooks/use-realtime-employee"
import { useToast } from "@/hooks/use-toast"
import { fetchAttendanceForDate, type EmployeeWithAttendance } from "./actions"

type AttendanceStatus = "present" | "absent" | "on_leave" | "weekend" | "timed_in" | "not_timed_in"

interface EmployeeAttendance {
  employeeId: string
  employeeName: string
  department: string
  position: string
  status: AttendanceStatus
  leaveType?: string
  timeIn?: string | null
  timeOut?: string | null
  totalHours?: number | null
  lateHours?: number | null
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date())
  const [employeesWithAttendance, setEmployeesWithAttendance] = React.useState<EmployeeWithAttendance[]>([])
  const [loading, setLoading] = React.useState(true)
  const { approvedLeaveRequests, loading: leavesLoading } = useRealtimeLeaveRequests()
  const { toast } = useToast()

  React.useEffect(() => {
    async function loadAttendance() {
      setLoading(true)
      const dateStr = format(selectedDate, "yyyy-MM-dd")
      const { data, error } = await fetchAttendanceForDate(dateStr)

      if (error) {
        console.error("[v0] Error fetching attendance:", error)
        toast({ title: "Error", description: error, variant: "destructive" })
      }

      setEmployeesWithAttendance(data || [])
      setLoading(false)
    }

    loadAttendance()
  }, [selectedDate, toast])

  const isLoading = loading || leavesLoading

  const getEmployeeLeaveForDate = React.useCallback(
    (employeeId: string, date: Date) => {
      return approvedLeaveRequests.find((leave) => {
        if (leave.employee_id !== employeeId) return false
        const startDate = new Date(leave.start_date)
        const endDate = new Date(leave.end_date)
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)
        date.setHours(12, 0, 0, 0)
        return date >= startDate && date <= endDate
      })
    },
    [approvedLeaveRequests],
  )

  const attendanceData = React.useMemo((): EmployeeAttendance[] => {
    const dateToCheck = new Date(selectedDate)
    const isWeekendDay = isWeekend(dateToCheck)

    return employeesWithAttendance
      .filter((emp) => emp.status === "active")
      .map((employee) => {
        const leave = getEmployeeLeaveForDate(employee.id, new Date(dateToCheck))
        const attendance = employee.attendance

        let status: AttendanceStatus
        let leaveType: string | undefined

        if (isWeekendDay) {
          status = "weekend"
        } else if (leave) {
          status = "on_leave"
          leaveType = leave.leave_type
        } else if (attendance?.time_in && attendance?.time_out) {
          status = "present"
        } else if (attendance?.time_in) {
          status = "timed_in"
        } else {
          status = "not_timed_in"
        }

        const lateHours = attendance?.late_minutes ? Math.round((attendance.late_minutes / 60) * 100) / 100 : null

        return {
          employeeId: employee.id,
          employeeName: `${employee.first_name} ${employee.last_name}`,
          department: employee.department,
          position: employee.position,
          status,
          leaveType,
          timeIn: attendance?.time_in,
          timeOut: attendance?.time_out,
          totalHours: attendance ? calculateTotalHours(attendance.time_in, attendance.time_out) : null,
          lateHours,
        }
      })
  }, [employeesWithAttendance, selectedDate, getEmployeeLeaveForDate])

  const stats = React.useMemo(() => {
    const present = attendanceData.filter((a) => a.status === "present").length
    const timedIn = attendanceData.filter((a) => a.status === "timed_in").length
    const onLeave = attendanceData.filter((a) => a.status === "on_leave").length
    const notTimedIn = attendanceData.filter((a) => a.status === "not_timed_in").length
    const total = attendanceData.filter((a) => a.status !== "weekend").length

    return { present, timedIn, onLeave, notTimedIn, total }
  }, [attendanceData])

  const getStatusBadge = (status: AttendanceStatus, leaveType?: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Completed</Badge>
      case "timed_in":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Working</Badge>
      case "on_leave":
        return (
          <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 capitalize">
            {leaveType || "On Leave"}
          </Badge>
        )
      case "not_timed_in":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Not Timed In</Badge>
      case "weekend":
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">Weekend</Badge>
      default:
        return null
    }
  }

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case "present":
        return <UserCheck className="h-4 w-4 text-emerald-600" />
      case "timed_in":
        return <Clock className="h-4 w-4 text-blue-600" />
      case "on_leave":
        return <Umbrella className="h-4 w-4 text-purple-600" />
      case "not_timed_in":
        return <UserX className="h-4 w-4 text-amber-600" />
      default:
        return null
    }
  }

  const formatTime = (timestamp: string | null | undefined) => {
    if (!timestamp) return "-"
    return format(new Date(timestamp), "h:mm a")
  }

  const handleExport = () => {
    const csvContent = [
      [
        "Employee",
        "Department",
        "Position",
        "Status",
        "Time In",
        "Time Out",
        "Total Hours",
        "Late (hrs)",
        "Leave Type",
      ],
      ...attendanceData.map((a) => [
        a.employeeName,
        a.department,
        a.position,
        a.status,
        a.timeIn ? formatTime(a.timeIn) : "",
        a.timeOut ? formatTime(a.timeOut) : "",
        a.totalHours?.toFixed(2) || "",
        a.lateHours?.toFixed(2) || "",
        a.leaveType || "",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `attendance-${format(selectedDate, "yyyy-MM-dd")}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Export Complete", description: "Attendance data has been exported." })
  }

  const isWeekendDay = isWeekend(selectedDate)

  function calculateTotalHours(timeIn: string | null, timeOut: string | null): number | null {
    if (!timeIn || !timeOut) return null
    const start = new Date(timeIn)
    const end = new Date(timeOut)
    const diffMs = end.getTime() - start.getTime()
    return diffMs / (1000 * 60 * 60)
  }

  if (isLoading) {
    return (
      <AdminLayout title="Attendance" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      title="Attendance"
      subtitle={`${format(selectedDate, "EEEE, MMMM d, yyyy")} - ${stats.total} employees`}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const prev = new Date(selectedDate)
                prev.setDate(prev.getDate() - 1)
                setSelectedDate(prev)
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[240px] justify-start bg-transparent">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "MMMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const next = new Date(selectedDate)
                next.setDate(next.getDate() + 1)
                setSelectedDate(next)
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
              Today
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2 bg-transparent" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {!isWeekendDay && (
          <div className="grid gap-4 md:grid-cols-5">
            <StatCard
              title="Completed"
              value={stats.present}
              icon={<UserCheck className="h-5 w-5" />}
              variant="success"
              description="timed in & out"
            />
            <StatCard
              title="Working"
              value={stats.timedIn}
              icon={<Clock className="h-5 w-5" />}
              variant="info"
              description="currently timed in"
            />
            <StatCard
              title="On Leave"
              value={stats.onLeave}
              icon={<Umbrella className="h-5 w-5" />}
              variant="default"
            />
            <StatCard
              title="Not Timed In"
              value={stats.notTimedIn}
              icon={<UserX className="h-5 w-5" />}
              variant="warning"
            />
            <StatCard title="Total" value={stats.total} description="active employees" variant="default" />
          </div>
        )}

        {isWeekendDay && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="py-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <CalendarIcon className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-200">Weekend - Office Closed</p>
                  <p className="text-sm text-amber-700/80 dark:text-amber-300/80">
                    {format(selectedDate, "EEEE")} is a non-working day
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Employee Attendance</CardTitle>
            <CardDescription>
              {isWeekendDay
                ? "Showing all employees (weekend)"
                : `Showing attendance for ${format(selectedDate, "MMMM d, yyyy")}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {attendanceData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserX className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No employees found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {attendanceData.map((attendance) => (
                  <div
                    key={attendance.employeeId}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border transition-colors",
                      attendance.status === "present" && "bg-emerald-500/5 border-emerald-500/20",
                      attendance.status === "timed_in" && "bg-blue-500/5 border-blue-500/20",
                      attendance.status === "on_leave" && "bg-purple-500/5 border-purple-500/20",
                      attendance.status === "not_timed_in" && "bg-amber-500/5 border-amber-500/20",
                      attendance.status === "weekend" && "bg-muted/50 border-border/50",
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background">
                        {getStatusIcon(attendance.status)}
                      </div>
                      <Avatar className="h-10 w-10 ring-2 ring-background">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                          {getInitials(attendance.employeeName.split(" ")[0], attendance.employeeName.split(" ")[1])}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{attendance.employeeName}</p>
                        <p className="text-sm text-muted-foreground">
                          {attendance.department} • {attendance.position}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {(attendance.status === "present" || attendance.status === "timed_in") && (
                        <div className="text-right text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span>In: {formatTime(attendance.timeIn)}</span>
                            {attendance.timeOut && (
                              <>
                                <span>•</span>
                                <span>Out: {formatTime(attendance.timeOut)}</span>
                              </>
                            )}
                          </div>
                          {attendance.totalHours && (
                            <div className="text-xs text-muted-foreground">
                              {attendance.totalHours.toFixed(1)} hrs
                              {attendance.lateHours && attendance.lateHours > 0 && (
                                <span className="text-amber-600 ml-2">
                                  ({attendance.lateHours.toFixed(2)} hrs late)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {getStatusBadge(attendance.status, attendance.leaveType)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
