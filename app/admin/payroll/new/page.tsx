"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Calendar,
  Users,
  Wallet,
  Check,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  FileSpreadsheet,
  Loader2,
} from "lucide-react"
import { AdminLayout } from "@/components/layout/admin-layout"
import { Stepper } from "@/components/ui/stepper"
import { FileUploader } from "@/components/ui/file-uploader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, getInitials } from "@/lib/utils"
import { usePayrollStore } from "@/lib/store"
import { calculatePayroll } from "@/lib/ph-tax-calculator"
import { useToast } from "@/hooks/use-toast"
import { createPayroll } from "@/app/admin/payroll/actions"

const steps = [
  { id: "setup", title: "Pay Period", description: "Set dates & options" },
  { id: "employees", title: "Employees", description: "Select & review" },
  { id: "review", title: "Review", description: "Confirm & process" },
]

export default function NewPayrollPage() {
  const router = useRouter()
  const { employees, addPayrollRun, selectedEmployeeIds, setSelectedEmployeeIds } = usePayrollStore()
  const [currentStep, setCurrentStep] = React.useState(0)
  const [mounted, setMounted] = React.useState(false)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [payPeriod, setPayPeriod] = React.useState({
    start: "2025-12-01",
    end: "2025-12-15",
    payDate: "2025-12-20",
  })
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null)
  const { toast } = useToast()

  const activeEmployees = employees.filter((e) => e.status === "active")

  React.useEffect(() => {
    setMounted(true)
    if (selectedEmployeeIds.length === 0) {
      setSelectedEmployeeIds(activeEmployees.map((e) => e.id))
    }
  }, [])

  const payrollPreview = React.useMemo(() => {
    return selectedEmployeeIds
      .map((empId) => {
        const emp = employees.find((e) => e.id === empId)
        if (!emp) return null

        const overtimeHours = Math.random() > 0.7 ? Math.floor(Math.random() * 20) : 0
        const calc = calculatePayroll(emp.monthlySalary, overtimeHours, 0, true)

        return {
          employee: emp,
          ...calc,
          overtimeHours,
        }
      })
      .filter(Boolean)
  }, [selectedEmployeeIds, employees])

  const totals = payrollPreview.reduce(
    (acc, item) => {
      if (!item) return acc
      return {
        gross: acc.gross + item.grossPay,
        sss: acc.sss + item.sss.employee,
        philHealth: acc.philHealth + item.philHealth.employee,
        pagIbig: acc.pagIbig + item.pagIbig.employee,
        tax: acc.tax + item.withholdingTax,
        deductions: acc.deductions + item.totalDeductions,
        net: acc.net + item.netPay,
      }
    },
    { gross: 0, sss: 0, philHealth: 0, pagIbig: 0, tax: 0, deductions: 0, net: 0 },
  )

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleProcess = async () => {
    setIsProcessing(true)

    try {
      const result = await createPayroll({
        payPeriodStart: payPeriod.start,
        payPeriodEnd: payPeriod.end,
        payDate: payPeriod.payDate,
        employeeIds: selectedEmployeeIds,
      })

      if (result.success) {
        addPayrollRun({
          payPeriodStart: new Date(payPeriod.start),
          payPeriodEnd: new Date(payPeriod.end),
          payDate: new Date(payPeriod.payDate),
          status: "draft",
          totalGross: totals.gross,
          totalDeductions: totals.deductions,
          totalNet: totals.net,
          totalSSS: totals.sss,
          totalPhilHealth: totals.philHealth,
          totalPagIbig: totals.pagIbig,
          totalWithholdingTax: totals.tax,
          employeeCount: selectedEmployeeIds.length,
          createdBy: "user-001",
        })

        toast({
          title: "Payroll Created",
          description: `Payroll for ${selectedEmployeeIds.length} employees has been created and saved to database.`,
        })

        router.push("/admin/payroll")
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create payroll.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error creating payroll:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while creating payroll.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (!mounted) {
    return (
      <AdminLayout title="Run Payroll" subtitle="Create a new payroll run">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Run Payroll" subtitle="Create a new payroll run">
      <div className="space-y-6 max-w-5xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <Stepper steps={steps} currentStep={currentStep} />
          </CardContent>
        </Card>

        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Pay Period Configuration
              </CardTitle>
              <CardDescription>Set the pay period dates and upload any time entry data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Pay Period Start</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={payPeriod.start}
                    onChange={(e) => setPayPeriod({ ...payPeriod, start: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Pay Period End</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={payPeriod.end}
                    onChange={(e) => setPayPeriod({ ...payPeriod, end: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payDate">Pay Date</Label>
                  <Input
                    id="payDate"
                    type="date"
                    value={payPeriod.payDate}
                    onChange={(e) => setPayPeriod({ ...payPeriod, payDate: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Import Time Entries (Optional)</h4>
                    <p className="text-sm text-muted-foreground">
                      Upload a CSV file with overtime hours and time entries
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                    <FileSpreadsheet className="h-4 w-4" />
                    Download Template
                  </Button>
                </div>
                <FileUploader
                  accept=".csv"
                  maxSize={5}
                  onFileSelect={(file) => setUploadedFile(file)}
                  onFileRemove={() => setUploadedFile(null)}
                  status={uploadedFile ? "success" : "idle"}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Select Employees
              </CardTitle>
              <CardDescription>Choose which employees to include in this payroll run</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="selectAll"
                      checked={selectedEmployeeIds.length === activeEmployees.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedEmployeeIds(activeEmployees.map((e) => e.id))
                        } else {
                          setSelectedEmployeeIds([])
                        }
                      }}
                    />
                    <Label htmlFor="selectAll" className="text-sm font-medium">
                      Select All ({activeEmployees.length} employees)
                    </Label>
                  </div>
                  <Badge variant="secondary">{selectedEmployeeIds.length} selected</Badge>
                </div>

                <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead className="text-right">Basic Pay</TableHead>
                        <TableHead className="text-right">Est. Net Pay</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeEmployees.map((employee) => {
                        const calc = calculatePayroll(employee.monthlySalary, 0, 0, true)
                        return (
                          <TableRow key={employee.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedEmployeeIds.includes(employee.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedEmployeeIds([...selectedEmployeeIds, employee.id])
                                  } else {
                                    setSelectedEmployeeIds(selectedEmployeeIds.filter((id) => id !== employee.id))
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {getInitials(employee.firstName, employee.lastName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">
                                    {employee.firstName} {employee.lastName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{employee.position}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{employee.department}</TableCell>
                            <TableCell className="text-right">{formatCurrency(calc.basicPay)}</TableCell>
                            <TableCell className="text-right font-medium text-primary">
                              {formatCurrency(calc.netPay)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Payroll Summary
                </CardTitle>
                <CardDescription>Review the payroll details before processing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Total Gross</p>
                    <p className="text-2xl font-bold">{formatCurrency(totals.gross)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Government Contributions</p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      -{formatCurrency(totals.sss + totals.philHealth + totals.pagIbig)}
                    </p>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <p>SSS: {formatCurrency(totals.sss)}</p>
                      <p>PhilHealth: {formatCurrency(totals.philHealth)}</p>
                      <p>Pag-IBIG: {formatCurrency(totals.pagIbig)}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Withholding Tax (BIR)</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">-{formatCurrency(totals.tax)}</p>
                  </div>
                  <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
                    <p className="text-sm text-muted-foreground">Total Net Pay</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(totals.net)}</p>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Pay Period Details</h4>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Period</p>
                        <p className="font-medium">
                          {payPeriod.start} to {payPeriod.end}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Wallet className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Pay Date</p>
                        <p className="font-medium">{payPeriod.payDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Employees</p>
                        <p className="font-medium">{selectedEmployeeIds.length} included</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800 dark:text-amber-200">Confirm Payroll Processing</h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Please review all details carefully. Once processed, payslips will be generated and employees
                        will be notified. This action will create payslips for {selectedEmployeeIds.length} employees
                        totaling {formatCurrency(totals.net)} in net payments.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 || isProcessing}
            className="gap-2 bg-transparent"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/admin/payroll")} disabled={isProcessing}>
              Cancel
            </Button>
            {currentStep < steps.length - 1 ? (
              <Button
                onClick={handleNext}
                className="gap-2"
                disabled={currentStep === 1 && selectedEmployeeIds.length === 0}
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleProcess} className="gap-2" disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Process Payroll
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
