"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { AttendanceRecord } from "@/lib/types"

interface UseRealtimeAttendanceParams {
  employeeId: string | null
}

export function useRealtimeTodayAttendance({ employeeId }: UseRealtimeAttendanceParams) {
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split("T")[0]

  const fetchTodayAttendance = useCallback(async () => {
    if (!employeeId) {
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()

      const { data, error: fetchError } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("date", today)
        .maybeSingle()

      if (fetchError) {
        console.error("[Attendance] Fetch error:", fetchError.message)
        // Don't set error state for missing table - just treat as no attendance
        if (fetchError.message.includes("does not exist")) {
          setAttendance(null)
          setError(null)
        } else {
          setError(fetchError.message)
        }
      } else {
        setAttendance(data as AttendanceRecord | null)
        setError(null)
      }
    } catch (err) {
      console.error("[Attendance] Error:", err)
      // Don't show error to user for transient fetch issues
      setAttendance(null)
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [employeeId, today])

  useEffect(() => {
    fetchTodayAttendance()
  }, [fetchTodayAttendance])

  // Real-time subscription
  useEffect(() => {
    if (!employeeId) return

    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null

    try {
      const supabase = createClient()

      channel = supabase
        .channel(`attendance-${employeeId}-${today}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "attendance_records",
            filter: `employee_id=eq.${employeeId}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
              const record = payload.new as AttendanceRecord
              if (record.date === today) {
                setAttendance(record)
              }
            }
          },
        )
        .subscribe()
    } catch (err) {
      console.error("[Attendance] Subscription error:", err)
    }

    return () => {
      if (channel) {
        const supabase = createClient()
        supabase.removeChannel(channel)
      }
    }
  }, [employeeId, today])

  return {
    attendance,
    loading,
    error,
    refetch: fetchTodayAttendance,
    hasTimedIn: !!attendance?.time_in,
    hasTimedOut: !!attendance?.time_out,
  }
}
