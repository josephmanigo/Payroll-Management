import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Employee Portal | Payroll Management",
  description: "View your payslips and personal information",
}

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
