"use client"

import * as React from "react"
import { Loader2, Mail, CheckCircle2, XCircle, Send } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { formatCurrency, formatDate, getInitials } from "@/lib/utils"
import type { PayrollItem, PayrollRun, Employee } from "@/lib/types"
import { sendPayslipEmail } from "@/app/admin/payroll/actions"
import { useToast } from "@/hooks/use-toast"
import { usePayrollStore } from "@/lib/store"

interface SendPayslipDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payrollItems: (PayrollItem & { employee?: Employee })[]
  payrollRun?: PayrollRun | null
  singleEmployee?: boolean
  onPayslipsSent?: (sentIds: string[]) => void
}

type SendStatus = "idle" | "sending" | "success" | "error"

interface EmployeeSendStatus {
  id: string
  status: SendStatus
  error?: string
}

export function SendPayslipDialog({
  open,
  onOpenChange,
  payrollItems,
  payrollRun,
  singleEmployee = false,
  onPayslipsSent,
}: SendPayslipDialogProps) {
  const { toast } = useToast()
  const { markPayrollItemsAsSent } = usePayrollStore()
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [sendStatuses, setSendStatuses] = React.useState<Map<string, EmployeeSendStatus>>(new Map())
  const [isSending, setIsSending] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [sendComplete, setSendComplete] = React.useState(false)

  const remainingPayrollItems = React.useMemo(() => {
    return payrollItems.filter((item) => !item.emailSent)
  }, [payrollItems])

  // Reset all state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSelectedIds([])
      setSendStatuses(new Map())
      setIsSending(false)
      setProgress(0)
      setSendComplete(false)
    }
  }, [open])

  // Initialize selected IDs when dialog opens (runs once)
  React.useEffect(() => {
    if (open && selectedIds.length === 0 && !isSending && !sendComplete) {
      if (singleEmployee && remainingPayrollItems.length === 1) {
        setSelectedIds([remainingPayrollItems[0].id])
      } else {
        const initialIds = remainingPayrollItems.map((item) => item.id)
        setSelectedIds(initialIds)
      }
    }
  }, [open, remainingPayrollItems, singleEmployee]) // eslint-disable-line react-hooks/exhaustive-deps

  const formatPayPeriod = (start?: Date, end?: Date) => {
    if (!start || !end) return "Current Period"
    return `${formatDate(start)} - ${formatDate(end)}`
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(remainingPayrollItems.map((item) => item.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id))
    }
  }

  const handleSendPayslips = async () => {
    if (selectedIds.length === 0) return

    setIsSending(true)
    setProgress(0)
    setSendComplete(false)

    const selectedItems = remainingPayrollItems.filter((item) => selectedIds.includes(item.id))
    const total = selectedItems.length
    let completed = 0
    let successCount = 0
    let failCount = 0
    const newSentIds: string[] = []

    for (const item of selectedItems) {
      const employee = item.employee
      if (!employee) {
        setSendStatuses((prev) => {
          const newMap = new Map(prev)
          newMap.set(item.id, { id: item.id, status: "error", error: "Employee not found" })
          return newMap
        })
        failCount++
        completed++
        setProgress(Math.round((completed / total) * 100))
        continue
      }

      setSendStatuses((prev) => {
        const newMap = new Map(prev)
        newMap.set(item.id, { id: item.id, status: "sending" })
        return newMap
      })

      const result = await sendPayslipEmail({
        employeeEmail: employee.email,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        payPeriod: formatPayPeriod(payrollRun?.payPeriodStart, payrollRun?.payPeriodEnd),
        netPay: item.netPay,
        grossPay: item.grossPay,
        totalDeductions: item.totalDeductions,
        basicPay: item.basicPay,
        overtimePay: item.overtimePay,
        allowances: item.allowances,
        sssContribution: item.sssContribution,
        philHealthContribution: item.philHealthContribution,
        pagIbigContribution: item.pagIbigContribution,
        withholdingTax: item.withholdingTax,
        payslipId: item.id,
      })

      if (result.success) {
        successCount++
        newSentIds.push(item.id)
        setSendStatuses((prev) => {
          const newMap = new Map(prev)
          newMap.set(item.id, { id: item.id, status: "success" })
          return newMap
        })
      } else {
        failCount++
        setSendStatuses((prev) => {
          const newMap = new Map(prev)
          newMap.set(item.id, { id: item.id, status: "error", error: result.error })
          return newMap
        })
      }

      completed++
      setProgress(Math.round((completed / total) * 100))
    }

    setIsSending(false)
    setSendComplete(true)

    if (newSentIds.length > 0) {
      markPayrollItemsAsSent(newSentIds)

      // Notify parent component
      onPayslipsSent?.(newSentIds)
    }

    if (successCount > 0 && failCount === 0) {
      toast({
        title: "Payslips Sent Successfully",
        description: `${successCount} payslip${successCount > 1 ? "s" : ""} sent to employee${successCount > 1 ? "s" : ""}.`,
      })
    } else if (successCount > 0 && failCount > 0) {
      toast({
        title: "Partially Sent",
        description: `${successCount} sent, ${failCount} failed.`,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Failed to Send",
        description: "No payslips were sent. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getStatusIcon = (itemId: string) => {
    const status = sendStatuses.get(itemId)
    if (!status) return null

    switch (status.status) {
      case "sending":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />
      default:
        return null
    }
  }

  const successCount = Array.from(sendStatuses.values()).filter((s) => s.status === "success").length
  const failCount = Array.from(sendStatuses.values()).filter((s) => s.status === "error").length

  const allSent = remainingPayrollItems.length === 0

  const alreadySentCount = payrollItems.filter((item) => item.emailSent).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Payslip{payrollItems.length > 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription>
            {allSent
              ? "All payslips have been sent successfully!"
              : singleEmployee
                ? "Send payslip notification to the employee via email."
                : `Send payslip notifications to ${selectedIds.length} of ${remainingPayrollItems.length} employees.${alreadySentCount > 0 ? ` (${alreadySentCount} already sent)` : ""}`}
          </DialogDescription>
        </DialogHeader>

        {allSent ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-emerald-100 p-4 mb-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">All Done!</h3>
            <p className="text-muted-foreground text-center">All payslips have been sent to employees.</p>
          </div>
        ) : (
          <>
            {payrollRun && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-medium">
                  Pay Period: {formatPayPeriod(payrollRun.payPeriodStart, payrollRun.payPeriodEnd)}
                </p>
                <p className="text-xs text-muted-foreground">Pay Date: {formatDate(payrollRun.payDate)}</p>
              </div>
            )}

            {!singleEmployee && remainingPayrollItems.length > 1 && (
              <div className="flex items-center gap-2 border-b pb-3">
                <Checkbox
                  id="select-all"
                  checked={selectedIds.length === remainingPayrollItems.length}
                  onCheckedChange={handleSelectAll}
                  disabled={isSending}
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  Select All ({remainingPayrollItems.length} employees)
                </label>
              </div>
            )}

            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {remainingPayrollItems.map((item) => {
                  const employee = item.employee
                  if (!employee) return null

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      {!singleEmployee && remainingPayrollItems.length > 1 && (
                        <Checkbox
                          checked={selectedIds.includes(item.id)}
                          onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                          disabled={isSending}
                        />
                      )}
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(`${employee.firstName} ${employee.lastName}`)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {employee.firstName} {employee.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{employee.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatCurrency(item.netPay)}</p>
                        <p className="text-xs text-muted-foreground">{employee.department}</p>
                      </div>
                      <div className="w-5 flex items-center justify-center">{getStatusIcon(item.id)}</div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            {isSending && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Sending payslips...</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {sendComplete && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <div className="flex items-center gap-4">
                  {successCount > 0 && (
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{successCount} sent</span>
                    </div>
                  )}
                  {failCount > 0 && (
                    <div className="flex items-center gap-1.5 text-destructive">
                      <XCircle className="h-4 w-4" />
                      <span>{failCount} failed</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            {allSent || sendComplete ? "Close" : "Cancel"}
          </Button>
          {!sendComplete && !allSent && (
            <Button onClick={handleSendPayslips} disabled={selectedIds.length === 0 || isSending}>
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
