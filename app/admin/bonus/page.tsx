"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/layout/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, CheckCircle2, XCircle, Clock, Banknote } from "lucide-react"
import { useRealtimeAdminBonusRequests } from "@/hooks/use-realtime-bonus"
import { approveBonusRequest, rejectBonusRequest } from "./actions"
import { formatCurrency, formatDate, getInitials } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import type { BonusRequestWithEmployee } from "@/lib/types"

export default function BonusRequestsPage() {
  const { bonusRequests, pendingRequests, approvedRequests, rejectedRequests, loading } =
    useRealtimeAdminBonusRequests()
  const [selectedRequest, setSelectedRequest] = useState<BonusRequestWithEmployee | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUserId(data.user.id)
      }
    })
  }, [])

  const handleApprove = async (requestId: string) => {
    if (!currentUserId) {
      toast({
        title: "Error",
        description: "You must be logged in to approve requests.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    const result = await approveBonusRequest(requestId, currentUserId)
    setIsProcessing(false)

    if (result.success) {
      toast({
        title: "Bonus Request Approved",
        description: "The bonus request has been approved and the employee has been notified.",
      })
      setSelectedRequest(null)
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to approve bonus request.",
        variant: "destructive",
      })
    }
  }

  const handleReject = async (requestId: string) => {
    if (!currentUserId) {
      toast({
        title: "Error",
        description: "You must be logged in to reject requests.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    const result = await rejectBonusRequest(requestId, currentUserId)
    setIsProcessing(false)

    if (result.success) {
      toast({
        title: "Bonus Request Rejected",
        description: "The bonus request has been rejected and the employee has been notified.",
      })
      setSelectedRequest(null)
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to reject bonus request.",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-500">Approved</Badge>
      case "pending":
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            Pending
          </Badge>
        )
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const totalPendingAmount = pendingRequests.reduce((sum, r) => sum + r.amount, 0)
  const totalApprovedAmount = approvedRequests.reduce((sum, r) => sum + r.amount, 0)

  const renderRequestsList = (requests: BonusRequestWithEmployee[]) => {
    if (requests.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Banknote className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No bonus requests found</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {requests.map((request) => {
          const employee = request.employees
          return (
            <div
              key={request.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => setSelectedRequest(request)}
            >
              <div className="flex items-center gap-4 min-w-0">
                <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {employee ? getInitials(employee.first_name, employee.last_name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {employee ? `${employee.first_name} ${employee.last_name}` : "Unknown Employee"}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {employee?.department} - {employee?.position}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-4">
                <div className="text-left sm:text-right">
                  <p className="font-semibold text-lg">{formatCurrency(request.amount)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(request.created_at)}</p>
                </div>
                {getStatusBadge(request.status)}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <AdminLayout title="Bonus Requests" subtitle="Manage employee bonus requests">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Bonus Requests" subtitle="Manage employee bonus requests">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{pendingRequests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold">{approvedRequests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold">{rejectedRequests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Banknote className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Amount</p>
                  <p className="text-xl font-bold">{formatCurrency(totalPendingAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-primary" />
              Bonus Requests
            </CardTitle>
            <CardDescription>Review and manage employee bonus requests</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending">
              <TabsList className="mb-4">
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Pending ({pendingRequests.length})
                </TabsTrigger>
                <TabsTrigger value="approved" className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Approved ({approvedRequests.length})
                </TabsTrigger>
                <TabsTrigger value="rejected" className="gap-2">
                  <XCircle className="h-4 w-4" />
                  Rejected ({rejectedRequests.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending">{renderRequestsList(pendingRequests)}</TabsContent>
              <TabsContent value="approved">{renderRequestsList(approvedRequests)}</TabsContent>
              <TabsContent value="rejected">{renderRequestsList(rejectedRequests)}</TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Request Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Bonus Request Details</DialogTitle>
            <DialogDescription>Review the bonus request details</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {selectedRequest.employees
                      ? getInitials(selectedRequest.employees.first_name, selectedRequest.employees.last_name)
                      : "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">
                    {selectedRequest.employees
                      ? `${selectedRequest.employees.first_name} ${selectedRequest.employees.last_name}`
                      : "Unknown Employee"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.employees?.department} - {selectedRequest.employees?.position}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Amount Requested</p>
                  <p className="text-xl font-bold">{formatCurrency(selectedRequest.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Reason</p>
                <p className="text-sm bg-muted/50 rounded-lg p-3">{selectedRequest.reason}</p>
              </div>

              <div className="text-xs text-muted-foreground">Submitted on {formatDate(selectedRequest.created_at)}</div>
            </div>
          )}
          <DialogFooter>
            {selectedRequest?.status === "pending" && (
              <>
                <Button variant="outline" onClick={() => handleReject(selectedRequest.id)} disabled={isProcessing}>
                  {isProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  Reject
                </Button>
                <Button onClick={() => handleApprove(selectedRequest.id)} disabled={isProcessing}>
                  {isProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Approve
                </Button>
              </>
            )}
            {selectedRequest?.status !== "pending" && (
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
