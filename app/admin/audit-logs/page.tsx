"use client"

import { useEffect, useState, useCallback } from "react"
import { AdminLayout } from "@/components/layout/admin-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Activity,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Users,
  LogIn,
  LogOut,
  UserPlus,
  UserMinus,
  Edit,
  CheckCircle,
  XCircle,
  Eye,
  Mail,
  Gift,
  CalendarDays,
  MoreHorizontal,
  Copy,
  Trash2,
  Clock,
  Shield,
  Building,
  DollarSign,
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { getAuditLogs, getAuditLogStats, getUniqueUsers, deleteAuditLog } from "./actions"
import { useRealtimeAllAuditLogs } from "@/hooks/use-realtime-audit-logs"
import type { AuditLog, AuditEntityType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { getInitials, getStatusColor, PESO_SIGN } from "@/lib/utils"

const ENTITY_TYPES: { value: AuditEntityType | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "auth", label: "Authentication" },
  { value: "employee", label: "Employee" },
  { value: "admin", label: "Admin Account" },
  { value: "user", label: "User Account" },
  { value: "leave", label: "Leave" },
  { value: "bonus", label: "Bonus" },
  { value: "payroll", label: "Payroll" },
  { value: "payslip", label: "Payslip" },
  { value: "attendance", label: "Attendance" },
  { value: "profile", label: "Profile" },
  { value: "department", label: "Department" },
  { value: "salary", label: "Salary" },
]

const ACTION_TYPES = [
  { value: "all", label: "All Actions" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "created", label: "Created" },
  { value: "updated", label: "Updated" },
  { value: "deleted", label: "Deleted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "downloaded", label: "Downloaded" },
  { value: "time_in", label: "Time In" },
  { value: "time_out", label: "Time Out" },
  { value: "exported", label: "Exported" },
  { value: "admin_created", label: "Admin Created" },
  { value: "admin_deleted", label: "Admin Deleted" },
  { value: "department_created", label: "Department Created" },
  { value: "department_updated", label: "Department Updated" },
  { value: "department_deleted", label: "Department Deleted" },
  { value: "salary_adjustment_created", label: "Salary Adjustment Created" },
  { value: "salary_adjustment_updated", label: "Salary Adjustment Updated" },
  { value: "salary_adjustment_approved", label: "Salary Adjustment Approved" },
  { value: "salary_adjustment_rejected", label: "Salary Adjustment Rejected" },
  { value: "avatar_updated", label: "Avatar Updated" },
  { value: "avatar_removed", label: "Avatar Removed" },
]

function getActionIcon(action: string, entityType: string) {
  if (action === "login") return <LogIn className="h-4 w-4" />
  if (action === "logout") return <LogOut className="h-4 w-4" />
  if (action.includes("admin_created") || action.includes("account_created")) return <UserPlus className="h-4 w-4" />
  if (action.includes("admin_deleted") || action.includes("account_deleted")) return <UserMinus className="h-4 w-4" />
  if (action.includes("created") || action.includes("_created")) return <UserPlus className="h-4 w-4" />
  if (action.includes("deleted") || action.includes("_deleted")) return <UserMinus className="h-4 w-4" />
  if (action.includes("updated") || action.includes("_updated")) return <Edit className="h-4 w-4" />
  if (entityType === "admin" || entityType === "user") return <Shield className="h-4 w-4" />
  if (entityType === "department") return <Building className="h-4 w-4" />
  if (entityType === "salary") return <DollarSign className="h-4 w-4" />
  if (entityType === "leave") return <CalendarDays className="h-4 w-4" />
  if (entityType === "bonus") return <Gift className="h-4 w-4" />
  if (entityType === "payroll" || entityType === "payslip") return <FileText className="h-4 w-4" />
  if (action.includes("approved")) return <CheckCircle className="h-4 w-4" />
  if (action.includes("rejected")) return <XCircle className="h-4 w-4" />
  if (action.includes("viewed")) return <Eye className="h-4 w-4" />
  if (action.includes("emailed")) return <Mail className="h-4 w-4" />
  if (action.includes("downloaded") || action.includes("exported")) return <Download className="h-4 w-4" />
  return <Activity className="h-4 w-4" />
}

function formatAction(action: string): string {
  const actionMap: Record<string, string> = {
    login: "Logged In",
    logout: "Logged Out",
    create: "Created",
    read: "Viewed",
    update: "Updated",
    delete: "Deleted",
    approve: "Approved",
    reject: "Rejected",
    cancel: "Cancelled",
    download: "Downloaded",
    email: "Sent email",
    submit: "Submitted",
    time_in: "Time In",
    time_out: "Time Out",
    exported: "Exported",
    avatar_updated: "Avatar Updated",
    avatar_removed: "Avatar Removed",
  }
  return actionMap[action] || action.charAt(0).toUpperCase() + action.slice(1).replace(/_/g, " ")
}

function getUserDisplayName(log: AuditLog): string {
  if (log.user_name) return log.user_name
  if (log.user_email) return log.user_email.split("@")[0]
  return "System"
}

function getDetailedDescription(log: AuditLog): string {
  const metadata = log.metadata || {}
  const employeeName = metadata.employeeName || metadata.entityName || ""

  switch (log.action) {
    case "login":
      return `via ${metadata.method || "password"}`
    case "logout":
      return "session ended"
    case "employee_created":
      return employeeName ? `${employeeName}` : "new record"
    case "employee_updated":
      return employeeName ? `${employeeName}` : "record updated"
    case "employee_deleted":
      return employeeName ? `${employeeName}` : "record deleted"
    case "leave_requested":
      return `${metadata.leaveType || "leave"}${metadata.totalDays ? ` (${metadata.totalDays}d)` : metadata.days ? ` (${metadata.days}d)` : ""}`
    case "leave_approved":
      return employeeName ? `for ${employeeName}` : "approved"
    case "leave_rejected":
      return employeeName ? `for ${employeeName}` : "rejected"
    case "leave_cancelled":
      return employeeName ? `for ${employeeName}` : "cancelled"
    case "leave_deleted":
      return employeeName ? `for ${employeeName}` : "deleted"
    case "bonus_requested":
      return metadata.amount ? `${PESO_SIGN}${Number(metadata.amount).toLocaleString()}` : ""
    case "bonus_approved":
      return employeeName
        ? `${employeeName} - ${PESO_SIGN}${Number(metadata.amount || 0).toLocaleString()}`
        : metadata.amount
          ? `${PESO_SIGN}${Number(metadata.amount).toLocaleString()}`
          : ""
    case "bonus_rejected":
      return employeeName ? `${employeeName}` : "rejected"
    case "bonus_cancelled":
      return employeeName
        ? `${employeeName} - ${PESO_SIGN}${Number(metadata.amount || 0).toLocaleString()}`
        : metadata.amount
          ? `${PESO_SIGN}${Number(metadata.amount).toLocaleString()}`
          : ""
    case "bonus_deleted":
      return employeeName ? `${employeeName}` : "deleted"
    case "payroll_created":
      return metadata.payPeriodStart && metadata.payPeriodEnd
        ? `${metadata.payPeriodStart} - ${metadata.payPeriodEnd}`
        : ""
    case "payroll_processed":
      return metadata.employeeCount ? `${metadata.employeeCount} employees` : ""
    case "payroll_deleted":
      return metadata.payPeriodStart && metadata.payPeriodEnd
        ? `${metadata.payPeriodStart} - ${metadata.payPeriodEnd}`
        : ""
    case "payslip_sent":
      return employeeName
        ? `to ${employeeName}${metadata.employeeEmail ? ` (${metadata.employeeEmail})` : ""}${metadata.payPeriod ? ` - ${metadata.payPeriod}` : ""}`
        : metadata.employeeEmail
          ? `to ${metadata.employeeEmail}${metadata.payPeriod ? ` - ${metadata.payPeriod}` : ""}`
          : metadata.payPeriod
            ? metadata.payPeriod
            : ""
    case "payslip_viewed":
      return metadata.payPeriod || ""
    case "payslip_downloaded":
      return metadata.payPeriod || ""
    case "payslip_emailed":
      return employeeName ? `to ${employeeName}` : metadata.employeeEmail ? `to ${metadata.employeeEmail}` : ""
    case "payslip_deleted":
      return employeeName ? `${employeeName}` : ""
    case "department_created":
      return metadata.departmentName ? `${metadata.departmentName}` : "new department"
    case "department_updated":
      return metadata.departmentName ? `${metadata.departmentName}` : "department updated"
    case "department_deleted":
      return metadata.departmentName ? `${metadata.departmentName}` : "department deleted"
    case "salary_adjustment_created":
      return employeeName
        ? `${employeeName} - ${metadata.adjustmentType || "adjustment"} ${PESO_SIGN}${Number(metadata.adjustmentAmount || metadata.amount || 0).toLocaleString()}`
        : metadata.amount
          ? `${PESO_SIGN}${Number(metadata.amount).toLocaleString()}`
          : ""
    case "salary_adjustment_updated":
      return employeeName
        ? `${employeeName}`
        : metadata.amount
          ? `${PESO_SIGN}${Number(metadata.amount).toLocaleString()}`
          : ""
    case "salary_adjustment_approved":
      return employeeName
        ? `${employeeName} - ${metadata.adjustmentType || "adjustment"} ${PESO_SIGN}${Number(metadata.adjustmentAmount || metadata.amount || 0).toLocaleString()}`
        : metadata.amount
          ? `${PESO_SIGN}${Number(metadata.amount).toLocaleString()}`
          : ""
    case "salary_adjustment_rejected":
      return employeeName ? `${employeeName}` : "rejected"
    case "time_in":
      return employeeName ? `${employeeName}` : metadata.timestamp ? `at ${metadata.timestamp}` : ""
    case "time_out":
      return employeeName
        ? `${employeeName}${metadata.totalHours ? ` (${Number(metadata.totalHours).toFixed(1)} hrs)` : ""}`
        : metadata.timestamp
          ? `at ${metadata.timestamp}`
          : ""
    case "exported":
      return metadata.filename ? `file ${metadata.filename}` : ""
    case "avatar_updated":
      return employeeName ? `${employeeName}` : ""
    case "avatar_removed":
      return employeeName ? `${employeeName}` : "avatar removed"
    case "admin_created":
    case "account_created":
      return metadata.createdUserName || metadata.createdUserEmail || "new account"
    case "admin_deleted":
    case "account_deleted":
      return metadata.deletedUserName || metadata.deletedUserEmail || "account deleted"
    case "welcome_email_sent":
      return employeeName ? `to ${employeeName}` : metadata.employeeEmail ? `to ${metadata.employeeEmail}` : ""
    default:
      return ""
  }
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1)
  const [totalLogs, setTotalLogs] = useState(0)
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([])
  const [isFiltering, setIsFiltering] = useState(false)
  const [stats, setStats] = useState<{
    entityTypeStats: Record<string, number>
    roleStats: Record<string, number>
    todayCount: number
    totalCount: number
  } | null>(null)
  const [uniqueUsers, setUniqueUsers] = useState<
    Array<{ id: string; name: string | null; email: string | null; role: string }>
  >([])

  const [search, setSearch] = useState("")
  const [entityType, setEntityType] = useState<string>("all")
  const [actionType, setActionType] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null)

  const limit = 20
  const { logs: realtimeLogs, loading: realtimeLoading } = useRealtimeAllAuditLogs(100)

  useEffect(() => {
    async function fetchData() {
      const [statsResult, usersResult] = await Promise.all([getAuditLogStats(), getUniqueUsers()])
      if (statsResult.success && statsResult.data) setStats(statsResult.data)
      if (usersResult.success) setUniqueUsers(usersResult.data)
    }
    fetchData()
  }, [])

  const fetchFilteredLogs = useCallback(async () => {
    setIsFiltering(true)
    const result = await getAuditLogs({
      page,
      limit,
      entityType: entityType !== "all" ? entityType : undefined,
      action: actionType !== "all" ? actionType : undefined,
      search: search || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
    if (result.success) {
      setFilteredLogs(result.data)
      setTotalLogs(result.total)
    }
    setIsFiltering(false)
  }, [page, limit, entityType, actionType, search, dateFrom, dateTo])

  useEffect(() => {
    fetchFilteredLogs()
  }, [fetchFilteredLogs])

  const hasFilters = search || entityType !== "all" || actionType !== "all" || dateFrom || dateTo
  const displayLogs = hasFilters ? filteredLogs : realtimeLogs.slice(0, limit)
  const loading = hasFilters ? isFiltering : realtimeLoading
  const totalPages = Math.ceil(totalLogs / limit)

  const loginCount = realtimeLogs.filter((log) => log.action === "login").length
  const logoutCount = realtimeLogs.filter((log) => log.action === "logout").length

  const handleExport = () => {
    const csvContent = [
      ["Timestamp", "User", "Email", "Role", "Action", "Entity Type", "Entity ID"].join(","),
      ...displayLogs.map((log) =>
        [
          format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
          log.user_name || log.user_email?.split("@")[0] || "System",
          log.user_email || "-",
          log.user_role,
          log.action,
          log.entity_type,
          log.entity_id || "-",
        ].join(","),
      ),
    ].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log)
    setShowDetailsDialog(true)
  }

  const handleDeleteLog = async (id: string) => {
    if (!confirm("Are you sure you want to delete this audit log entry?")) return
    setDeletingLogId(id)
    try {
      const result = await deleteAuditLog(id)
      if (result.success) {
        fetchFilteredLogs()
      }
    } finally {
      setDeletingLogId(null)
    }
  }

  return (
    <AdminLayout title="Audit Logs" subtitle="Track and monitor all system activities">
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-muted-foreground">Logins</span>
              </div>
              <span className="text-sm font-semibold">{loginCount}</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                <span className="text-sm text-muted-foreground">Logouts</span>
              </div>
              <span className="text-sm font-semibold">{logoutCount}</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-sm text-muted-foreground">Today</span>
              </div>
              <span className="text-sm font-semibold">{stats?.todayCount || 0}</span>
            </div>
            <div className="hidden items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-2 lg:flex">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Users</span>
              </div>
              <span className="text-sm font-semibold">{uniqueUsers.length}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} className="w-fit bg-transparent">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9 bg-card border-border/50"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <Select
            value={entityType}
            onValueChange={(v) => {
              setEntityType(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[160px] bg-card border-border/50">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={actionType}
            onValueChange={(v) => {
              setActionType(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[160px] bg-card border-border/50">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            placeholder="From"
            className="w-[140px] bg-card border-border/50"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value)
              setPage(1)
            }}
          />
          <Input
            type="date"
            placeholder="To"
            className="w-[140px] bg-card border-border/50"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value)
              setPage(1)
            }}
          />
        </div>

        {/* Activity List */}
        <Card className="border-border/50 overflow-hidden">
          <div className="divide-y divide-border/50">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))
            ) : displayLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No activities found</p>
                <p className="text-sm text-muted-foreground/70">Try adjusting your filters</p>
              </div>
            ) : (
              displayLogs.map((log) => {
                const statusColor = getStatusColor(log.action)
                const description = getDetailedDescription(log)
                return (
                  <div key={log.id} className="group flex items-center gap-4 p-4 transition-colors hover:bg-muted/30">
                    {/* Status Indicator */}
                    <div className="flex items-center justify-center">
                      <span className={cn("h-2.5 w-2.5 rounded-full", statusColor.dot)} />
                    </div>

                    {/* User Info */}
                    <Avatar className="h-9 w-9 border border-border/50">
                      <AvatarFallback className="bg-card text-xs font-medium">
                        {getInitials(log.user_name, log.user_email)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">{getUserDisplayName(log)}</span>
                        <Badge variant="outline" className="text-xs font-normal capitalize">
                          {log.user_role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn("text-sm font-medium", statusColor.text)}>{formatAction(log.action)}</span>
                        {description && (
                          <>
                            <span className="text-muted-foreground/50">·</span>
                            <span className="text-sm text-muted-foreground truncate">{description}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Entity Type Badge */}
                    <Badge variant="secondary" className="hidden sm:flex capitalize text-xs">
                      {log.entity_type}
                    </Badge>

                    {/* Timestamp */}
                    <div className="flex flex-col items-end gap-0.5 text-sm">
                      <span className="text-muted-foreground">{format(new Date(log.created_at), "MMM d, yyyy")}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground/70">
                          {format(new Date(log.created_at), "h:mm a")}
                        </span>
                        <span className="hidden md:inline text-xs text-muted-foreground/50">
                          ({formatDistanceToNow(new Date(log.created_at), { addSuffix: true })})
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={deletingLogId === log.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleViewDetails(log)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyId(log.id)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Log ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteLog(log.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Log
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {/* Pagination */}
        {hasFilters && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalLogs)} of {totalLogs} results
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-1 px-2">
                <span className="text-sm font-medium">{page}</span>
                <span className="text-sm text-muted-foreground">of {totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Audit Log Details
              </DialogTitle>
              <DialogDescription>Complete information about this activity</DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Log ID</p>
                    <p className="text-sm font-mono bg-muted px-2 py-1 rounded truncate">{selectedLog.id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">User</p>
                    <p className="text-sm font-medium">{getUserDisplayName(selectedLog)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm">{selectedLog.user_email || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Role</p>
                    <Badge variant="outline" className="capitalize">
                      {selectedLog.user_role}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Action</p>
                    <Badge className={cn(getStatusColor(selectedLog.action).text, "bg-transparent border")}>
                      {formatAction(selectedLog.action)}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Entity Type</p>
                    <Badge variant="secondary" className="capitalize">
                      {selectedLog.entity_type}
                    </Badge>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <p className="text-xs text-muted-foreground">Timestamp</p>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(selectedLog.created_at), "MMMM d, yyyy 'at' h:mm:ss a")}
                    </div>
                  </div>
                  {selectedLog.entity_id && (
                    <div className="space-y-1 col-span-2">
                      <p className="text-xs text-muted-foreground">Entity ID</p>
                      <p className="text-sm font-mono bg-muted px-2 py-1 rounded truncate">{selectedLog.entity_id}</p>
                    </div>
                  )}
                  {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                    <div className="space-y-1 col-span-2">
                      <p className="text-xs text-muted-foreground">Additional Details</p>
                      <div className="bg-muted rounded-lg p-3 space-y-2">
                        {Object.entries(selectedLog.metadata).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={() => handleCopyId(selectedLog.id)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy ID
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowDetailsDialog(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
