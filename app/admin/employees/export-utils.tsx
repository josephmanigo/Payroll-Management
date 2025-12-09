import type { Employee } from "@/lib/types"

export async function exportEmployeesCSV(employees: Employee[]) {
  // Define CSV headers
  const headers = [
    "Employee Number",
    "First Name",
    "Last Name",
    "Middle Name",
    "Email",
    "Phone",
    "Department",
    "Position",
    "Employment Type",
    "Status",
    "Monthly Salary",
    "Daily Rate",
    "Pay Frequency",
    "Hire Date",
    "Bank Name",
    "Bank Account Number",
    "Bank Account Name",
    "TIN Number",
    "SSS Number",
    "PhilHealth Number",
    "Pag-IBIG Number",
  ]

  // Convert employees to CSV rows
  const rows = employees.map((emp) => [
    emp.employeeNumber || "",
    emp.firstName || "",
    emp.lastName || "",
    emp.middleName || "",
    emp.email || "",
    emp.phone || "",
    emp.department || "",
    emp.position || "",
    emp.employmentType || "",
    emp.status || "",
    emp.monthlySalary?.toString() || "0",
    emp.dailyRate?.toString() || "",
    emp.payFrequency || "",
    emp.hireDate ? new Date(emp.hireDate).toLocaleDateString() : "",
    emp.bankName || "",
    emp.bankAccountNumber || "",
    emp.bankAccountName || "",
    emp.tinNumber || "",
    emp.sssNumber || "",
    emp.philHealthNumber || emp.philhealthNumber || "",
    emp.pagIbigNumber || emp.pagibigNumber || "",
  ])

  // Escape CSV values (handle commas, quotes, newlines)
  const escapeCSV = (value: string) => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  // Build CSV content
  const csvContent = [headers.map(escapeCSV).join(","), ...rows.map((row) => row.map(escapeCSV).join(","))].join("\n")

  // Create and download the file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", `employees_export_${new Date().toISOString().split("T")[0]}.csv`)
  link.style.visibility = "hidden"

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
