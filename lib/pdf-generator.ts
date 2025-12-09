import jsPDF from "jspdf"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { PayrollItem, Employee, PayrollRun } from "@/lib/types"

interface PayslipPDFData {
  payslip: PayrollItem
  employee: Employee
  payrollRun?: PayrollRun | null
}

export function generatePayslipPDF(data: PayslipPDFData): jsPDF {
  const { payslip, employee, payrollRun } = data
  const doc = new jsPDF()

  const pageWidth = doc.internal.pageSize.getWidth()

  // Colors
  const primaryColor: [number, number, number] = [99, 102, 241] // Indigo
  const textColor: [number, number, number] = [55, 65, 81]
  const mutedColor: [number, number, number] = [107, 114, 128]
  const successColor: [number, number, number] = [34, 197, 94]
  const dangerColor: [number, number, number] = [239, 68, 68]

  // Header background
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, pageWidth, 45, "F")

  // Company Name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont("helvetica", "bold")
  doc.text("Payroll Management", 20, 25)

  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.text("Payslip", 20, 35)

  // Pay Period (right side of header)
  doc.setFontSize(10)
  doc.text("Pay Period", pageWidth - 20, 20, { align: "right" })
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  const payPeriod = payrollRun
    ? `${formatDate(payrollRun.payPeriodStart)} - ${formatDate(payrollRun.payPeriodEnd)}`
    : payslip.payrollRunId
  doc.text(payPeriod, pageWidth - 20, 28, { align: "right" })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text(`Pay Date: ${formatDate(payrollRun?.payDate || payslip.createdAt)}`, pageWidth - 20, 36, { align: "right" })

  // Employee Information Section
  let yPos = 60

  doc.setTextColor(...textColor)
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("Employee Information", 20, yPos)

  yPos += 10
  doc.setFillColor(249, 250, 251)
  doc.roundedRect(20, yPos, pageWidth - 40, 40, 3, 3, "F")

  yPos += 12
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...mutedColor)
  doc.text("Name", 25, yPos)
  doc.text("Department", 95, yPos)

  yPos += 7
  doc.setTextColor(...textColor)
  doc.setFont("helvetica", "bold")
  doc.text(`${employee.firstName} ${employee.lastName}`, 25, yPos)
  doc.setFont("helvetica", "normal")
  doc.text(employee.department, 95, yPos)

  yPos += 10
  doc.setTextColor(...mutedColor)
  doc.text("Employee #", 25, yPos)
  doc.text("Position", 95, yPos)

  yPos += 7
  doc.setTextColor(...textColor)
  doc.text(employee.employeeNumber, 25, yPos)
  doc.text(employee.position, 95, yPos)

  // Earnings Section
  yPos += 25
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...textColor)
  doc.text("Earnings", 20, yPos)

  yPos += 8
  doc.setFillColor(240, 253, 244) // Light green
  doc.roundedRect(20, yPos, pageWidth - 40, 60, 3, 3, "F")

  yPos += 12
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")

  // Earnings rows
  const earnings = [
    { label: "Basic Pay", value: payslip.basicPay },
    { label: "Overtime Pay", value: payslip.overtimePay },
    { label: "Allowances", value: payslip.allowances },
  ]

  earnings.forEach((item) => {
    doc.setTextColor(...mutedColor)
    doc.text(item.label, 25, yPos)
    doc.setTextColor(...textColor)
    doc.text(formatCurrency(item.value), pageWidth - 25, yPos, { align: "right" })
    yPos += 10
  })

  // Gross Pay
  yPos += 2
  doc.setDrawColor(200, 200, 200)
  doc.line(25, yPos - 5, pageWidth - 25, yPos - 5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...textColor)
  doc.text("Gross Pay", 25, yPos)
  doc.setTextColor(...successColor)
  doc.text(formatCurrency(payslip.grossPay), pageWidth - 25, yPos, { align: "right" })

  // Deductions Section
  yPos += 20
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...textColor)
  doc.text("Deductions", 20, yPos)

  yPos += 8
  doc.setFillColor(254, 242, 242) // Light red
  doc.roundedRect(20, yPos, pageWidth - 40, 75, 3, 3, "F")

  yPos += 12
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")

  // Deduction rows
  const deductions = [
    { label: "SSS Contribution", value: payslip.sssContribution },
    { label: "PhilHealth Contribution", value: payslip.philHealthContribution },
    { label: "Pag-IBIG Contribution", value: payslip.pagIbigContribution },
    { label: "Withholding Tax", value: payslip.withholdingTax },
    { label: "Other Deductions", value: payslip.otherDeductions },
  ]

  deductions.forEach((item) => {
    doc.setTextColor(...mutedColor)
    doc.text(item.label, 25, yPos)
    doc.setTextColor(...dangerColor)
    doc.text(`-${formatCurrency(item.value)}`, pageWidth - 25, yPos, { align: "right" })
    yPos += 10
  })

  // Total Deductions
  yPos += 2
  doc.setDrawColor(200, 200, 200)
  doc.line(25, yPos - 5, pageWidth - 25, yPos - 5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...textColor)
  doc.text("Total Deductions", 25, yPos)
  doc.setTextColor(...dangerColor)
  doc.text(`-${formatCurrency(payslip.totalDeductions)}`, pageWidth - 25, yPos, { align: "right" })

  // Net Pay Section
  yPos += 20
  doc.setFillColor(...primaryColor)
  doc.roundedRect(20, yPos, pageWidth - 40, 30, 3, 3, "F")

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.text("NET PAY", 30, yPos + 13)

  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text(formatCurrency(payslip.netPay), pageWidth - 30, yPos + 20, { align: "right" })

  // Footer
  yPos = doc.internal.pageSize.getHeight() - 20
  doc.setTextColor(...mutedColor)
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text("This is a computer-generated payslip. Please contact HR for any discrepancies.", pageWidth / 2, yPos, {
    align: "center",
  })
  doc.text(`Generated on ${formatDate(new Date())}`, pageWidth / 2, yPos + 6, { align: "center" })

  return doc
}

export function downloadPayslipPDF(data: PayslipPDFData): void {
  const doc = generatePayslipPDF(data)
  const fileName = `payslip-${data.employee.lastName.toLowerCase()}-${data.payslip.payrollRunId}.pdf`
  doc.save(fileName)
}
