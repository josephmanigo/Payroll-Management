// Philippine Statutory Deduction Calculator (2024 rates)

export interface DeductionBreakdown {
  sssContribution: number
  philHealthContribution: number
  pagIbigContribution: number
  withholdingTax: number
  totalDeductions: number
}

// SSS Contribution Table (2024)
// Employee share is approximately 4.5% of monthly salary credit
export function calculateSSS(monthlySalary: number): number {
  if (monthlySalary <= 0) return 0

  // SSS contribution table based on salary brackets
  // These are the employee share amounts
  if (monthlySalary < 4250) return 180
  if (monthlySalary < 4750) return 202.5
  if (monthlySalary < 5250) return 225
  if (monthlySalary < 5750) return 247.5
  if (monthlySalary < 6250) return 270
  if (monthlySalary < 6750) return 292.5
  if (monthlySalary < 7250) return 315
  if (monthlySalary < 7750) return 337.5
  if (monthlySalary < 8250) return 360
  if (monthlySalary < 8750) return 382.5
  if (monthlySalary < 9250) return 405
  if (monthlySalary < 9750) return 427.5
  if (monthlySalary < 10250) return 450
  if (monthlySalary < 10750) return 472.5
  if (monthlySalary < 11250) return 495
  if (monthlySalary < 11750) return 517.5
  if (monthlySalary < 12250) return 540
  if (monthlySalary < 12750) return 562.5
  if (monthlySalary < 13250) return 585
  if (monthlySalary < 13750) return 607.5
  if (monthlySalary < 14250) return 630
  if (monthlySalary < 14750) return 652.5
  if (monthlySalary < 15250) return 675
  if (monthlySalary < 15750) return 697.5
  if (monthlySalary < 16250) return 720
  if (monthlySalary < 16750) return 742.5
  if (monthlySalary < 17250) return 765
  if (monthlySalary < 17750) return 787.5
  if (monthlySalary < 18250) return 810
  if (monthlySalary < 18750) return 832.5
  if (monthlySalary < 19250) return 855
  if (monthlySalary < 19750) return 877.5
  if (monthlySalary < 20250) return 900
  if (monthlySalary < 20750) return 922.5
  if (monthlySalary < 21250) return 945
  if (monthlySalary < 21750) return 967.5
  if (monthlySalary < 22250) return 990
  if (monthlySalary < 22750) return 1012.5
  if (monthlySalary < 23250) return 1035
  if (monthlySalary < 23750) return 1057.5
  if (monthlySalary < 24250) return 1080
  if (monthlySalary < 24750) return 1102.5
  if (monthlySalary < 25250) return 1125
  if (monthlySalary < 25750) return 1147.5
  if (monthlySalary < 26250) return 1170
  if (monthlySalary < 26750) return 1192.5
  if (monthlySalary < 27250) return 1215
  if (monthlySalary < 27750) return 1237.5
  if (monthlySalary < 28250) return 1260
  if (monthlySalary < 28750) return 1282.5
  if (monthlySalary < 29250) return 1305
  if (monthlySalary < 29750) return 1327.5
  return 1350 // Maximum contribution for salaries >= 29750
}

// PhilHealth Contribution (2024)
// Employee share is 2.25% of monthly basic salary (total is 5%, split 50-50)
// Minimum: P500 (for salaries up to P10,000)
// Maximum: P4,500 (for salaries P90,000 and above)
export function calculatePhilHealth(monthlySalary: number): number {
  if (monthlySalary <= 0) return 0

  const rate = 0.05 // 5% total contribution rate for 2024
  const employeeShare = 0.5 // Employee pays 50%

  const totalContribution = monthlySalary * rate
  const employeeContribution = totalContribution * employeeShare

  // Apply floor and ceiling
  const minContribution = 250 // Minimum employee share (P500 / 2)
  const maxContribution = 2250 // Maximum employee share (P4,500 / 2)

  return Math.min(Math.max(employeeContribution, minContribution), maxContribution)
}

// Pag-IBIG Contribution (2024)
// Employee share: 1-2% depending on salary
// For salaries > P1,500: 2% of salary, max contribution P100
export function calculatePagIbig(monthlySalary: number): number {
  if (monthlySalary <= 0) return 0

  if (monthlySalary <= 1500) {
    return monthlySalary * 0.01 // 1% for low income
  }

  // 2% for salaries above P1,500, capped at P100
  return Math.min(monthlySalary * 0.02, 100)
}

// Withholding Tax (2024 - TRAIN Law)
// Based on monthly taxable income after deductions
export function calculateWithholdingTax(monthlyTaxableIncome: number): number {
  if (monthlyTaxableIncome <= 0) return 0

  // Annual exemption threshold is P250,000
  // Monthly equivalent is approximately P20,833
  if (monthlyTaxableIncome <= 20833) return 0

  // Tax brackets (monthly equivalents)
  if (monthlyTaxableIncome <= 33333) {
    // 15% of excess over P20,833
    return (monthlyTaxableIncome - 20833) * 0.15
  }

  if (monthlyTaxableIncome <= 66667) {
    // P1,875 + 20% of excess over P33,333
    return 1875 + (monthlyTaxableIncome - 33333) * 0.2
  }

  if (monthlyTaxableIncome <= 166667) {
    // P8,541.67 + 25% of excess over P66,667
    return 8541.67 + (monthlyTaxableIncome - 66667) * 0.25
  }

  if (monthlyTaxableIncome <= 666667) {
    // P33,541.67 + 30% of excess over P166,667
    return 33541.67 + (monthlyTaxableIncome - 166667) * 0.3
  }

  // P183,541.67 + 35% of excess over P666,667
  return 183541.67 + (monthlyTaxableIncome - 666667) * 0.35
}

// Calculate all deductions for an employee
export function calculateAllDeductions(monthlySalary: number): DeductionBreakdown {
  const sssContribution = calculateSSS(monthlySalary)
  const philHealthContribution = calculatePhilHealth(monthlySalary)
  const pagIbigContribution = calculatePagIbig(monthlySalary)

  // Taxable income is gross salary minus mandatory contributions
  const taxableIncome = monthlySalary - sssContribution - philHealthContribution - pagIbigContribution
  const withholdingTax = calculateWithholdingTax(taxableIncome)

  const totalDeductions = sssContribution + philHealthContribution + pagIbigContribution + withholdingTax

  return {
    sssContribution: Math.round(sssContribution * 100) / 100,
    philHealthContribution: Math.round(philHealthContribution * 100) / 100,
    pagIbigContribution: Math.round(pagIbigContribution * 100) / 100,
    withholdingTax: Math.round(withholdingTax * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
  }
}
