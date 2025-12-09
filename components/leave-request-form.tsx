"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { differenceInDays, parseISO } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { createLeaveRequest } from "@/app/employee/actions"
import { useToast } from "@/hooks/use-toast"

interface LeaveRequestFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: string
  onSuccess?: () => void
}

const LEAVE_TYPES = [
  { value: "vacation", label: "Vacation Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "emergency", label: "Emergency Leave" },
  { value: "maternity", label: "Maternity Leave" },
  { value: "paternity", label: "Paternity Leave" },
  { value: "bereavement", label: "Bereavement Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
]

export function LeaveRequestForm({ open, onOpenChange, employeeId, onSuccess }: LeaveRequestFormProps) {
  const [leaveType, setLeaveType] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const totalDays = startDate && endDate ? differenceInDays(parseISO(endDate), parseISO(startDate)) + 1 : 0

  const handleSubmit = async () => {
    if (!leaveType || !startDate || !endDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    if (endDate < startDate) {
      toast({
        title: "Invalid Date Range",
        description: "End date must be after start date.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createLeaveRequest({
        employee_id: employeeId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        total_days: totalDays,
        reason: reason || undefined,
      })

      if (result.success) {
        toast({
          title: "Leave Request Submitted",
          description: "Your leave request has been submitted for approval.",
        })
        // Reset form
        setLeaveType("")
        setStartDate("")
        setEndDate("")
        setReason("")
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to submit leave request.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Leave request error:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">Request Leave</DialogTitle>
          <DialogDescription className="text-sm">Submit a leave request for approval.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="leave-type" className="text-sm">
              Leave Type *
            </Label>
            <select
              id="leave-type"
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select leave type</option>
              {LEAVE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Start Date */}
            <div className="grid gap-1.5">
              <Label htmlFor="start-date" className="text-sm">
                Start Date *
              </Label>
              <Input
                id="start-date"
                type="date"
                className="h-9"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (endDate && e.target.value && endDate < e.target.value) {
                    setEndDate("")
                  }
                }}
              />
            </div>

            {/* End Date */}
            <div className="grid gap-1.5">
              <Label htmlFor="end-date" className="text-sm">
                End Date *
              </Label>
              <Input
                id="end-date"
                type="date"
                className="h-9"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
              />
            </div>
          </div>

          {/* Total Days */}
          {totalDays > 0 && (
            <div className="rounded-md bg-muted/50 p-2 text-center">
              <span className="text-xs text-muted-foreground">Total: </span>
              <span className="text-sm font-semibold">
                {totalDays} day{totalDays > 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Reason */}
          <div className="grid gap-1.5">
            <Label htmlFor="reason" className="text-sm">
              Reason (Optional)
            </Label>
            <Textarea
              id="reason"
              placeholder="Enter reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
