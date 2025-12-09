import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export const PESO_SIGN = "\u20B1" // ₱ character using Unicode escape

export function formatDate(date: Date | string | undefined | null): string {
  if (!date) return "N/A"

  const parsedDate = new Date(date)

  // Check if date is valid
  if (isNaN(parsedDate.getTime())) {
    return "N/A"
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsedDate)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-PH").format(num)
}

export function getInitials(firstName: string, lastName?: string): string {
  if (lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }
  return firstName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    inactive: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
    processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    finalized: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    unpaid: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    terminated: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    on_leave: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  }
  return statusColors[status.toLowerCase()] || statusColors.pending
}
