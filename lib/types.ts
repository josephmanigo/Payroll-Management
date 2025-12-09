// ==========================================
// PAYFLOW PH - TYPE DEFINITIONS
// ==========================================

// User Roles
export type UserRole = "admin" | "hr" | "employee"

// User
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatarUrl?: string
  employeeId?: string
  createdAt: Date
  updatedAt: Date
}

// Employee
export interface Employee {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  middleName?: string
  suffix?: string // Added suffix field
  email: string
  phone?: string
  dateOfBirth?: Date
  hireDate: Date | string
  department: string
  position: string
  employmentType: "full-time" | "part-time" | "contract" | "probationary"
  status: "active" | "inactive" | "terminated" | "on_leave"
  monthlySalary: number
  dailyRate?: number
  payFrequency: "monthly" | "semi-monthly"
  bankName?: string
  bankAccountNumber?: string
  bankAccountName?: string
  tinNumber?: string // Tax Identification Number
  sssNumber?: string // SSS Number
  philHealthNumber?: string // PhilHealth Number
  philhealthNumber?: string // Alternative casing
  pagIbigNumber?: string // Pag-IBIG Number
  pagibigNumber?: string // Alternative casing
  address?: Address
  emergencyContact?: EmergencyContact
  userId?: string | null
  avatarUrl?: string | null
  hasAccount?: boolean // Added hasAccount flag to track if employee has a login account
  skipSync?: boolean // Flag to skip auto-sync to Supabase (used when createEmployeeAccount handles insertion)
  createdAt: Date | string
  updatedAt: Date | string
}

export interface Address {
  street?: string
  barangay?: string
  city?: string
  province?: string
  state?: string // Added state field
  zipCode?: string
  country?: string
}

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
}

// Payroll Run
export interface PayrollRun {
  id: string
  payPeriodStart: Date
  payPeriodEnd: Date
  payDate: Date
  status: "draft" | "processing" | "approved" | "finalized" | "cancelled"
  totalGross: number
  totalDeductions: number
  totalNet: number
  totalSSS: number
  totalPhilHealth: number
  totalPagIbig: number
  totalWithholdingTax: number
  employeeCount: number
  createdBy: string
  approvedBy?: string
  finalizedAt?: Date
  createdAt: Date
  updatedAt: Date
}

// Payroll Item (Individual employee payroll)
export interface PayrollItem {
  id: string
  payrollRunId: string
  employeeId: string
  employee?: Employee
  payPeriodStart: Date | string
  payPeriodEnd: Date | string
  payDate: Date | string
  basicPay: number
  overtimePay: number
  overtimeHours: number
  allowances: number
  grossPay: number
  sssContribution: number
  philHealthContribution: number
  pagIbigContribution: number
  withholdingTax: number
  otherDeductions: number
  totalDeductions: number
  netPay: number
  status: "pending" | "processed" | "error"
  emailSent?: boolean
  emailSentAt?: Date
  viewedAt?: Date
  createdAt: Date
  updatedAt: Date
}

// Payslip
export interface Payslip {
  id: string
  payrollItemId: string
  employeeId: string
  employee?: Employee
  payrollItem?: PayrollItem
  payPeriodStart: Date
  payPeriodEnd: Date
  payDate: Date
  pdfUrl?: string
  emailSent: boolean
  emailSentAt?: Date
  viewedAt?: Date
  createdAt: Date
}

// Department type
export interface Department {
  id: string
  name: string
  description?: string
  managerId?: string
  manager?: Employee
  employeeCount: number
  createdAt: Date
  updatedAt: Date
}

// Leave type
export interface LeaveRequest {
  id: string
  employee_id: string
  employee?: Employee
  leave_type: "vacation" | "sick" | "emergency" | "maternity" | "paternity" | "unpaid" | "bereavement"
  start_date: string
  end_date: string
  total_days: number
  reason?: string
  status: "pending" | "approved" | "rejected" | "cancelled"
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
}

export interface Leave {
  id: string
  employeeId: string
  employee?: Employee
  type: "vacation" | "sick" | "emergency" | "maternity" | "paternity" | "unpaid"
  startDate: Date
  endDate: Date
  totalDays: number
  reason: string
  status: "pending" | "approved" | "rejected" | "cancelled"
  approvedBy?: string
  approvedAt?: Date
  createdAt: Date
  updatedAt: Date
}

// SalaryAdjustment type
export interface SalaryAdjustment {
  id: string
  employeeId: string
  employee?: Employee
  type: "increase" | "decrease" | "bonus" | "deduction"
  amount: number
  reason: string
  effectiveDate: Date
  status: "pending" | "approved" | "rejected"
  approvedBy?: string
  approvedAt?: Date
  createdAt: Date
  updatedAt: Date
}

// Time Entry
export interface TimeEntry {
  id: string
  employeeId: string
  date: Date
  regularHours: number
  overtimeHours: number
  lateMinutes?: number
  undertimeMinutes?: number
  source: "manual" | "csv-import" | "biometric"
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// Dashboard Stats
export interface DashboardStats {
  totalEmployees: number
  activeEmployees: number
  totalPayrollThisMonth: number
  totalPayrollLastMonth: number
  pendingPayrolls: number
  upcomingPayDate?: Date
  departmentBreakdown: { department: string; count: number; totalSalary: number }[]
  monthlyPayrollTrend: { month: string; amount: number }[]
}

// API Response
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form States
export interface FormState {
  isLoading: boolean
  error?: string
  success?: boolean
}

// Filter & Sort
export interface FilterOptions {
  search?: string
  department?: string
  status?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface SortOptions {
  field: string
  direction: "asc" | "desc"
}

export interface PaginationOptions {
  page: number
  limit: number
}

// BonusRequest type
export interface BonusRequest {
  id: string
  employee_id: string
  amount: number
  reason: string
  status: "pending" | "approved" | "rejected"
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
  updated_at: string
}

// BonusRequest with Employee data
export interface BonusRequestWithEmployee extends BonusRequest {
  employees?: {
    id: string
    first_name: string
    last_name: string
    email: string
    department: string
    position: string
    employee_number: string
  }
}

// Notification type
export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  read: boolean
  link?: string
  created_at: string
}

// Audit Log types
export type AuditEntityType =
  | "employee"
  | "leave"
  | "bonus"
  | "attendance"
  | "payroll"
  | "payslip"
  | "auth"
  | "profile"
  | "department"
  | "salary"
  | "notification"
  | "system"
  | "user"
  | "admin"
  | "report"

export type AuditAction =
  // Auth actions
  | "login"
  | "logout"
  | "password_reset"
  | "password_change"
  // Employee actions
  | "employee_created"
  | "employee_updated"
  | "employee_deleted"
  | "employee_status_changed"
  | "employees_list_viewed"
  | "employee_profile_viewed"
  | "employee_synced"
  | "employees_bulk_synced"
  | "employee_account_checked"
  | "welcome_email_sent"
  // Leave actions
  | "leave_requested"
  | "leave_approved"
  | "leave_rejected"
  | "leave_cancelled"
  | "leave_requests_viewed"
  | "leave_deleted"
  // Bonus actions
  | "bonus_requested"
  | "bonus_approved"
  | "bonus_rejected"
  | "bonus_cancelled"
  | "bonus_requests_viewed"
  | "bonus_deleted"
  // Attendance actions
  | "time_in"
  | "time_out"
  | "attendance_viewed"
  | "attendance_updated"
  | "attendance_deleted"
  // Payroll actions
  | "payroll_created"
  | "payroll_processed"
  | "payroll_deleted"
  | "payslips_bulk_deleted"
  | "payslips_all_deleted"
  | "payslips_viewed"
  | "payslip_emailed"
  | "payslip_downloaded"
  | "payslip_self_emailed"
  | "payslip_viewed"
  | "payslip_synced"
  | "payslip_deleted"
  // Department actions
  | "department_created"
  | "department_updated"
  | "department_deleted"
  // Salary actions
  | "salary_adjustment_created"
  | "salary_adjustment_updated"
  | "salary_adjustment_approved"
  | "salary_adjustment_rejected"
  // Profile/Avatar actions
  | "profile_updated"
  | "avatar_uploaded"
  | "avatar_updated"
  | "avatar_removed"
  // Admin actions
  | "account_created"
  | "account_deleted"
  | "audit_logs_viewed"
  | "audit_log_deleted"
  // System actions
  | "contact_form_submitted"
  | "contact_form_failed"
  | "data_synced"

export interface AuditLog {
  id: string
  user_id: string | null
  user_role: UserRole
  user_name: string | null
  user_email: string | null
  action: string
  entity_type: AuditEntityType
  entity_id: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface AuditLogWithProfile extends AuditLog {
  profiles?: {
    id: string
    full_name: string
    email: string
    role: string
  } | null
}

// Attendance Record type
export interface AttendanceRecord {
  id: string
  employee_id: string
  date: string
  time_in: string | null
  time_out: string | null
  status: "present" | "absent" | "half_day" | "late"
  total_hours: number | null
  late_minutes: number
  undertime_minutes: number
  overtime_hours: number
  night_differential: number
  notes: string | null
  created_at: string
  updated_at: string
}

// ==========================================
// PAYROLL MANAGEMENT - TYPE DEFINITIONS
// ==========================================
