"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, LogOut, CheckCircle2, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import type { AttendanceRecord } from "@/lib/types"

function formatLateTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `${hours} hr${hours > 1 ? "s" : ""}`
  }
  return `${hours} hr${hours > 1 ? "s" : ""} ${remainingMinutes}m`
}

interface AttendanceStatusCardProps {
  attendance: AttendanceRecord | null
  loading: boolean
  onTimeOut: () => void
}

export function AttendanceStatusCard({ attendance, loading, onTimeOut }: AttendanceStatusCardProps) {
  if (loading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <div className="animate-pulse flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted"></div>
              <div className="space-y-2">
                <div className="h-4 w-32 bg-muted rounded"></div>
                <div className="h-3 w-24 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Not timed in yet
  if (!attendance?.time_in) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium">Not Timed In</p>
                <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              Pending
            </Badge>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Timed in but not timed out
  if (attendance.time_in && !attendance.time_out) {
    const hoursWorked = () => {
      const start = new Date(attendance.time_in!)
      const now = new Date()
      return ((now.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(2)
    }

    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Clock className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium">Timed In</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(attendance.time_in), "hh:mm a")} • {hoursWorked()} hrs
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {attendance.status === "late" && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  Late ({formatLateTime(attendance.late_minutes || 0)})
                </Badge>
              )}
              <Button size="sm" variant="outline" onClick={onTimeOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Time Out
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Already timed out (attendance complete)
  return (
    <Card className="border-blue-500/30 bg-blue-500/5">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">Attendance Complete</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(attendance.time_in!), "hh:mm a")} - {format(new Date(attendance.time_out!), "hh:mm a")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500">{attendance.total_hours?.toFixed(2)} hrs</Badge>
            {attendance.overtime_hours > 0 && (
              <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                +{attendance.overtime_hours.toFixed(2)} OT
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
