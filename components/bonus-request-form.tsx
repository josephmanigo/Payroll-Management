"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { createBonusRequest } from "@/app/employee/actions"
import { useToast } from "@/hooks/use-toast"
import { PESO_SIGN } from "@/lib/utils"

interface BonusRequestFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: string
  onSuccess?: () => void
}

export function BonusRequestForm({ open, onOpenChange, employeeId, onSuccess }: BonusRequestFormProps) {
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async () => {
    const amountNum = Number.parseFloat(amount)

    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive",
      })
      return
    }

    if (!reason.trim()) {
      toast({
        title: "Missing Reason",
        description: "Please provide a reason for your bonus request.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    const result = await createBonusRequest({
      employee_id: employeeId,
      amount: amountNum,
      reason: reason.trim(),
    })

    setIsSubmitting(false)

    if (result.success) {
      toast({
        title: "Bonus Request Submitted",
        description: "Your bonus request has been submitted for approval.",
      })
      // Reset form
      setAmount("")
      setReason("")
      onOpenChange(false)
      onSuccess?.()
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to submit bonus request.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Salary Bonus</DialogTitle>
          <DialogDescription>
            Submit a bonus request for approval. Please provide the amount and a detailed reason.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Amount */}
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount (PHP) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{PESO_SIGN}</span>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Reason */}
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              id="reason"
              placeholder="Please explain why you are requesting this bonus..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
