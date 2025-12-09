"use client"
import { Wallet, Users, Minus, FileText, CheckCircle2, Play } from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { PayrollRun } from "@/lib/types"

interface PayrollSummaryCardProps {
  payrollRun: PayrollRun
  onView?: () => void
  onProcess?: () => void
  className?: string
}

export function PayrollSummaryCard({ payrollRun, onView, onProcess, className }: PayrollSummaryCardProps) {
  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    processing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    finalized: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg font-semibold">
            {formatDate(payrollRun.payPeriodStart)} - {formatDate(payrollRun.payPeriodEnd)}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Pay Date: {formatDate(payrollRun.payDate)}</p>
        </div>
        <Badge className={cn("capitalize", statusColors[payrollRun.status])}>{payrollRun.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gross Pay</p>
              <p className="text-sm font-semibold">{formatCurrency(payrollRun.totalGross)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Minus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Deductions</p>
              <p className="text-sm font-semibold">{formatCurrency(payrollRun.totalDeductions)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gov&apos;t Contributions</p>
              <p className="text-sm font-semibold">
                {formatCurrency(
                  (payrollRun.totalSSS || 0) + (payrollRun.totalPhilHealth || 0) + (payrollRun.totalPagIbig || 0),
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Employees</p>
              <p className="text-sm font-semibold">{payrollRun.employeeCount}</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Net Pay</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(payrollRun.totalNet)}</p>
            </div>
            <div className="flex gap-2">
              {onView && (
                <Button variant="outline" size="sm" onClick={onView}>
                  View Details
                </Button>
              )}
              {onProcess && payrollRun.status === "draft" && (
                <Button size="sm" onClick={onProcess} className="gap-1">
                  <Play className="h-3 w-3" />
                  Process
                </Button>
              )}
              {onProcess && payrollRun.status === "approved" && (
                <Button size="sm" onClick={onProcess} className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Finalize
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
