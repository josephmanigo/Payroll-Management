"use client"

import * as React from "react"
import Link from "next/link"
import { useState } from "react"
import {
  Plus,
  Calendar,
  Wallet,
  CheckCircle2,
  Clock,
  Eye,
  Download,
  Mail,
  MoreHorizontal,
  Trash2,
  FileText,
  Users,
  Printer,
  Loader2,
  Pencil,
} from "lucide-react"
import { AdminLayout } from "@/components/layout/admin-layout"
import { PayrollSummaryCard } from "@/components/ui/payroll-summary-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatCurrency, formatDate, getInitials, PESO_SIGN } from "@/lib/utils"
import { usePayrollStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import type { PayrollRun, PayrollItem } from "@/lib/types"
import { SendPayslipDialog } from "@/components/send-payslip-dialog"
import { deletePayslipsByPeriod, deletePayrollByPeriod, getAllPayrollRuns } from "./actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { calculateSSS, calculatePhilHealth, calculatePagIbig, calculateWithholdingTax } from "@/lib/ph-tax-calculator"
import { Checkbox } from "@/components/ui/checkbox"

export default function PayrollPage() {
  const router = useRouter()
  const {
    payrollRuns,
    payrollItems,
    employees,
    processPayroll,
    finalizePayroll,
    updatePayrollRun,
    approvePayroll,
    updatePayrollItem,
    setPayrollRuns,
    setPayrollItems,
  } = usePayrollStore()
  const [filter, setFilter] = React.useState<string>("all")
  const [mounted, setMounted] = React.useState(false)
  const [selectedPayroll, setSelectedPayroll] = React.useState<PayrollRun | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [payrollToDelete, setPayrollToDelete] = React.useState<string | null>(null)
  const [sendPayslipDialogOpen, setSendPayslipDialogOpen] = React.useState(false)
  const [payrollForSending, setPayrollForSending] = React.useState<PayrollRun | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [editingItem, setEditingItem] = React.useState<PayrollItem | null>(null)
  const [editBasicPay, setEditBasicPay] = React.useState("")
  const [syncToEmployee, setSyncToEmployee] = React.useState(true)
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoadingPayroll, setIsLoadingPayroll] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const groupedPayrolls = payrollRuns.reduce((acc, payroll) => {
    const key = `${payroll.payPeriodStart} - ${payroll.payPeriodEnd}`
    if (!acc[key]) {
      acc[key] = { ...payroll, employees: [] }
    }
    acc[key].employees.push(payroll)
    return acc
  }, {})

  React.useEffect(() => {
    setMounted(true)

    const fetchPayroll = async () => {
      setIsLoadingPayroll(true)
      try {
        const result = await getAllPayrollRuns()
        console.log("[v0] Payroll fetch result:", result)
        if (result.success) {
          setPayrollRuns(result.payrollRuns)
          setPayrollItems(result.payrollItems)
        } else {
          console.error("[v0] Failed to fetch payroll:", result.error)
          toast({
            title: "Error",
            description: "Failed to load payroll data",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("[v0] Error fetching payroll:", error)
      } finally {
        setIsLoadingPayroll(false)
      }
    }

    fetchPayroll()
  }, [toast])

  if (!mounted || isLoadingPayroll) {
    return (
      <AdminLayout title="Payroll" subtitle="Manage payroll runs and process payments">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    )
  }

  const filteredPayrolls = payrollRuns
    .filter((payroll) => {
      if (filter === "all") return true
      return payroll.status === filter
    })
    .filter((payroll) => {
      if (!searchQuery) return true
      return `${payroll.payPeriodStart} - ${payroll.payPeriodEnd}`.toLowerCase().includes(searchQuery.toLowerCase())
    })

  const statusCounts = {
    all: payrollRuns.length,
    draft: payrollRuns.filter((p) => p.status === "draft").length,
    processing: payrollRuns.filter((p) => p.status === "processing").length,
    approved: payrollRuns.filter((p) => p.status === "approved").length,
    finalized: payrollRuns.filter((p) => p.status === "finalized").length,
  }

  const ytdPayroll = payrollRuns
    .filter((p) => p.status === "finalized" || p.status === "approved")
    .reduce((sum, p) => sum + p.totalNet, 0)

  const upcomingPayDate = payrollRuns.find((p) => p.status === "approved")?.payDate

  const getPayrollEmployees = (payrollId: string) => {
    return payrollItems
      .filter((item) => item.payrollRunId === payrollId)
      .map((item) => ({
        ...item,
        employee: employees.find((e) => e.id === item.employeeId),
      }))
  }

  const handleViewPayroll = (payroll: PayrollRun) => {
    setSelectedPayroll(payroll)
    setViewDialogOpen(true)
  }

  const handleDeletePayroll = async (id: string) => {
    setIsDeleting(true)
    try {
      // Find the payroll to get the period dates
      const payroll = payrollRuns.find((p) => p.id === id)

      if (!payroll) {
        toast({
          title: "Error",
          description: "Payroll not found.",
          variant: "destructive",
        })
        return
      }

      // This avoids timezone issues with Date.toISOString()
      const [startDate, endDate] = id.split("_")

      console.log("[v0] Deleting payroll with ID:", id)
      console.log("[v0] Parsed dates - start:", startDate, "end:", endDate)

      // Delete all payslips for this period
      const result = await deletePayrollByPeriod(startDate, endDate)

      console.log("[v0] Delete result:", result)

      if (result.success) {
        toast({
          title: "Payroll Deleted",
          description: `${result.count} payslip(s) have been permanently deleted.`,
        })
        // Refresh the page to reflect changes
        window.location.reload()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete payroll.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Delete payroll error:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setPayrollToDelete(null)
    }
  }

  const handleExportPayroll = (payroll: PayrollRun) => {
    const items = getPayrollEmployees(payroll.id)
    const csvContent = [
      ["Employee", "Department", "Basic Pay", "Overtime", "Gross", "SSS", "PhilHealth", "Pag-IBIG", "Tax", "Net Pay"],
      ...items.map((item) => [
        `${item.employee?.firstName} ${item.employee?.lastName}`,
        item.employee?.department,
        item.basicPay,
        item.overtimePay,
        item.grossPay,
        item.sssContribution,
        item.philHealthContribution,
        item.pagIbigContribution,
        item.withholdingTax,
        item.netPay,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `payroll-${formatDate(payroll.payPeriodStart)}-${formatDate(payroll.payPeriodEnd)}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Payroll Exported",
      description: "The payroll data has been exported to CSV.",
    })
  }

  const handleSendPayslips = (payroll: PayrollRun) => {
    setPayrollForSending(payroll)
    setSendPayslipDialogOpen(true)
  }

  const handlePrintPayroll = (payroll: PayrollRun) => {
    toast({
      title: "Print Initiated",
      description: "Preparing payroll summary for printing...",
    })
    window.print()
  }

  const handleDeleteByPeriod = async (payPeriodStart: string, payPeriodEnd: string) => {
    setIsDeleting(true)
    try {
      const result = await deletePayslipsByPeriod(payPeriodStart, payPeriodEnd)
      if (result.success) {
        toast({
          title: "Payslips Deleted",
          description: `${result.count} payslip(s) for the period have been deleted.`,
        })
        // Refresh the page to reflect changes
        window.location.reload()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete payslips.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleApprovePayroll = async (id: string) => {
    try {
      await approvePayroll(id)
      updatePayrollRun(id, { status: "approved" })
      toast({
        title: "Payroll Approved",
        description: "The payroll has been approved successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve payroll.",
        variant: "destructive",
      })
    }
  }

  const handleEditPayrollItem = (item: PayrollItem) => {
    setEditingItem(item)
    setEditBasicPay(item.basicPay.toString())
    setViewDialogOpen(true)
  }

  const handleSavePayrollItem = async () => {
    if (!editingItem || !editBasicPay) return

    try {
      const updatedItem = {
        ...editingItem,
        basicPay: Number.parseFloat(editBasicPay),
      }

      await updatePayrollItem(updatedItem.id, updatedItem)
      toast({
        title: "Payroll Item Updated",
        description: "The payroll item has been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update payroll item.",
        variant: "destructive",
      })
    } finally {
      setEditingItem(null)
      setEditBasicPay("")
    }
  }

  const handleEditItem = (item: PayrollItem) => {
    setEditingItem(item)
    setEditBasicPay(item.basicPay.toString())
    setSyncToEmployee(true)
  }

  const handleSaveEditedItem = () => {
    if (!editingItem) return

    const newBasicPay = Number.parseFloat(editBasicPay)
    if (isNaN(newBasicPay) || newBasicPay <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid salary amount.",
        variant: "destructive",
      })
      return
    }

    // Recalculate all payroll values based on new basic pay
    const newMonthlySalary = newBasicPay * 2 // Since semi-monthly
    const employee = employees.find((e) => e.id === editingItem.employeeId)

    // Recalculate deductions based on new salary
    const sss = calculateSSS(newMonthlySalary)
    const philHealth = calculatePhilHealth(newMonthlySalary)
    const pagIbig = calculatePagIbig(newMonthlySalary)

    const sssEmployee = sss.employee * 0.5
    const philHealthEmployee = philHealth.employee * 0.5
    const pagIbigEmployee = pagIbig.employee * 0.5

    const grossPay = newBasicPay + editingItem.overtimePay + editingItem.allowances
    const taxableIncome = (grossPay - sssEmployee - philHealthEmployee - pagIbigEmployee) * 2
    const withholdingTax = calculateWithholdingTax(taxableIncome) * 0.5

    const totalDeductions = sssEmployee + philHealthEmployee + pagIbigEmployee + withholdingTax
    const netPay = grossPay - totalDeductions

    updatePayrollItem(
      editingItem.id,
      {
        basicPay: newBasicPay,
        grossPay,
        sssContribution: sssEmployee,
        philHealthContribution: philHealthEmployee,
        pagIbigContribution: pagIbigEmployee,
        withholdingTax,
        totalDeductions,
        netPay,
      },
      syncToEmployee,
    )

    const previousMonthlySalary = employee?.monthlySalary || 0
    const salaryDiff = newMonthlySalary - previousMonthlySalary

    toast({
      title: "Payroll Item Updated",
      description:
        syncToEmployee && salaryDiff !== 0
          ? `Salary ${salaryDiff > 0 ? "increased" : "decreased"} by ${formatCurrency(Math.abs(salaryDiff))}. Employee's base salary has been updated.`
          : "The payroll item has been updated.",
    })

    setEditingItem(null)
    setEditBasicPay("")
  }

  return (
    <AdminLayout title="Payroll" subtitle="Manage payroll runs and process payments">
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("draft")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{statusCounts.draft + statusCounts.processing}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("approved")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <CheckCircle2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold">{statusCounts.approved}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <Wallet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">YTD Payroll</p>
                  <p className="text-2xl font-bold">{formatCurrency(ytdPayroll)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                  <Calendar className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Next Pay Date</p>
                  <p className="text-2xl font-bold">
                    {upcomingPayDate ? formatDate(upcomingPayDate).split(",")[0] : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Tabs value={filter} onValueChange={setFilter} className="w-auto">
            <TabsList>
              <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
              <TabsTrigger value="draft">Draft ({statusCounts.draft})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({statusCounts.approved})</TabsTrigger>
              <TabsTrigger value="finalized">Finalized ({statusCounts.finalized})</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <Label htmlFor="search" className="sr-only">
              Search
            </Label>
            <Input
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search payroll runs..."
              className="w-full md:w-auto"
            />
          </div>
          <Link href="/admin/payroll/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Run New Payroll
            </Button>
          </Link>
        </div>

        <Separator />

        {/* Payroll List */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPayrolls.map((payroll) => (
            <div key={payroll.id} className="relative group">
              <PayrollSummaryCard
                payrollRun={payroll}
                onView={() => handleViewPayroll(payroll)}
                onProcess={
                  payroll.status === "draft"
                    ? () => {
                        processPayroll(payroll.id)
                        toast({
                          title: "Processing Payroll",
                          description: "Payroll is being processed...",
                        })
                      }
                    : payroll.status === "approved"
                      ? () => {
                          finalizePayroll(payroll.id)
                          toast({
                            title: "Payroll Finalized",
                            description: "Payroll has been finalized successfully.",
                          })
                        }
                      : undefined
                }
                onApprove={
                  payroll.status === "draft"
                    ? () => {
                        handleApprovePayroll(payroll.id)
                      }
                    : undefined
                }
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleViewPayroll(payroll)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportPayroll(payroll)}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePrintPayroll(payroll)}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print Summary
                  </DropdownMenuItem>
                  {payroll.status === "finalized" && (
                    <DropdownMenuItem onClick={() => handleSendPayslips(payroll)}>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Payslips
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      setPayrollToDelete(payroll.id)
                      setDeleteDialogOpen(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Payroll
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>

        {filteredPayrolls.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No payroll runs found</h3>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                No payroll runs match your current filter. Try selecting a different status or create a new payroll run.
              </p>
              <Link href="/admin/payroll/new">
                <Button>Create New Payroll</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* View Payroll Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-[98vw] w-full max-h-[95vh] overflow-y-auto xl:max-w-[1400px] px-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Payroll Details
              </DialogTitle>
              <DialogDescription>
                {selectedPayroll &&
                  `${formatDate(selectedPayroll.payPeriodStart)} - ${formatDate(selectedPayroll.payPeriodEnd)}`}
              </DialogDescription>
            </DialogHeader>

            {selectedPayroll && (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-4">
                  <div className="p-4 rounded-lg bg-muted/50 flex-1 min-w-[140px]">
                    <p className="text-xs text-muted-foreground mb-1">Gross Pay</p>
                    <p className="text-sm sm:text-base lg:text-lg font-bold whitespace-nowrap">
                      {formatCurrency(selectedPayroll.totalGross)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 flex-1 min-w-[140px]">
                    <p className="text-xs text-muted-foreground mb-1">Total Deductions</p>
                    <p className="text-sm sm:text-base lg:text-lg font-bold text-amber-600 whitespace-nowrap">
                      -{formatCurrency(selectedPayroll.totalDeductions)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 flex-1 min-w-[140px]">
                    <p className="text-xs text-muted-foreground mb-1">Withholding Tax</p>
                    <p className="text-sm sm:text-base lg:text-lg font-bold text-red-600 whitespace-nowrap">
                      -{formatCurrency(selectedPayroll.totalWithholdingTax || 0)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10 flex-1 min-w-[140px]">
                    <p className="text-xs text-muted-foreground mb-1">Net Pay</p>
                    <p className="text-sm sm:text-base lg:text-lg font-bold text-primary whitespace-nowrap">
                      {formatCurrency(selectedPayroll.totalNet)}
                    </p>
                  </div>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Government Contributions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg gap-4 flex-1 min-w-[160px]">
                        <span className="text-sm font-medium">SSS</span>
                        <span className="text-sm font-semibold whitespace-nowrap">
                          {formatCurrency(selectedPayroll.totalSSS || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg gap-4 flex-1 min-w-[160px]">
                        <span className="text-sm font-medium">PhilHealth</span>
                        <span className="text-sm font-semibold whitespace-nowrap">
                          {formatCurrency(selectedPayroll.totalPhilHealth || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg gap-4 flex-1 min-w-[160px]">
                        <span className="text-sm font-medium">Pag-IBIG</span>
                        <span className="text-sm font-semibold whitespace-nowrap">
                          {formatCurrency(selectedPayroll.totalPagIbig || 0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Employee Breakdown ({selectedPayroll.employeeCount} employees)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg max-h-[250px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[180px]">Employee</TableHead>
                            <TableHead className="text-right min-w-[100px]">Gross</TableHead>
                            <TableHead className="text-right min-w-[100px]">Deductions</TableHead>
                            <TableHead className="text-right min-w-[100px]">Net Pay</TableHead>
                            <TableHead className="text-right min-w-[60px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getPayrollEmployees(selectedPayroll.id).map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-7 w-7">
                                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                      {item.employee && getInitials(item.employee.firstName, item.employee.lastName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">
                                      {item.employee?.firstName} {item.employee?.lastName}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {item.employee?.department}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-sm">{formatCurrency(item.grossPay)}</TableCell>
                              <TableCell className="text-right text-sm text-amber-600">
                                -{formatCurrency(item.totalDeductions)}
                              </TableCell>
                              <TableCell className="text-right text-sm font-semibold text-primary">
                                {formatCurrency(item.netPay)}
                              </TableCell>
                              <TableCell className="text-right">
                                {selectedPayroll.status === "draft" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditItem(item)}
                                    className="h-7 px-2"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleExportPayroll(selectedPayroll)}
                    className="w-full sm:w-auto"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  {selectedPayroll.status === "finalized" && (
                    <Button
                      variant="outline"
                      onClick={() => handleSendPayslips(selectedPayroll)}
                      className="w-full sm:w-auto"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Send Payslips
                    </Button>
                  )}
                  {selectedPayroll.status === "draft" && (
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => {
                        processPayroll(selectedPayroll.id)
                        setViewDialogOpen(false)
                        toast({
                          title: "Processing Payroll",
                          description: "Payroll is being processed...",
                        })
                      }}
                    >
                      Process Payroll
                    </Button>
                  )}
                  {selectedPayroll.status === "approved" && (
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => {
                        finalizePayroll(selectedPayroll.id)
                        setViewDialogOpen(false)
                        toast({
                          title: "Payroll Finalized",
                          description: "Payroll has been finalized successfully.",
                        })
                      }}
                    >
                      Finalize Payroll
                    </Button>
                  )}
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Payroll?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the payroll and all associated payslips. This action cannot be undone. Are
                you sure you want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
                onClick={() => payrollToDelete && handleDeletePayroll(payrollToDelete)}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Yes, Delete Payroll"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Send Payslip Dialog */}
        <SendPayslipDialog
          open={sendPayslipDialogOpen}
          onOpenChange={setSendPayslipDialogOpen}
          payrollItems={payrollForSending ? getPayrollEmployees(payrollForSending.id) : []}
          payrollRun={payrollForSending}
        />

        {/* Edit Payroll Item Dialog */}
        <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Employee Salary</DialogTitle>
              <DialogDescription>
                Adjust the basic pay for this payroll period. This will recalculate all deductions automatically.
              </DialogDescription>
            </DialogHeader>
            {editingItem && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {employees.find((e) => e.id === editingItem.employeeId) &&
                        getInitials(
                          employees.find((e) => e.id === editingItem.employeeId)!.firstName,
                          employees.find((e) => e.id === editingItem.employeeId)!.lastName,
                        )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {employees.find((e) => e.id === editingItem.employeeId)?.firstName}{" "}
                      {employees.find((e) => e.id === editingItem.employeeId)?.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Current Monthly:{" "}
                      {formatCurrency(employees.find((e) => e.id === editingItem.employeeId)?.monthlySalary || 0)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="basicPay">Basic Pay (Semi-Monthly)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{PESO_SIGN}</span>
                    <Input
                      id="basicPay"
                      type="number"
                      value={editBasicPay}
                      onChange={(e) => setEditBasicPay(e.target.value)}
                      className="pl-8"
                      placeholder="Enter amount"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    New Monthly Salary: {formatCurrency(Number.parseFloat(editBasicPay || "0") * 2)}
                  </p>
                </div>

                <Separator />

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="syncToEmployee"
                    checked={syncToEmployee}
                    onCheckedChange={(checked) => setSyncToEmployee(checked as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="syncToEmployee" className="text-sm font-medium cursor-pointer">
                      Update employee&apos;s base salary
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      This will permanently change the employee&apos;s monthly salary for future payrolls.
                    </p>
                  </div>
                </div>

                {syncToEmployee &&
                  Number.parseFloat(editBasicPay || "0") * 2 !==
                    (employees.find((e) => e.id === editingItem.employeeId)?.monthlySalary || 0) && (
                    <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>Note:</strong> The employee&apos;s base salary will be{" "}
                        {Number.parseFloat(editBasicPay || "0") * 2 >
                        (employees.find((e) => e.id === editingItem.employeeId)?.monthlySalary || 0)
                          ? "increased"
                          : "decreased"}{" "}
                        by{" "}
                        {formatCurrency(
                          Math.abs(
                            Number.parseFloat(editBasicPay || "0") * 2 -
                              (employees.find((e) => e.id === editingItem.employeeId)?.monthlySalary || 0),
                          ),
                        )}
                      </p>
                    </div>
                  )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEditedItem}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
