"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import {
  MoreHorizontal,
  ArrowUpDown,
  Check,
  X,
  Download,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Calendar,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { AdminLayout } from "@/components/layout/admin-layout"
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { StatCard } from "@/components/ui/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { formatDate, getInitials, cn } from "@/lib/utils"
import { approveLeaveRequest, rejectLeaveRequest } from "./actions"
import { createClient } from "@/lib/supabase/client"
import { useRealtimeLeaveRequests } from "@/hooks/use-realtime-employee"
import { AdminLeaveCalendar } from "@/components/admin-leave-calendar"
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

const leaveTypeColors: Record<string, string> = {
  vacation: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  sick: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  emergency: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  maternity: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
  paternity: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  bereavement: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  unpaid: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  cancelled: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
}

export default function LeavePage() {
  const {
    leaveRequests,
    pendingLeaveRequests,
    approvedLeaveRequests,
    loading: isLoading,
    refetch: fetchLeaveRequests,
  } = useRealtimeLeaveRequests()

  const [viewLeave, setViewLeave] = React.useState<LeaveRequestWithEmployee | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false)
  const [leaveToReject, setLeaveToReject] = React.useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = React.useState("")
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [filterStatus, setFilterStatus] = React.useState("all")
  const [filterType, setFilterType] = React.useState("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState("requests")
  const { toast } = useToast()

  React.useEffect(() => {
    // Get current user ID
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUserId(data.user.id)
      }
    })
  }, [])

  const handleApprove = async (leaveId: string) => {
    if (!currentUserId) return

    setIsProcessing(true)
    const result = await approveLeaveRequest(leaveId, currentUserId)
    setIsProcessing(false)

    if (result.success) {
      toast({
        title: "Leave Approved",
        description: "The leave request has been approved.",
      })
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to approve leave request",
        variant: "destructive",
      })
    }
  }

  const handleReject = async () => {
    if (!leaveToReject || !currentUserId) return

    setIsProcessing(true)
    const result = await rejectLeaveRequest(leaveToReject, currentUserId, rejectionReason)
    setIsProcessing(false)

    if (result.success) {
      toast({
        title: "Leave Rejected",
        description: "The leave request has been rejected.",
      })
      setRejectDialogOpen(false)
      setLeaveToReject(null)
      setRejectionReason("")
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to reject leave request",
        variant: "destructive",
      })
    }
  }

  const handleExportLeaves = () => {
    const csvContent = [
      ["Employee", "Department", "Type", "Start Date", "End Date", "Days", "Reason", "Status"],
      ...filteredLeaves.map((leave) => [
        leave.employees ? `${leave.employees.first_name} ${leave.employees.last_name}` : "Unknown",
        leave.employees?.department || "N/A",
        leave.leave_type,
        formatDate(leave.start_date),
        formatDate(leave.end_date),
        leave.total_days,
        leave.reason || "",
        leave.status,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `leave-requests-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Export Complete", description: "Leave requests have been exported to CSV." })
  }

  const filteredLeaves = React.useMemo(() => {
    return leaveRequests.filter((leave) => {
      const matchesStatus = filterStatus === "all" || leave.status === filterStatus
      const matchesType = filterType === "all" || leave.leave_type === filterType
      const employeeName = leave.employees
        ? `${leave.employees.first_name} ${leave.employees.last_name}`.toLowerCase()
        : ""
      const matchesSearch =
        searchQuery === "" ||
        employeeName.includes(searchQuery.toLowerCase()) ||
        (leave.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      return matchesStatus && matchesType && matchesSearch
    })
  }, [leaveRequests, filterStatus, filterType, searchQuery])

  const stats = {
    pending: leaveRequests.filter((l) => l.status === "pending").length,
    approved: leaveRequests.filter((l) => l.status === "approved").length,
    rejected: leaveRequests.filter((l) => l.status === "rejected").length,
    totalDays: leaveRequests.filter((l) => l.status === "approved").reduce((sum, l) => sum + l.total_days, 0),
  }

  const columns: ColumnDef<LeaveRequestWithEmployee>[] = [
    {
      accessorKey: "employees",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 rounded-lg"
        >
          Employee
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const employee = row.original.employees
        if (!employee) return <span className="text-muted-foreground">Unknown</span>
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 ring-2 ring-primary/10">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {getInitials(employee.first_name, employee.last_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">
                {employee.first_name} {employee.last_name}
              </p>
              <p className="text-xs text-muted-foreground">{employee.department}</p>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "leave_type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("leave_type") as string
        return (
          <Badge
            className={cn(leaveTypeColors[type] || leaveTypeColors.unpaid, "border rounded-lg font-medium")}
            variant="outline"
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Badge>
        )
      },
    },
    {
      accessorKey: "start_date",
      header: "Duration",
      cell: ({ row }) => {
        const leave = row.original
        return (
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
            </p>
            <p className="text-xs text-muted-foreground">{leave.total_days} day(s)</p>
          </div>
        )
      },
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => (
        <p className="text-sm max-w-[200px] truncate text-muted-foreground" title={row.getValue("reason") || ""}>
          {row.getValue("reason") || "-"}
        </p>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge className={cn(statusColors[status], "border rounded-lg font-medium")} variant="outline">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const leave = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setViewLeave(leave)} className="rounded-lg">
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              {leave.status === "pending" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleApprove(leave.id)}
                    className="rounded-lg text-emerald-600"
                    disabled={isProcessing}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setLeaveToReject(leave.id)
                      setRejectDialogOpen(true)
                    }}
                    className="rounded-lg text-red-600"
                    disabled={isProcessing}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  if (isLoading) {
    return (
      <AdminLayout title="Leave Management" subtitle="Loading leave requests...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Leave Management" subtitle={`${stats.pending} pending requests`}>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="cursor-pointer" onClick={() => setFilterStatus("pending")}>
            <StatCard
              title="Pending"
              value={stats.pending}
              icon={<Clock className="h-5 w-5" />}
              variant="warning"
              className="h-full hover:scale-[1.02] transition-transform"
            />
          </div>
          <div className="cursor-pointer" onClick={() => setFilterStatus("approved")}>
            <StatCard
              title="Approved"
              value={stats.approved}
              icon={<CheckCircle2 className="h-5 w-5" />}
              variant="success"
              className="h-full hover:scale-[1.02] transition-transform"
            />
          </div>
          <div className="cursor-pointer" onClick={() => setFilterStatus("rejected")}>
            <StatCard
              title="Rejected"
              value={stats.rejected}
              icon={<XCircle className="h-5 w-5" />}
              variant="default"
              className="h-full hover:scale-[1.02] transition-transform"
            />
          </div>
          <StatCard
            title="Total Days Used"
            value={stats.totalDays}
            description="approved leaves"
            icon={<Calendar className="h-5 w-5" />}
            variant="info"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="rounded-xl bg-accent/50 p-1">
            <TabsTrigger value="requests" className="rounded-lg">
              Leave Requests
            </TabsTrigger>
            <TabsTrigger value="calendar" className="rounded-lg">
              Leave Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4 mt-4">
            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-[220px] rounded-xl bg-accent/50 border-transparent focus-visible:border-primary"
                  />
                </div>
                <Tabs value={filterStatus} onValueChange={setFilterStatus}>
                  <TabsList className="rounded-xl bg-accent/50 p-1">
                    <TabsTrigger value="all" className="rounded-lg">
                      All
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="rounded-lg">
                      Pending
                    </TabsTrigger>
                    <TabsTrigger value="approved" className="rounded-lg">
                      Approved
                    </TabsTrigger>
                    <TabsTrigger value="rejected" className="rounded-lg">
                      Rejected
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[140px] rounded-xl bg-accent/50 border-transparent">
                    <SelectValue placeholder="Leave Type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="vacation">Vacation</SelectItem>
                    <SelectItem value="sick">Sick</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="maternity">Maternity</SelectItem>
                    <SelectItem value="paternity">Paternity</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl bg-transparent"
                  onClick={fetchLeaveRequests}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="gap-2 rounded-xl bg-transparent" onClick={handleExportLeaves}>
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>

            {/* Data Table */}
            <DataTable
              columns={columns}
              data={filteredLeaves}
              searchKey="employees"
              searchPlaceholder="Search leave requests..."
            />
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Approved Leave Calendar
                </CardTitle>
                <CardDescription>View all approved employee leaves on the calendar</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminLeaveCalendar
                  leaveRequests={leaveRequests as LeaveRequestWithEmployee[]}
                  showOnlyApproved={true}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* View Leave Details Dialog */}
      <Dialog open={!!viewLeave} onOpenChange={() => setViewLeave(null)}>
        <DialogContent className="rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
            <DialogDescription>
              Submitted on {viewLeave?.created_at ? formatDate(viewLeave.created_at) : "N/A"}
            </DialogDescription>
          </DialogHeader>
          {viewLeave && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {viewLeave.employees
                      ? getInitials(viewLeave.employees.first_name, viewLeave.employees.last_name)
                      : "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">
                    {viewLeave.employees
                      ? `${viewLeave.employees.first_name} ${viewLeave.employees.last_name}`
                      : "Unknown"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {viewLeave.employees?.department} - {viewLeave.employees?.position}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Leave Type</p>
                  <Badge className={cn(leaveTypeColors[viewLeave.leave_type] || leaveTypeColors.unpaid, "mt-1")}>
                    {viewLeave.leave_type.charAt(0).toUpperCase() + viewLeave.leave_type.slice(1)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={cn(statusColors[viewLeave.status], "mt-1")}>
                    {viewLeave.status.charAt(0).toUpperCase() + viewLeave.status.slice(1)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">{formatDate(viewLeave.start_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium">{formatDate(viewLeave.end_date)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Total Days</p>
                  <p className="font-medium">{viewLeave.total_days} day(s)</p>
                </div>
                {viewLeave.reason && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Reason</p>
                    <p className="font-medium">{viewLeave.reason}</p>
                  </div>
                )}
                {viewLeave.rejection_reason && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Rejection Reason</p>
                    <p className="font-medium text-red-600">{viewLeave.rejection_reason}</p>
                  </div>
                )}
              </div>

              {viewLeave.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => {
                      handleApprove(viewLeave.id)
                      setViewLeave(null)
                    }}
                    disabled={isProcessing}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      setLeaveToReject(viewLeave.id)
                      setRejectDialogOpen(true)
                      setViewLeave(null)
                    }}
                    disabled={isProcessing}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Leave Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this leave request (optional)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isProcessing}>
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
