"use client"

import * as React from "react"
import {
  Plus,
  Download,
  Edit,
  Eye,
  Filter,
  Search,
  Trash,
  RefreshCw,
  Loader2,
  MoreHorizontal,
  Check,
  X,
  Clock,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { usePayrollStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency, formatDate, getInitials, cn } from "@/lib/utils"
import type { SalaryAdjustment, Employee } from "@/lib/types"
import { getAllEmployees } from "@/app/admin/employees/actions"
import {
  getAllSalaryAdjustments,
  createSalaryAdjustment,
  updateSalaryAdjustment as updateSalaryAdjustmentAction,
  approveSalaryAdjustment as approveSalaryAdjustmentAction,
  rejectSalaryAdjustment as rejectSalaryAdjustmentAction,
  deleteSalaryAdjustment as deleteSalaryAdjustmentAction,
} from "./actions"
import { AdminLayout } from "@/components/layout/admin-layout"

const typeColors = {
  increase: "text-emerald-600",
  decrease: "text-red-600",
  bonus: "text-emerald-600",
  deduction: "text-red-600",
}

const statusColors = {
  pending: "text-warning",
  approved: "text-success",
  rejected: "text-destructive",
}

export default function SalaryPage() {
  const { employees, setEmployees } = usePayrollStore()
  const [salaryAdjustments, setSalaryAdjustments] = React.useState<SalaryAdjustment[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [viewAdjustment, setViewAdjustment] = React.useState<SalaryAdjustment | null>(null)
  const [editAdjustment, setEditAdjustment] = React.useState<SalaryAdjustment | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [adjustmentToDelete, setAdjustmentToDelete] = React.useState<string | null>(null)
  const [mounted, setMounted] = React.useState(false)
  const [filterStatus, setFilterStatus] = React.useState("all")
  const [filterType, setFilterType] = React.useState("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  const { toast } = useToast()
  const [isLoadingEmployees, setIsLoadingEmployees] = React.useState(true)
  const [isLoadingAdjustments, setIsLoadingAdjustments] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [newAdjustment, setNewAdjustment] = React.useState({
    employeeId: "",
    type: "increase" as SalaryAdjustment["type"],
    amount: "",
    reason: "",
    effectiveDate: new Date().toISOString().split("T")[0],
  })

  React.useEffect(() => {
    setMounted(true)
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoadingEmployees(true)
    setIsLoadingAdjustments(true)

    console.log("[v0] Salary page: Fetching employees and adjustments...")

    const [employeesResult, adjustmentsResult] = await Promise.all([getAllEmployees(), getAllSalaryAdjustments()])

    console.log("[v0] Salary page: Employees result:", employeesResult.success, employeesResult.data?.length || 0)
    console.log("[v0] Salary page: Adjustments result:", adjustmentsResult.success, adjustmentsResult.error)

    if (employeesResult.success && employeesResult.data) {
      const mappedEmployees: Employee[] = employeesResult.data.map((emp) => ({
        id: emp.id,
        email: emp.email,
        firstName: emp.first_name,
        lastName: emp.last_name,
        phone: emp.phone || "",
        department: emp.department,
        position: emp.position,
        employeeNumber: emp.employee_number,
        hireDate: emp.hire_date,
        monthlySalary: emp.monthly_salary,
        status: emp.status as Employee["status"],
        avatarUrl: emp.avatar_url,
        userId: emp.user_id,
        employmentType: "full-time",
        payFrequency: "monthly",
        createdAt: emp.created_at,
        updatedAt: emp.updated_at,
      }))
      setEmployees(mappedEmployees)
      console.log("[v0] Salary page: Set", mappedEmployees.length, "employees")
    }

    if (adjustmentsResult.success && adjustmentsResult.data) {
      setSalaryAdjustments(adjustmentsResult.data)
      console.log("[v0] Salary page: Set", adjustmentsResult.data.length, "adjustments")
    } else if (adjustmentsResult.error) {
      console.log("[v0] Salary page: Adjustments error -", adjustmentsResult.error)
    }

    setIsLoadingEmployees(false)
    setIsLoadingAdjustments(false)
  }

  const handleRefresh = () => {
    fetchData()
    toast({
      title: "Refreshed",
      description: "Data has been refreshed from the database.",
    })
  }

  const handleAddAdjustment = async () => {
    console.log("[v0] Adding adjustment:", newAdjustment)

    if (!newAdjustment.employeeId || !newAdjustment.amount || !newAdjustment.reason) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    const result = await createSalaryAdjustment({
      employeeId: newAdjustment.employeeId,
      type: newAdjustment.type,
      amount: Number.parseFloat(newAdjustment.amount),
      reason: newAdjustment.reason,
      effectiveDate: new Date(newAdjustment.effectiveDate),
      status: "pending",
    })

    console.log("[v0] Create adjustment result:", result.success, result.error)

    setIsSubmitting(false)

    if (result.success && result.data) {
      setSalaryAdjustments((prev) => [result.data!, ...prev])
      setIsAddDialogOpen(false)
      setNewAdjustment({
        employeeId: "",
        type: "increase",
        amount: "",
        reason: "",
        effectiveDate: new Date().toISOString().split("T")[0],
      })
      toast({
        title: "Adjustment Added",
        description: "The salary adjustment has been added successfully.",
      })
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to add salary adjustment.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateAdjustment = async () => {
    if (!editAdjustment) return

    setIsSubmitting(true)

    const result = await updateSalaryAdjustmentAction(editAdjustment.id, {
      employeeId: editAdjustment.employeeId,
      type: editAdjustment.type,
      amount: editAdjustment.amount,
      reason: editAdjustment.reason,
      effectiveDate: editAdjustment.effectiveDate,
    })

    setIsSubmitting(false)

    if (result.success && result.data) {
      setSalaryAdjustments((prev) => prev.map((adj) => (adj.id === editAdjustment.id ? result.data! : adj)))
      setEditAdjustment(null)
      toast({
        title: "Adjustment Updated",
        description: "The salary adjustment has been updated successfully.",
      })
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update salary adjustment.",
        variant: "destructive",
      })
    }
  }

  const handleApprove = async (id: string) => {
    const result = await approveSalaryAdjustmentAction(id)

    if (result.success && result.data) {
      setSalaryAdjustments((prev) => prev.map((adj) => (adj.id === id ? result.data! : adj)))
      toast({
        title: "Adjustment Approved",
        description: "The salary adjustment has been approved.",
      })
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to approve salary adjustment.",
        variant: "destructive",
      })
    }
  }

  const handleReject = async (id: string) => {
    const result = await rejectSalaryAdjustmentAction(id)

    if (result.success && result.data) {
      setSalaryAdjustments((prev) => prev.map((adj) => (adj.id === id ? result.data! : adj)))
      toast({
        title: "Adjustment Rejected",
        description: "The salary adjustment has been rejected.",
      })
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to reject salary adjustment.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!adjustmentToDelete) return

    const result = await deleteSalaryAdjustmentAction(adjustmentToDelete)

    if (result.success) {
      setSalaryAdjustments((prev) => prev.filter((adj) => adj.id !== adjustmentToDelete))
      setDeleteDialogOpen(false)
      setAdjustmentToDelete(null)
      toast({
        title: "Adjustment Deleted",
        description: "The salary adjustment has been deleted.",
      })
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete salary adjustment.",
        variant: "destructive",
      })
    }
  }

  const handleExportAdjustments = () => {
    const csvContent = [
      ["Employee", "Type", "Amount", "Reason", "Effective Date", "Status"],
      ...salaryAdjustments.map((adj) => {
        const employee = employees.find((e) => e.id === adj.employeeId)
        return [
          `${employee?.firstName || ""} ${employee?.lastName || ""}`,
          adj.type,
          adj.amount,
          adj.reason,
          formatDate(adj.effectiveDate),
          adj.status,
        ]
      }),
    ]
      .map((row) => row.join(","))
      .join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "salary-adjustments.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const adjustmentsWithEmployees = salaryAdjustments.map((adj) => ({
    ...adj,
    employee: employees.find((e) => e.id === adj.employeeId),
  }))

  const filteredAdjustments = React.useMemo(() => {
    return adjustmentsWithEmployees.filter((adj) => {
      const matchesStatus = filterStatus === "all" || adj.status === filterStatus
      const matchesType = filterType === "all" || adj.type === filterType
      const matchesSearch =
        searchQuery === "" ||
        `${adj.employee?.firstName} ${adj.employee?.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        adj.reason.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesStatus && matchesType && matchesSearch
    })
  }, [adjustmentsWithEmployees, filterStatus, filterType, searchQuery])

  const stats = {
    pending: salaryAdjustments.filter((a) => a.status === "pending").length,
    approved: salaryAdjustments.filter((a) => a.status === "approved").length,
    rejected: salaryAdjustments.filter((a) => a.status === "rejected").length,
    totalApproved: salaryAdjustments
      .filter((a) => a.status === "approved" && (a.type === "increase" || a.type === "bonus"))
      .reduce((sum, a) => sum + a.amount, 0),
  }

  if (!mounted) return null

  const isLoading = isLoadingEmployees || isLoadingAdjustments

  return (
    <AdminLayout title="Salary Adjustments" subtitle="Manage employee salary changes">
      <div className="flex flex-col gap-6">
        {/* Header Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Salary Adjustments</h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Manage employee salary increases, decreases, bonuses, and deductions
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportAdjustments}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Adjustment
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{stats.approved}</div>
              <p className="text-xs text-muted-foreground">This period</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <X className="h-4 w-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <p className="text-xs text-muted-foreground">This period</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Approved</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(stats.totalApproved)}</div>
              <p className="text-xs text-muted-foreground">Total value</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by employee or reason..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="increase">Increase</SelectItem>
                  <SelectItem value="decrease">Decrease</SelectItem>
                  <SelectItem value="bonus">Bonus</SelectItem>
                  <SelectItem value="deduction">Deduction</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Adjustments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Salary Adjustments</CardTitle>
            <CardDescription>{filteredAdjustments.length} adjustment(s) found</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading adjustments...</span>
              </div>
            ) : filteredAdjustments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No salary adjustments found. Click "Add Adjustment" to create one.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="hidden sm:table-cell">Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="hidden md:table-cell">Reason</TableHead>
                      <TableHead className="hidden lg:table-cell">Effective Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdjustments.map((adjustment) => (
                      <TableRow key={adjustment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={adjustment.employee?.avatarUrl || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(
                                  `${adjustment.employee?.firstName || ""} ${adjustment.employee?.lastName || ""}`,
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {adjustment.employee?.firstName} {adjustment.employee?.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate hidden sm:block">
                                {adjustment.employee?.position}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className={cn(typeColors[adjustment.type])}>
                            {adjustment.type.charAt(0).toUpperCase() + adjustment.type.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn("font-medium", typeColors[adjustment.type])}>
                          {adjustment.type === "decrease" || adjustment.type === "deduction" ? "-" : "+"}
                          {formatCurrency(adjustment.amount)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                          {adjustment.reason}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{formatDate(adjustment.effectiveDate)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              adjustment.status === "approved"
                                ? "default"
                                : adjustment.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="text-xs"
                          >
                            {adjustment.status.charAt(0).toUpperCase() + adjustment.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewAdjustment(adjustment)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {adjustment.status === "pending" && (
                                <>
                                  <DropdownMenuItem onClick={() => setEditAdjustment(adjustment)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleApprove(adjustment.id)}
                                    className="text-emerald-600"
                                  >
                                    <Check className="h-4 w-4 mr-2" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleReject(adjustment.id)}
                                    className="text-red-600"
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  setAdjustmentToDelete(adjustment.id)
                                  setDeleteDialogOpen(true)
                                }}
                                className="text-destructive"
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Adjustment Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Salary Adjustment</DialogTitle>
              <DialogDescription>Create a new salary adjustment for an employee.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="employee">Employee</Label>
                <Select
                  value={newAdjustment.employeeId}
                  onValueChange={(value) => setNewAdjustment((prev) => ({ ...prev, employeeId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} - {emp.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={newAdjustment.type}
                  onValueChange={(value) =>
                    setNewAdjustment((prev) => ({ ...prev, type: value as SalaryAdjustment["type"] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">Increase</SelectItem>
                    <SelectItem value="decrease">Decrease</SelectItem>
                    <SelectItem value="bonus">Bonus</SelectItem>
                    <SelectItem value="deduction">Deduction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={newAdjustment.amount}
                  onChange={(e) => setNewAdjustment((prev) => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="effectiveDate">Effective Date</Label>
                <Input
                  id="effectiveDate"
                  type="date"
                  value={newAdjustment.effectiveDate}
                  onChange={(e) => setNewAdjustment((prev) => ({ ...prev, effectiveDate: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter reason for adjustment"
                  value={newAdjustment.reason}
                  onChange={(e) => setNewAdjustment((prev) => ({ ...prev, reason: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAdjustment} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Adjustment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Adjustment Dialog */}
        <Dialog open={!!viewAdjustment} onOpenChange={() => setViewAdjustment(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Adjustment Details</DialogTitle>
            </DialogHeader>
            {viewAdjustment && (
              <div className="grid gap-4 py-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={employees.find((e) => e.id === viewAdjustment.employeeId)?.avatarUrl || undefined}
                    />
                    <AvatarFallback>
                      {getInitials(
                        `${employees.find((e) => e.id === viewAdjustment.employeeId)?.firstName || ""} ${employees.find((e) => e.id === viewAdjustment.employeeId)?.lastName || ""}`,
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {employees.find((e) => e.id === viewAdjustment.employeeId)?.firstName}{" "}
                      {employees.find((e) => e.id === viewAdjustment.employeeId)?.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {employees.find((e) => e.id === viewAdjustment.employeeId)?.position}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Type</Label>
                    <p className={cn("font-medium capitalize", typeColors[viewAdjustment.type])}>
                      {viewAdjustment.type}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Amount</Label>
                    <p className={cn("font-medium", typeColors[viewAdjustment.type])}>
                      {viewAdjustment.type === "decrease" || viewAdjustment.type === "deduction" ? "-" : "+"}
                      {formatCurrency(viewAdjustment.amount)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Effective Date</Label>
                    <p className="font-medium">{formatDate(viewAdjustment.effectiveDate)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <Badge
                      variant={
                        viewAdjustment.status === "approved"
                          ? "default"
                          : viewAdjustment.status === "rejected"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {viewAdjustment.status.charAt(0).toUpperCase() + viewAdjustment.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Reason</Label>
                  <p className="font-medium">{viewAdjustment.reason}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Adjustment Dialog */}
        <Dialog open={!!editAdjustment} onOpenChange={() => setEditAdjustment(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Salary Adjustment</DialogTitle>
              <DialogDescription>Update the salary adjustment details.</DialogDescription>
            </DialogHeader>
            {editAdjustment && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-employee">Employee</Label>
                  <Select
                    value={editAdjustment.employeeId}
                    onValueChange={(value) =>
                      setEditAdjustment((prev) => (prev ? { ...prev, employeeId: value } : null))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} - {emp.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-type">Type</Label>
                  <Select
                    value={editAdjustment.type}
                    onValueChange={(value) =>
                      setEditAdjustment((prev) => (prev ? { ...prev, type: value as SalaryAdjustment["type"] } : null))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increase">Increase</SelectItem>
                      <SelectItem value="decrease">Decrease</SelectItem>
                      <SelectItem value="bonus">Bonus</SelectItem>
                      <SelectItem value="deduction">Deduction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-amount">Amount</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    value={editAdjustment.amount}
                    onChange={(e) =>
                      setEditAdjustment((prev) =>
                        prev ? { ...prev, amount: Number.parseFloat(e.target.value) } : null,
                      )
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-effectiveDate">Effective Date</Label>
                  <Input
                    id="edit-effectiveDate"
                    type="date"
                    value={
                      editAdjustment.effectiveDate instanceof Date
                        ? editAdjustment.effectiveDate.toISOString().split("T")[0]
                        : new Date(editAdjustment.effectiveDate).toISOString().split("T")[0]
                    }
                    onChange={(e) =>
                      setEditAdjustment((prev) => (prev ? { ...prev, effectiveDate: new Date(e.target.value) } : null))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-reason">Reason</Label>
                  <Textarea
                    id="edit-reason"
                    value={editAdjustment.reason}
                    onChange={(e) => setEditAdjustment((prev) => (prev ? { ...prev, reason: e.target.value } : null))}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditAdjustment(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateAdjustment} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Adjustment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this salary adjustment? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  )
}
