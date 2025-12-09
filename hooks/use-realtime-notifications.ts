"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Notification } from "@/lib/types"

export function useRealtimeNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    const supabase = createClient()

    try {
      const { data, error: fetchError } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50)

      if (fetchError) {
        console.log("[v0] Notifications fetch error:", fetchError.message)
        setError(fetchError.message)
      } else {
        setNotifications(data || [])
      }

      setError(null)
    } catch (err) {
      console.error("[v0] Error fetching notifications:", err)
      setError("Failed to fetch notifications")
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Set up real-time subscription
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("[v0] Notification update:", payload.eventType)

          if (payload.eventType === "INSERT") {
            setNotifications((prev) => [payload.new as Notification, ...prev])
          } else if (payload.eventType === "UPDATE") {
            setNotifications((prev) => prev.map((n) => (n.id === payload.new.id ? (payload.new as Notification) : n)))
          } else if (payload.eventType === "DELETE") {
            setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id))
          }
        },
      )
      .subscribe((status) => {
        console.log("[v0] Notifications subscription status:", status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const unreadNotifications = notifications.filter((n) => !n.read)
  const readNotifications = notifications.filter((n) => n.read)
  const unreadCount = unreadNotifications.length

  const markAsRead = async (notificationId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", notificationId)

    if (!error) {
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
    }
    return { success: !error, error: error?.message }
  }

  const markAllAsRead = async () => {
    if (!userId) return { success: false, error: "No user ID" }

    const supabase = createClient()
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false)

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    }
    return { success: !error, error: error?.message }
  }

  const deleteNotification = async (notificationId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from("notifications").delete().eq("id", notificationId)

    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    }
    return { success: !error, error: error?.message }
  }

  return {
    notifications,
    unreadNotifications,
    readNotifications,
    unreadCount,
    loading,
    error,
    refetch: fetchData,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  }
}
