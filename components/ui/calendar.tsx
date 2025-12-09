"use client"

import type * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      captionLayout="dropdown"
      fromYear={2020}
      toYear={2030}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-4 w-full",
        caption: "flex justify-center pt-1 relative items-center h-10",
        caption_label: "text-sm font-medium hidden",
        caption_dropdowns: "flex items-center justify-center gap-2",
        dropdown_month: "relative",
        dropdown_year: "relative",
        dropdown:
          "appearance-none bg-background border border-input rounded-md px-3 py-1.5 text-sm font-medium cursor-pointer hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring",
        nav: "flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 border-0 hover:bg-accent",
        ),
        nav_button_previous: "absolute left-0",
        nav_button_next: "absolute right-0",
        table: "w-full border-collapse table-fixed",
        head_row: "hidden",
        head_cell: "hidden",
        row: "",
        cell: cn(
          "relative h-10 w-10 text-center text-sm p-0",
          "[&:has([aria-selected].day-range-end)]:rounded-r-md",
          "[&:has([aria-selected].day-outside)]:bg-accent/50",
          "first:[&:has([aria-selected])]:rounded-l-md",
          "last:[&:has([aria-selected])]:rounded-r-md",
          "focus-within:relative focus-within:z-20",
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-accent",
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-white text-black hover:bg-white hover:text-black focus:bg-white focus:text-black rounded-md font-medium",
        day_today: "bg-accent text-accent-foreground rounded-md",
        day_outside: "day-outside text-muted-foreground opacity-40",
        day_disabled: "text-muted-foreground opacity-30 cursor-not-allowed",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
