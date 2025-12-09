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
import { Clock, Loader2 } from "lucide-react"
import { format } from "date-fns"

interface TimeInPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTimeIn: () => Promise<void>
  employeeName: string
}

export function TimeInPopup({ open, onOpenChange, onTimeIn, employeeName }: TimeInPopupProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleTimeIn = async () => {
    setIsLoading(true)
    try {
      await onTimeIn()
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Good {getGreeting()}, {employeeName.split(" ")[0]}!
          </DialogTitle>
          <DialogDescription className="text-center">Do you want to Time-In now?</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          <p className="text-3xl font-bold text-primary">{format(new Date(), "hh:mm a")}</p>
          <p className="text-sm text-muted-foreground mt-1">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="flex-1">
            Not Yet
          </Button>
          <Button onClick={handleTimeIn} disabled={isLoading} className="flex-1">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Time In
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Morning"
  if (hour < 18) return "Afternoon"
  return "Evening"
}
