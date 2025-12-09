"use client"
import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import {
  Download,
  Eye,
  Mail,
  MoreHorizontal,
  FileText,
  Printer,
  Send,
  CheckCircle2,
  XCircle,
  Search,
} from "lucide-react"
import { AdminLayout } from "@/components/layout/admin-layout"
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatCurrency, formatDate, getInitials } from "@/lib/utils"
import { usePayrollStore } from "@/lib/store"
import type { PayrollItem } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { SendPayslipDialog } from "@/components/send-payslip-dialog"

export default function PayslipsPage() {
  const { payrollItems, payrollRuns, employees } = usePayrollStore()
  const [mounted, setMounted] = React.useState(false)
  const [selectedPayslip, setSelectedPayslip] = React.useState<PayrollItem | null>(null)
  const [filterPeriod, setFilterPeriod] = React.useState("all")
  const [filterDepartment, setFilterDepartment] = React.useState("all")
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const { toast } = useToast()
  const [sendPayslipDialogOpen, setSendPayslipDialogOpen] = React.useState(false)
  const [payslipsToSend, setPayslipsToSend] = React.useState<typeof enrichedPayrollItems>([])
  const [isSingleSend, setIsSingleSend] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Enrich payroll items with employee data
  const enrichedPayrollItems = React.useMemo(() => {
    return payrollItems.map((item) => ({
      ...item,
      employee: employees.find((e) => e.id === item.employeeId),
    }))
  }, [payrollItems, employees])

  // Get unique departments
  const departments = React.useMemo(() => {
    const depts = new Set(employees.map((e) => e.department))
    return Array.from(depts)
  }, [employees])

  // Filter payslips
  const filteredPayslips = React.useMemo(() => {
    return enrichedPayrollItems.filter((item) => {
      const matchesPeriod = filterPeriod === "all" || item.payrollRunId === filterPeriod
      const matchesDept = filterDepartment === "all" || item.employee?.department === filterDepartment
      const matchesSearch =
        searchQuery === "" ||
        `${item.employee?.firstName} ${item.employee?.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesPeriod && matchesDept && matchesSearch
    })
  }, [enrichedPayrollItems, filterPeriod, filterDepartment, searchQuery])

  const handleDownloadPayslip = (item: PayrollItem) => {
    const employee = employees.find((e) => e.id === item.employeeId)
    const payroll = payrollRuns.find((p) => p.id === item.payrollRunId)

    const content = `
PAYSLIP
=======
Employee: ${employee?.firstName} ${employee?.lastName}
Employee No: ${employee?.employeeNumber}
Department: ${employee?.department}
Position: ${employee?.position}

Pay Period: ${payroll ? formatDate(payroll.payPeriodStart) : "N/A"} - ${payroll ? formatDate(payroll.payPeriodEnd) : "N/A"}
Pay Date: ${payroll ? formatDate(payroll.payDate) : "N/A"}

EARNINGS
--------
Basic Pay: ${formatCurrency(item.basicPay)}
Overtime (${item.overtimeHours} hrs): ${formatCurrency(item.overtimePay)}
Allowances: ${formatCurrency(item.allowances)}
GROSS PAY: ${formatCurrency(item.grossPay)}

DEDUCTIONS
----------
SSS: ${formatCurrency(item.sssContribution)}
PhilHealth: ${formatCurrency(item.philHealthContribution)}
Pag-IBIG: ${formatCurrency(item.pagIbigContribution)}
Withholding Tax: ${formatCurrency(item.withholdingTax)}
Other Deductions: ${formatCurrency(item.otherDeductions)}
TOTAL DEDUCTIONS: ${formatCurrency(item.totalDeductions)}

NET PAY: ${formatCurrency(item.netPay)}
    `.trim()

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `payslip-${employee?.employeeNumber}-${payroll?.id}.txt`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Payslip Downloaded",
      description: `Payslip for ${employee?.firstName} ${employee?.lastName} has been downloaded.`,
    })
  }

  const handleSendPayslip = (item: (typeof enrichedPayrollItems)[0]) => {
    setPayslipsToSend([item])
    setIsSingleSend(true)
    setSendPayslipDialogOpen(true)
  }

  const handleBulkSend = () => {
    const selectedPayslips = enrichedPayrollItems.filter((item) => selectedIds.includes(item.id))
    setPayslipsToSend(selectedPayslips)
    setIsSingleSend(false)
    setSendPayslipDialogOpen(true)
    setSelectedIds([])
  }

  const handleExportAll = () => {
    const csvContent = [
      [
        "Employee",
        "Employee No",
        "Department",
        "Basic Pay",
        "Overtime",
        "Gross",
        "SSS",
        "PhilHealth",
        "Pag-IBIG",
        "Tax",
        "Net Pay",
      ],
      ...filteredPayslips.map((item) => [
        `${item.employee?.firstName} ${item.employee?.lastName}`,
        item.employee?.employeeNumber,
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
    a.download = `payslips-export-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Export Complete",
      description: `${filteredPayslips.length} payslips exported to CSV.`,
    })
  }

  const columns: ColumnDef<(typeof enrichedPayrollItems)[0]>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value)
            if (value) {
              setSelectedIds(filteredPayslips.map((p) => p.id))
            } else {
              setSelectedIds([])
            }
          }}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.includes(row.original.id)}
          onCheckedChange={(value) => {
            if (value) {
              setSelectedIds([...selectedIds, row.original.id])
            } else {
              setSelectedIds(selectedIds.filter((id) => id !== row.original.id))
            }
          }}
        />
      ),
    },
    {
      accessorKey: "employee",
      header: "Employee",
      cell: ({ row }) => {
        const item = row.original
        const employee = item.employee
        if (!employee) return null
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {getInitials(employee.firstName, employee.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">
                {employee.firstName} {employee.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{employee.department}</p>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "grossPay",
      header: "Gross Pay",
      cell: ({ row }) => formatCurrency(row.getValue("grossPay")),
    },
    {
      accessorKey: "sssContribution",
      header: "SSS",
      cell: ({ row }) => (
        <span className="text-amber-600 dark:text-amber-400">-{formatCurrency(row.getValue("sssContribution"))}</span>
      ),
    },
    {
      accessorKey: "philHealthContribution",
      header: "PhilHealth",
      cell: ({ row }) => (
        <span className="text-amber-600 dark:text-amber-400">
          -{formatCurrency(row.getValue("philHealthContribution"))}
        </span>
      ),
    },
    {
      accessorKey: "pagIbigContribution",
      header: "Pag-IBIG",
      cell: ({ row }) => (
        <span className="text-amber-600 dark:text-amber-400">
          -{formatCurrency(row.getValue("pagIbigContribution"))}
        </span>
      ),
    },
    {
      accessorKey: "withholdingTax",
      header: "Tax",
      cell: ({ row }) => (
        <span className="text-red-600 dark:text-red-400">-{formatCurrency(row.getValue("withholdingTax"))}</span>
      ),
    },
    {
      accessorKey: "netPay",
      header: "Net Pay",
      cell: ({ row }) => <span className="font-semibold text-primary">{formatCurrency(row.getValue("netPay"))}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge
            variant="secondary"
            className={
              status === "processed"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            }
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const item = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem className="gap-2" onClick={() => setSelectedPayslip(item)}>
                <Eye className="h-4 w-4" />
                View Payslip
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onClick={() => handleDownloadPayslip(item)}>
                <Download className="h-4 w-4" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2"
                onClick={() => {
                  window.print()
                  toast({ title: "Print Initiated", description: "Preparing payslip for printing..." })
                }}
              >
                <Printer className="h-4 w-4" />
                Print Payslip
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2" onClick={() => handleSendPayslip(item)}>
                <Mail className="h-4 w-4" />
                Send to Employee
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  if (!mounted) {
    return (
      <AdminLayout title="Payslips" subtitle="View and manage employee payslips">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    )
  }

  // Calculate totals
  const totals = filteredPayslips.reduce(
    (acc, item) => ({
      gross: acc.gross + item.grossPay,
      net: acc.net + item.netPay,
      deductions: acc.deductions + item.totalDeductions,
    }),
    { gross: 0, net: 0, deductions: 0 },
  )

  return (
    <AdminLayout title="Payslips" subtitle="View and manage employee payslips">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Payslips</p>
                  <p className="text-2xl font-bold">{filteredPayslips.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Gross</p>
                  <p className="text-2xl font-bold">{formatCurrency(totals.gross)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <XCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Deductions</p>
                  <p className="text-2xl font-bold">{formatCurrency(totals.deductions)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Send className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Net Pay</p>
                  <p className="text-2xl font-bold">{formatCurrency(totals.net)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Pay Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pay Periods</SelectItem>
              {payrollRuns.map((run) => (
                <SelectItem key={run.id} value={run.id}>
                  {formatDate(run.payPeriodStart)} - {formatDate(run.payPeriodEnd)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterDepartment} onValueChange={setFilterDepartment}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex-1" />
          {selectedIds.length > 0 && (
            <>
              <Button variant="outline" className="gap-2 bg-transparent" onClick={handleBulkSend}>
                <Mail className="h-4 w-4" />
                Send ({selectedIds.length})
              </Button>
            </>
          )}
          <Button variant="outline" className="gap-2 bg-transparent" onClick={handleExportAll}>
            <Download className="h-4 w-4" />
            Export All
          </Button>
          <Button
            variant="outline"
            className="gap-2 bg-transparent"
            onClick={() => {
              toast({
                title: "Emails Sent",
                description: `Payslips sent to all ${filteredPayslips.length} employees`,
              })
            }}
          >
            <Mail className="h-4 w-4" />
            Send All
          </Button>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filteredPayslips}
          searchKey="employee"
          searchPlaceholder="Search payslips..."
        />

        {/* Payslip View Dialog */}
        <Dialog open={!!selectedPayslip} onOpenChange={() => setSelectedPayslip(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Payslip Details
              </DialogTitle>
              <DialogDescription>
                {selectedPayslip?.employee?.firstName} {selectedPayslip?.employee?.lastName} -{" "}
                {selectedPayslip?.employee?.employeeNumber}
              </DialogDescription>
            </DialogHeader>
            {selectedPayslip && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Employee</p>
                    <p className="font-medium">
                      {selectedPayslip.employee?.firstName} {selectedPayslip.employee?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium">{selectedPayslip.employee?.department}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Position</p>
                    <p className="font-medium">{selectedPayslip.employee?.position}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">TIN</p>
                    <p className="font-medium">{selectedPayslip.employee?.tinNumber || "N/A"}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Earnings</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Basic Pay</span>
                      <span className="font-medium">{formatCurrency(selectedPayslip.basicPay)}</span>
                    </div>
                    {selectedPayslip.overtimePay > 0 && (
                      <div className="flex justify-between">
                        <span>Overtime ({selectedPayslip.overtimeHours} hrs)</span>
                        <span className="font-medium">{formatCurrency(selectedPayslip.overtimePay)}</span>
                      </div>
                    )}
                    {selectedPayslip.allowances > 0 && (
                      <div className="flex justify-between">
                        <span>Allowances</span>
                        <span className="font-medium">{formatCurrency(selectedPayslip.allowances)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-semibold">Gross Pay</span>
                      <span className="font-bold">{formatCurrency(selectedPayslip.grossPay)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Deductions</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>SSS</span>
                      <span className="text-amber-600">-{formatCurrency(selectedPayslip.sssContribution)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PhilHealth</span>
                      <span className="text-amber-600">-{formatCurrency(selectedPayslip.philHealthContribution)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pag-IBIG</span>
                      <span className="text-amber-600">-{formatCurrency(selectedPayslip.pagIbigContribution)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Withholding Tax</span>
                      <span className="text-red-600">-{formatCurrency(selectedPayslip.withholdingTax)}</span>
                    </div>
                    {selectedPayslip.otherDeductions > 0 && (
                      <div className="flex justify-between">
                        <span>Other Deductions</span>
                        <span className="text-red-600">-{formatCurrency(selectedPayslip.otherDeductions)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-semibold">Total Deductions</span>
                      <span className="font-bold text-red-600">-{formatCurrency(selectedPayslip.totalDeductions)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-primary/10 rounded-lg flex justify-between items-center">
                  <span className="text-lg font-semibold">Net Pay</span>
                  <span className="text-2xl font-bold text-primary">{formatCurrency(selectedPayslip.netPay)}</span>
                </div>

                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => handleDownloadPayslip(selectedPayslip)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                  <Button onClick={() => handleSendPayslip(selectedPayslip)}>
                    <Mail className="h-4 w-4 mr-2" />
                    Send to Employee
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <SendPayslipDialog
        open={sendPayslipDialogOpen}
        onOpenChange={setSendPayslipDialogOpen}
        payrollItems={payslipsToSend}
        payrollRun={payslipsToSend.length > 0 ? payrollRuns.find((p) => p.id === payslipsToSend[0].payrollRunId) : null}
        singleEmployee={isSingleSend}
      />
    </AdminLayout>
  )
}
