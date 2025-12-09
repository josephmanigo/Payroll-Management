"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LogOut, Loader2, Clock } from "lucide-react"
import { format } from "date-fns"

interface TimeOutPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTimeOut: () => Promise<void>
  timeIn: string | null
}

export function TimeOutPopup({ open, onOpenChange, onTimeOut, timeIn }: TimeOutPopupProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleTimeOut = async () => {
    setIsLoading(true)
    try {
      await onTimeOut()
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate hours worked so far
  const getHoursWorked = () => {
    if (!timeIn) return "0.00"
    const start = new Date(timeIn)
    const now = new Date()
    const hours = (now.getTime() - start.getTime()) / (1000 * 60 * 60)
    return hours.toFixed(2)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center">
              <LogOut className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">Confirm Time-Out</DialogTitle>
          <DialogDescription className="text-center">Do you want to Time-Out now?</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Time In</span>
            </div>
            <span className="font-medium">{timeIn ? format(new Date(timeIn), "hh:mm a") : "N/A"}</span>
          </div>

          <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <LogOut className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Time Out</span>
            </div>
            <span className="font-medium">{format(new Date(), "hh:mm a")}</span>
          </div>

          <div className="flex justify-between items-center p-3 rounded-lg bg-primary/5 border border-primary/20">
            <span className="text-sm font-medium">Hours Worked</span>
            <span className="text-lg font-bold text-primary">{getHoursWorked()} hrs</span>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleTimeOut} disabled={isLoading} className="flex-1">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 mr-2" />
                Confirm Time-Out
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
