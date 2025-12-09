"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { AttendanceRecord } from "@/lib/types"

interface UseAdminAttendanceParams {
  date: Date
}

export function useAdminAttendance({ date }: UseAdminAttendanceParams) {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const dateString = date.toISOString().split("T")[0]

  const fetchAttendance = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      const { data, error: fetchError } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("date", dateString)
        .order("time_in", { ascending: true })

      if (fetchError) {
        console.error("[Admin Attendance] Fetch error:", fetchError.message)
        setError(fetchError.message)
        setAttendanceRecords([])
      } else {
        console.log("[Admin Attendance] Records found:", data?.length || 0)
        setAttendanceRecords((data as AttendanceRecord[]) || [])
        setError(null)
      }
    } catch (err) {
      console.error("[Admin Attendance] Error:", err)
      setError("Failed to fetch attendance records")
      setAttendanceRecords([])
    } finally {
      setLoading(false)
    }
  }, [dateString])

  useEffect(() => {
    fetchAttendance()
  }, [fetchAttendance])

  // Real-time subscription for attendance changes
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`admin-attendance-${dateString}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance_records",
        },
        (payload) => {
          console.log("[Admin Attendance] Realtime event:", payload.eventType)

          if (payload.eventType === "INSERT") {
            const record = payload.new as AttendanceRecord
            if (record.date === dateString) {
              setAttendanceRecords((prev) => [...prev, record])
            }
          } else if (payload.eventType === "UPDATE") {
            const record = payload.new as AttendanceRecord
            if (record.date === dateString) {
              setAttendanceRecords((prev) => prev.map((r) => (r.id === record.id ? record : r)))
            }
          } else if (payload.eventType === "DELETE") {
            const record = payload.old as AttendanceRecord
            setAttendanceRecords((prev) => prev.filter((r) => r.id !== record.id))
          }
        },
      )
      .subscribe((status) => {
        console.log("[Admin Attendance] Subscription status:", status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [dateString])

  return {
    attendanceRecords,
    loading,
    error,
    refetch: fetchAttendance,
  }
}
