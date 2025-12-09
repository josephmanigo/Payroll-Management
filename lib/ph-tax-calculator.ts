// ==========================================
// PHILIPPINE TAX CALCULATOR
// Based on BIR, SSS, PhilHealth, Pag-IBIG rates for 2024
// ==========================================

// SSS Contribution Table 2024 (Monthly Salary Credit based)
export function calculateSSS(monthlySalary: number): { employee: number; employer: number } {
  // SSS contribution table based on monthly salary credit
  const sssTable = [
    { min: 0, max: 4249.99, ee: 180, er: 390 },
    { min: 4250, max: 4749.99, ee: 202.5, er: 437.5 },
    { min: 4750, max: 5249.99, ee: 225, er: 485 },
    { min: 5250, max: 5749.99, ee: 247.5, er: 532.5 },
    { min: 5750, max: 6249.99, ee: 270, er: 580 },
    { min: 6250, max: 6749.99, ee: 292.5, er: 627.5 },
    { min: 6750, max: 7249.99, ee: 315, er: 675 },
    { min: 7250, max: 7749.99, ee: 337.5, er: 722.5 },
    { min: 7750, max: 8249.99, ee: 360, er: 770 },
    { min: 8250, max: 8749.99, ee: 382.5, er: 817.5 },
    { min: 8750, max: 9249.99, ee: 405, er: 865 },
    { min: 9250, max: 9749.99, ee: 427.5, er: 912.5 },
    { min: 9750, max: 10249.99, ee: 450, er: 960 },
    { min: 10250, max: 10749.99, ee: 472.5, er: 1007.5 },
    { min: 10750, max: 11249.99, ee: 495, er: 1055 },
    { min: 11250, max: 11749.99, ee: 517.5, er: 1102.5 },
    { min: 11750, max: 12249.99, ee: 540, er: 1150 },
    { min: 12250, max: 12749.99, ee: 562.5, er: 1197.5 },
    { min: 12750, max: 13249.99, ee: 585, er: 1245 },
    { min: 13250, max: 13749.99, ee: 607.5, er: 1292.5 },
    { min: 13750, max: 14249.99, ee: 630, er: 1340 },
    { min: 14250, max: 14749.99, ee: 652.5, er: 1387.5 },
    { min: 14750, max: 15249.99, ee: 675, er: 1435 },
    { min: 15250, max: 15749.99, ee: 697.5, er: 1482.5 },
    { min: 15750, max: 16249.99, ee: 720, er: 1530 },
    { min: 16250, max: 16749.99, ee: 742.5, er: 1577.5 },
    { min: 16750, max: 17249.99, ee: 765, er: 1625 },
    { min: 17250, max: 17749.99, ee: 787.5, er: 1672.5 },
    { min: 17750, max: 18249.99, ee: 810, er: 1720 },
    { min: 18250, max: 18749.99, ee: 832.5, er: 1767.5 },
    { min: 18750, max: 19249.99, ee: 855, er: 1815 },
    { min: 19250, max: 19749.99, ee: 877.5, er: 1862.5 },
    { min: 19750, max: 20249.99, ee: 900, er: 1910 },
    { min: 20250, max: 20749.99, ee: 922.5, er: 1957.5 },
    { min: 20750, max: 21249.99, ee: 945, er: 2005 },
    { min: 21250, max: 21749.99, ee: 967.5, er: 2052.5 },
    { min: 21750, max: 22249.99, ee: 990, er: 2100 },
    { min: 22250, max: 22749.99, ee: 1012.5, er: 2147.5 },
    { min: 22750, max: 23249.99, ee: 1035, er: 2195 },
    { min: 23250, max: 23749.99, ee: 1057.5, er: 2242.5 },
    { min: 23750, max: 24249.99, ee: 1080, er: 2290 },
    { min: 24250, max: 24749.99, ee: 1102.5, er: 2337.5 },
    { min: 24750, max: 29749.99, ee: 1125, er: 2385 },
    { min: 29750, max: Number.POSITIVE_INFINITY, ee: 1350, er: 2850 },
  ]

  const bracket = sssTable.find((b) => monthlySalary >= b.min && monthlySalary <= b.max)
  return bracket ? { employee: bracket.ee, employer: bracket.er } : { employee: 1350, employer: 2850 }
}

// PhilHealth Contribution 2024 (5% of monthly basic salary, shared equally)
export function calculatePhilHealth(monthlySalary: number): { employee: number; employer: number } {
  const rate = 0.05 // 5% total
  const minContribution = 500 // Minimum monthly contribution
  const maxSalaryBase = 100000 // Maximum salary base for computation

  const salaryBase = Math.min(monthlySalary, maxSalaryBase)
  const totalContribution = Math.max(salaryBase * rate, minContribution)
  const share = totalContribution / 2

  return { employee: share, employer: share }
}

// Pag-IBIG Contribution 2024
export function calculatePagIbig(monthlySalary: number): { employee: number; employer: number } {
  // Employee: 1% if salary <= 1,500; 2% if salary > 1,500 (max PHP 100)
  // Employer: 2% (max PHP 100)
  const maxContribution = 100

  const employeeRate = monthlySalary <= 1500 ? 0.01 : 0.02
  const employerRate = 0.02

  const employeeContribution = Math.min(monthlySalary * employeeRate, maxContribution)
  const employerContribution = Math.min(monthlySalary * employerRate, maxContribution)

  return { employee: employeeContribution, employer: employerContribution }
}

// BIR Withholding Tax (TRAIN Law 2024 - Monthly)
export function calculateWithholdingTax(taxableIncome: number): number {
  // Taxable income brackets for monthly compensation
  const taxBrackets = [
    { min: 0, max: 20833, fixed: 0, rate: 0, excess: 0 },
    { min: 20833, max: 33332, fixed: 0, rate: 0.15, excess: 20833 },
    { min: 33333, max: 66666, fixed: 1875, rate: 0.2, excess: 33333 },
    { min: 66667, max: 166666, fixed: 8541.67, rate: 0.25, excess: 66667 },
    { min: 166667, max: 666666, fixed: 33541.67, rate: 0.3, excess: 166667 },
    { min: 666667, max: Number.POSITIVE_INFINITY, fixed: 183541.67, rate: 0.35, excess: 666667 },
  ]

  const bracket = taxBrackets.find((b) => taxableIncome >= b.min && taxableIncome <= b.max)
  if (!bracket || taxableIncome <= 20833) return 0

  const excessAmount = taxableIncome - bracket.excess
  return bracket.fixed + excessAmount * bracket.rate
}

// Complete payroll calculation for an employee
export interface PayrollCalculation {
  grossPay: number
  basicPay: number
  overtimePay: number
  allowances: number
  sss: { employee: number; employer: number }
  philHealth: { employee: number; employer: number }
  pagIbig: { employee: number; employer: number }
  withholdingTax: number
  totalDeductions: number
  netPay: number
}

export function calculatePayroll(
  monthlyBasicSalary: number,
  overtimeHours = 0,
  allowances = 0,
  isSemiMonthly = true,
): PayrollCalculation {
  // For semi-monthly, divide monthly salary by 2
  const payPeriodMultiplier = isSemiMonthly ? 0.5 : 1
  const basicPay = monthlyBasicSalary * payPeriodMultiplier

  // Overtime calculation (1.25x for regular OT, using daily rate)
  const dailyRate = monthlyBasicSalary / 22 // 22 working days
  const hourlyRate = dailyRate / 8
  const overtimePay = overtimeHours * hourlyRate * 1.25

  const grossPay = basicPay + overtimePay + allowances

  // Government contributions (calculated on monthly basis, then divided for semi-monthly)
  const sss = calculateSSS(monthlyBasicSalary)
  const philHealth = calculatePhilHealth(monthlyBasicSalary)
  const pagIbig = calculatePagIbig(monthlyBasicSalary)

  // Apply pay period multiplier to contributions
  const sssEmployee = sss.employee * payPeriodMultiplier
  const philHealthEmployee = philHealth.employee * payPeriodMultiplier
  const pagIbigEmployee = pagIbig.employee * payPeriodMultiplier

  // Taxable income = Gross - SSS - PhilHealth - Pag-IBIG
  const taxableIncome = (grossPay - sssEmployee - philHealthEmployee - pagIbigEmployee) * (isSemiMonthly ? 2 : 1)
  const monthlyTax = calculateWithholdingTax(taxableIncome)
  const withholdingTax = monthlyTax * payPeriodMultiplier

  const totalDeductions = sssEmployee + philHealthEmployee + pagIbigEmployee + withholdingTax
  const netPay = grossPay - totalDeductions

  return {
    grossPay,
    basicPay,
    overtimePay,
    allowances,
    sss: { employee: sssEmployee, employer: sss.employer * payPeriodMultiplier },
    philHealth: { employee: philHealthEmployee, employer: philHealth.employer * payPeriodMultiplier },
    pagIbig: { employee: pagIbigEmployee, employer: pagIbig.employer * payPeriodMultiplier },
    withholdingTax,
    totalDeductions,
    netPay,
  }
}
