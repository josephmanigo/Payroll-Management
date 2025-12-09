"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { BonusRequest, BonusRequestWithEmployee } from "@/lib/types"
import { getAllBonusRequests } from "@/app/admin/bonus/actions"

// Hook for employee's own bonus requests
export function useRealtimeEmployeeBonusRequests(employeeId: string | null) {
  const [bonusRequests, setBonusRequests] = useState<BonusRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!employeeId) {
      setLoading(false)
      return
    }

    const supabase = createClient()

    try {
      console.log("[v0] useRealtimeEmployeeBonusRequests: Fetching for employee:", employeeId)

      const { data, error: fetchError } = await supabase
        .from("bonus_requests")
        .select("*")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false })

      console.log(
        "[v0] useRealtimeEmployeeBonusRequests: Result -",
        "error:",
        fetchError?.message,
        "count:",
        data?.length,
      )

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setBonusRequests(data || [])
      }

      setError(null)
    } catch (err) {
      console.error("Error fetching bonus requests:", err)
      setError("Failed to fetch bonus requests")
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Set up real-time subscription
  useEffect(() => {
    if (!employeeId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`employee-bonus-${employeeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bonus_requests",
          filter: `employee_id=eq.${employeeId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setBonusRequests((prev) => [payload.new as BonusRequest, ...prev])
          } else if (payload.eventType === "UPDATE") {
            setBonusRequests((prev) =>
              prev.map((br) => (br.id === payload.new.id ? (payload.new as BonusRequest) : br)),
            )
          } else if (payload.eventType === "DELETE") {
            setBonusRequests((prev) => prev.filter((br) => br.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [employeeId])

  const pendingRequests = bonusRequests.filter((br) => br.status === "pending")
  const approvedRequests = bonusRequests.filter((br) => br.status === "approved")
  const rejectedRequests = bonusRequests.filter((br) => br.status === "rejected")

  return {
    bonusRequests,
    pendingRequests,
    approvedRequests,
    rejectedRequests,
    loading,
    error,
    refetch: fetchData,
  }
}

// Hook for admin to view all bonus requests
export function useRealtimeAdminBonusRequests() {
  const [bonusRequests, setBonusRequests] = useState<BonusRequestWithEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      console.log("[v0] useRealtimeAdminBonusRequests: Calling server action...")

      const result = await getAllBonusRequests()

      console.log(
        "[v0] useRealtimeAdminBonusRequests: Result -",
        "success:",
        result.success,
        "error:",
        result.error,
        "count:",
        result.data?.length,
      )

      if (!result.success) {
        setError(result.error || "Failed to fetch bonus requests")
      } else {
        setBonusRequests((result.data as BonusRequestWithEmployee[]) || [])
        setError(null)
      }
    } catch (err) {
      console.error("Error fetching admin bonus requests:", err)
      setError("Failed to fetch bonus requests")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Set up real-time subscription for updates
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel("admin-bonus-requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bonus_requests",
        },
        async () => {
          console.log("[v0] useRealtimeAdminBonusRequests: Realtime update received, refetching...")
          await fetchData()
        },
      )
      .subscribe((status) => {
        console.log("[v0] Admin bonus subscription status:", status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  const pendingRequests = bonusRequests.filter((br) => br.status === "pending")
  const approvedRequests = bonusRequests.filter((br) => br.status === "approved")
  const rejectedRequests = bonusRequests.filter((br) => br.status === "rejected")

  return {
    bonusRequests,
    pendingRequests,
    approvedRequests,
    rejectedRequests,
    loading,
    error,
    refetch: fetchData,
  }
}
