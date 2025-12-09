"use client"

import { CardDescription } from "@/components/ui/card"

import * as React from "react"
import { useState } from "react" // Import useState
import type { ColumnDef } from "@tanstack/react-table"
import {
  MoreHorizontal,
  Plus,
  ArrowUpDown,
  Mail,
  Phone,
  Building2,
  Download,
  Upload,
  Eye,
  Pencil,
  Trash2,
  FileText,
  UserCheck,
  UserX,
  Send,
  Calendar,
  MapPin,
  User,
  Briefcase,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Banknote,
  Loader2,
  Copy,
  UserPlus,
  Lock,
  Key,
  Shield,
} from "lucide-react"
import { AdminLayout } from "@/components/layout/admin-layout"
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
// CHANGE: Import PESO_SIGN constant
import { formatCurrency, formatDate, getInitials, getStatusColor, PESO_SIGN } from "@/lib/utils"
import { usePayrollStore } from "@/lib/store"
import type { Employee } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
// CHANGE: Added AvatarUploader import
import { AvatarUploader } from "@/components/ui/avatar-uploader"
import { downloadPayslipPDF } from "@/lib/pdf-generator"
import { sendPayslipEmail } from "@/app/admin/payroll/actions"
// CHANGE: Imported syncExistingEmployeeAccounts and updated createEmployeeAccount import
import {
  createEmployeeAccount,
  syncExistingEmployeeAccounts,
  changeEmployeePassword, // CHANGE: Added changeEmployeePassword import
  sendWelcomeEmail,
  getAllEmployees, // Added getAllEmployees import
  updateEmployeeStatus,
  getNextEmployeeNumber, // Added import
} from "./actions"
// CHANGE: Added import for bulk sync function
import { bulkSyncEmployeesToSupabase } from "@/lib/supabase/auto-sync"
// CHANGE: Removed SeedEmployeesButton import - no longer needed in header
// import { SeedEmployeesButton } from "./seed-button"
// CHANGE: Added imports for downloadEmployeeData and exportEmployeesCSV
import { exportEmployeesCSV } from "./export-utils"

export default function EmployeesPage() {
  const {
    employees,
    setEmployees, // Added setEmployees
    addEmployee,
    updateEmployee,
    deleteEmployee,
    payrollItems,
    departments,
    payrollRuns,
    setPayrollItems,
  } = usePayrollStore() // CHANGE: Added payrollRuns and setPayrollItems
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isPayslipsDialogOpen, setIsPayslipsDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = React.useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false)
  const [isEmailDialogOpen, setIsEmailDialogOpen] = React.useState(false)
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = React.useState<string[]>([])
  const [mounted, setMounted] = React.useState(false)
  const [isLoadingEmployees, setIsLoadingEmployees] = React.useState(true)
  const [filterDepartment, setFilterDepartment] = React.useState("all")
  const [filterStatus, setFilterStatus] = React.useState("all")
  const [filterEmploymentType, setFilterEmploymentType] = React.useState("all")
  const { toast } = useToast()

  // CHANGE: Added loading states for PDF download and email sending
  const [downloadingPayslipId, setDownloadingPayslipId] = React.useState<string | null>(null)
  const [sendingEmailPayslipId, setSendingEmailPayslipId] = React.useState<string | null>(null)

  // Email form state
  const [emailData, setEmailData] = React.useState({
    subject: "",
    message: "",
  })
  const [isSendingEmail, setIsSendingEmail] = React.useState(false)

  // CHANGE: Add sync accounts loading state
  const [isSyncing, setIsSyncing] = useState(false)
  // CHANGE: Added state for syncing to database
  const [isSyncingToDb, setIsSyncingToDb] = React.useState(false)

  const [isCreatingAccount, setIsCreatingAccount] = React.useState(false)
  // CHANGE: Renamed showCredentialsDialog to setShowCredentialsDialog and added setNewCredentials
  const [showCredentialsDialog, setShowCredentialsDialog] = React.useState(false)
  const [newEmployeeCredentials, setNewCredentials] = React.useState<{
    // CHANGE: Renamed state variable and type
    email: string
    tempPassword: string
    firstName: string
  } | null>(null)
  const [isSendingWelcomeEmail, setIsSendingWelcomeEmail] = React.useState(false)

  // CHANGE: Added state for change password feature
  // CHANGE: Add state for password change dialog
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false)
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [isChangingPassword, setIsChangingPassword] = React.useState(false)
  const [passwordForm, setPasswordForm] = React.useState({
    newPassword: "",
    confirmPassword: "",
  })
  const [passwordError, setPasswordError] = React.useState("")

  // Form state for add/edit
  // CHANGE: Added avatarUrl and avatarFile to form state
  const [formData, setFormData] = React.useState({
    firstName: "",
    lastName: "",
    middleName: "",
    suffix: "", // Added suffix
    email: "",
    phone: "",
    department: "",
    position: "",
    monthlySalary: "",
    dailyRate: "",
    payFrequency: "semi-monthly" as "weekly" | "bi-weekly" | "semi-monthly" | "monthly",
    hireDate: new Date().toISOString().split("T")[0],
    employmentType: "full-time" as Employee["employmentType"],
    status: "active" as Employee["status"],
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
    tinNumber: "",
    sssNumber: "",
    philHealthNumber: "",
    pagIbigNumber: "",
    street: "",
    barangay: "",
    city: "",
    province: "",
    zipCode: "",
    country: "Philippines", // Added country
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: "",
    avatarUrl: null as string | null,
    employeeNumber: "", // Added employeeNumber
    address: {}, // Added address object
    state: "", // Added state
  })

  const [nextEmployeeNumber, setNextEmployeeNumber] = React.useState("")

  // Import data state
  const [importData, setImportData] = React.useState("")

  React.useEffect(() => {
    const fetchEmployees = async () => {
      setIsLoadingEmployees(true)
      try {
        const result = await getAllEmployees()
        if (result.success && result.data) {
          // Map database fields to Employee type
          const mappedEmployees = result.data.map((emp: any) => ({
            id: emp.id,
            employeeNumber: emp.employee_number || "",
            firstName: emp.first_name || "",
            lastName: emp.last_name || "",
            middleName: emp.middle_name || "",
            suffix: emp.suffix || "",
            email: emp.email || "",
            phone: emp.phone || "",
            department: emp.department || "",
            position: emp.position || "",
            monthlySalary: emp.monthly_salary || 0,
            dailyRate: emp.daily_rate || 0,
            payFrequency: emp.pay_frequency || "semi-monthly",
            hireDate: emp.hire_date || new Date().toISOString(),
            employmentType: emp.employment_type || "full-time",
            status: emp.status || "active",
            bankName: emp.bank_name || "",
            bankAccountNumber: emp.bank_account_number || "",
            bankAccountName: emp.bank_account_name || "",
            tinNumber: emp.tin_number || "",
            sssNumber: emp.sss_number || "",
            philHealthNumber: emp.philhealth_number || "",
            pagIbigNumber: emp.pagibig_number || "",
            avatarUrl: emp.avatar_url || null,
            address: {
              street: emp.street || "",
              barangay: emp.barangay || "",
              city: emp.city || "",
              province: emp.province || "",
              zipCode: emp.zip_code || "",
              country: emp.country || "Philippines",
            },
            emergencyContact: {
              name: emp.emergency_contact_name || "",
              relationship: emp.emergency_contact_relationship || "",
              phone: emp.emergency_contact_phone || "",
            },
            createdAt: emp.created_at ? new Date(emp.created_at) : new Date(),
            updatedAt: emp.updated_at ? new Date(emp.updated_at) : new Date(),
          }))
          setEmployees(mappedEmployees)
        }
      } catch (error) {
        console.error("[v0] Error fetching employees:", error)
      } finally {
        setIsLoadingEmployees(false)
      }
    }

    fetchEmployees()
  }, [setEmployees])

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    const fetchNextNumber = async () => {
      if (isAddDialogOpen && !formData.employeeNumber) {
        const nextNum = await getNextEmployeeNumber()
        setNextEmployeeNumber(nextNum)
        setFormData((prev) => ({ ...prev, employeeNumber: nextNum }))
      }
    }
    fetchNextNumber()
  }, [isAddDialogOpen])

  // CHANGE: Added function to sync existing employees
  const handleSyncAccounts = async () => {
    setIsSyncing(true)
    try {
      const result = await syncExistingEmployeeAccounts()
      if (result.error) {
        toast({
          title: "Sync Failed",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Sync Complete",
          description: `Created ${result.synced} account(s). ${result.failed ? `${result.failed} failed.` : ""}`,
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sync employee accounts",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  // CHANGE: Added function to sync all local employees to database
  const handleSyncToDatabase = async () => {
    console.log("[v0] Starting sync to database, employees count:", employees.length)
    console.log(
      "[v0] Employees to sync:",
      employees.map((e) => ({ email: e.email, firstName: e.firstName, lastName: e.lastName })),
    )

    setIsSyncingToDb(true)
    try {
      const result = await bulkSyncEmployeesToSupabase(employees)
      console.log("[v0] Sync result:", result)

      if (result.failed > 0) {
        toast({
          title: "Sync Completed with Errors",
          description: `Synced ${result.synced} employees, ${result.failed} failed. ${result.errors.join(", ")}`,
          variant: "destructive",
        })
      } else if (result.synced === 0) {
        toast({
          title: "No Employees to Sync",
          description: "There are no employees in the local store to sync.",
          variant: "default",
        })
      } else {
        toast({
          title: "Sync Successful",
          description: `All ${result.synced} employees synced to database.`,
        })
      }
    } catch (error) {
      console.error("[v0] Sync error:", error)
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync employees to database.",
        variant: "destructive",
      })
    } finally {
      setIsSyncingToDb(false)
    }
  }

  // CHANGE: Updated resetFormData to include avatarUrl and other new fields
  const resetFormData = () => {
    setFormData({
      firstName: "",
      lastName: "",
      middleName: "",
      suffix: "",
      email: "",
      phone: "",
      department: "",
      position: "",
      monthlySalary: "",
      dailyRate: "",
      payFrequency: "semi-monthly",
      hireDate: new Date().toISOString().split("T")[0],
      employmentType: "full-time",
      status: "active",
      bankName: "",
      bankAccountNumber: "",
      bankAccountName: "",
      tinNumber: "",
      sssNumber: "",
      philHealthNumber: "",
      pagIbigNumber: "",
      street: "",
      barangay: "",
      city: "",
      province: "",
      zipCode: "",
      country: "Philippines",
      emergencyContactName: "",
      emergencyContactRelationship: "",
      emergencyContactPhone: "",
      avatarUrl: null,
      employeeNumber: "",
      address: {},
      state: "",
    })
    setNextEmployeeNumber("") // Reset next employee number as well
  }

  // CHANGE: Updated populateFormData to include avatarUrl and other new fields
  const populateFormData = (employee: Employee) => {
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      middleName: employee.middleName || "",
      suffix: employee.suffix || "",
      email: employee.email,
      phone: employee.phone || "",
      department: employee.department,
      position: employee.position,
      monthlySalary: String(employee.monthlySalary),
      hireDate: new Date(employee.hireDate).toISOString().split("T")[0],
      employmentType: employee.employmentType,
      status: employee.status,
      bankName: employee.bankName || "",
      bankAccountNumber: employee.bankAccountNumber || "",
      bankAccountName: employee.bankAccountName || "",
      tinNumber: employee.tinNumber || "",
      sssNumber: employee.sssNumber || "",
      philHealthNumber: employee.philHealthNumber || "",
      pagIbigNumber: employee.pagIbigNumber || "",
      street: employee.address?.street || "",
      barangay: employee.address?.barangay || "",
      city: employee.address?.city || "",
      province: employee.address?.province || "",
      zipCode: employee.address?.zipCode || "",
      country: employee.address?.country || "Philippines",
      emergencyContactName: employee.emergencyContact?.name || "",
      emergencyContactRelationship: employee.emergencyContact?.relationship || "",
      emergencyContactPhone: employee.emergencyContact?.phone || "",
      avatarUrl: employee.avatarUrl || null,
      employeeNumber: employee.employeeNumber || "",
      address: employee.address || {},
      state: employee.address?.state || "",
    })
  }

  // CHANGE: Updated handleAddEmployee to pass employeeId and link account
  const handleAddEmployee = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    // Create the employee record first
    const newEmployeeId = crypto.randomUUID()
    const monthlySalary = Number.parseFloat(formData.monthlySalary) || 0
    const dailyRate = formData.dailyRate ? Number.parseFloat(formData.dailyRate) : Math.round(monthlySalary / 22)

    const employeeNumber = formData.employeeNumber || nextEmployeeNumber || (await getNextEmployeeNumber())

    // This handles the Supabase insertion, so we don't want the store to also sync
    const accountResult = await createEmployeeAccount({
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      department: formData.department,
      position: formData.position,
      monthlySalary: monthlySalary,
      hireDate: formData.hireDate,
      employeeNumber: employeeNumber,
      phone: formData.phone,
      employeeId: newEmployeeId,
    })

    // The store will skip syncing if skipSync flag is passed
    const newEmployee: Employee = {
      id: newEmployeeId,
      firstName: formData.firstName,
      middleName: formData.middleName,
      lastName: formData.lastName,
      suffix: formData.suffix,
      email: formData.email,
      phone: formData.phone,
      department: formData.department,
      position: formData.position,
      status: formData.status as "active" | "inactive" | "on_leave" | "terminated",
      hireDate: formData.hireDate,
      employeeNumber: employeeNumber,
      monthlySalary: monthlySalary,
      avatarUrl: formData.avatarUrl,
      address: {
        street: formData.street,
        barangay: formData.barangay,
        city: formData.city,
        province: formData.province,
        zipCode: formData.zipCode,
        country: formData.country,
        state: formData.state,
      },
      sssNumber: formData.sssNumber,
      philHealthNumber: formData.philHealthNumber,
      pagIbigNumber: formData.pagIbigNumber,
      tinNumber: formData.tinNumber,
      bankName: formData.bankName,
      bankAccountNumber: formData.bankAccountNumber,
      employmentType: formData.employmentType as "full-time" | "part-time" | "contract" | "probationary",
      emergencyContact: formData.emergencyContactName
        ? {
            name: formData.emergencyContactName,
            relationship: formData.emergencyContactRelationship,
            phone: formData.emergencyContactPhone,
          }
        : undefined,
      dailyRate: dailyRate,
      payFrequency: formData.payFrequency,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: accountResult.userId || null,
      skipSync: true, // Flag to prevent store from syncing to Supabase
    }

    addEmployee(newEmployee)

    if (accountResult.error) {
      toast({
        title: "Employee Added",
        description: `Employee added but account creation failed: ${accountResult.error}`,
        variant: "destructive",
      })
    } else if (accountResult.alreadyExists) {
      toast({
        title: "Employee Added",
        description: "Employee added. They can log in with their existing account.",
      })
    } else {
      // Show credentials dialog
      setNewCredentials({
        email: formData.email,
        tempPassword: accountResult.tempPassword || "employee",
        firstName: formData.firstName,
      })
      setShowCredentialsDialog(true)
    }

    setIsAddDialogOpen(false)
    resetFormData()
  }

  // CHANGE: Updated handleEditEmployee to include avatarUrl and other new fields
  const handleEditEmployee = () => {
    if (!selectedEmployee) return

    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    updateEmployee(selectedEmployee.id, {
      firstName: formData.firstName,
      lastName: formData.lastName,
      middleName: formData.middleName,
      suffix: formData.suffix,
      email: formData.email,
      phone: formData.phone,
      department: formData.department,
      position: formData.position,
      monthlySalary: Number.parseFloat(formData.monthlySalary) || 0,
      dailyRate: formData.dailyRate
        ? Number.parseFloat(formData.dailyRate)
        : Math.round((Number.parseFloat(formData.monthlySalary) || 0) / 22),
      hireDate: new Date(formData.hireDate),
      employmentType: formData.employmentType,
      status: formData.status,
      bankName: formData.bankName,
      bankAccountNumber: formData.bankAccountNumber,
      bankAccountName: formData.bankAccountName,
      tinNumber: formData.tinNumber,
      sssNumber: formData.sssNumber,
      philHealthNumber: formData.philHealthNumber,
      pagIbigNumber: formData.pagIbigNumber,
      avatarUrl: formData.avatarUrl || undefined,
      address: {
        street: formData.street,
        barangay: formData.barangay,
        city: formData.city,
        province: formData.province,
        zipCode: formData.zipCode,
        country: formData.country,
        state: formData.state,
      },
      emergencyContact: formData.emergencyContactName
        ? {
            name: formData.emergencyContactName,
            relationship: formData.emergencyContactRelationship,
            phone: formData.emergencyContactPhone,
          }
        : undefined,
      employeeNumber: formData.employeeNumber,
      payFrequency: formData.payFrequency,
    })

    setIsEditDialogOpen(false)
    setSelectedEmployee(null)
    resetFormData()

    toast({
      title: "Employee Updated",
      description: "Employee information has been successfully updated.",
    })
  }

  const handleDeleteEmployee = () => {
    if (!selectedEmployee) return

    deleteEmployee(selectedEmployee.id)
    setIsDeleteDialogOpen(false)
    setSelectedEmployee(null)

    toast({
      title: "Employee Deleted",
      description: "Employee has been permanently removed.",
    })
  }

  const handleBulkDelete = () => {
    selectedEmployeeIds.forEach((id) => deleteEmployee(id))
    setSelectedEmployeeIds([])
    setIsBulkDeleteDialogOpen(false)

    toast({
      title: "Employees Deleted",
      description: `${selectedEmployeeIds.length} employees have been permanently removed.`,
    })
  }

  const handleBulkStatusChange = (status: Employee["status"]) => {
    selectedEmployeeIds.forEach((id) => updateEmployeeStatus(id, status)) // Use updateEmployeeStatus
    setSelectedEmployeeIds([])

    toast({
      title: "Status Updated",
      description: `${selectedEmployeeIds.length} employees have been updated to ${status}.`,
    })
  }

  const handleExportCSV = () => {
    const headers = [
      "Employee Number",
      "First Name",
      "Middle Name",
      "Last Name",
      "Suffix", // Added Suffix
      "Email",
      "Phone",
      "Department",
      "Position",
      "Monthly Salary",
      "Daily Rate", // Added Daily Rate
      "Pay Frequency", // Added Pay Frequency
      "Employment Type",
      "Status",
      "Hire Date",
      "Bank Name",
      "Bank Account Number", // Added Bank Account Number
      "Bank Account Name", // Added Bank Account Name
      "TIN",
      "SSS",
      "PhilHealth",
      "Pag-IBIG",
      "Street", // Added Address fields
      "Barangay",
      "City",
      "Province",
      "State",
      "ZIP Code",
      "Country",
      "Emergency Contact Name", // Added Emergency Contact fields
      "Emergency Contact Relationship",
      "Emergency Contact Phone",
    ]

    const csvData = filteredEmployees.map((emp) => [
      emp.employeeNumber || "",
      emp.firstName,
      emp.middleName || "",
      emp.lastName,
      emp.suffix || "",
      emp.email,
      emp.phone || "",
      emp.department,
      emp.position,
      emp.monthlySalary,
      emp.dailyRate || "", // Export Daily Rate
      emp.payFrequency || "", // Export Pay Frequency
      emp.employmentType,
      emp.status,
      formatDate(emp.hireDate),
      emp.bankName || "",
      emp.bankAccountNumber || "",
      emp.bankAccountName || "",
      emp.tinNumber || "",
      emp.sssNumber || "",
      emp.philHealthNumber || "",
      emp.pagIbigNumber || "",
      emp.address?.street || "",
      emp.address?.barangay || "",
      emp.address?.city || "",
      emp.address?.province || "",
      emp.address?.state || "",
      emp.address?.zipCode || "",
      emp.address?.country || "",
      emp.emergencyContact?.name || "",
      emp.emergencyContact?.relationship || "",
      emp.emergencyContact?.phone || "",
    ])

    const csvContent = [headers.join(","), ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `employees_${new Date().toISOString().split("T")[0]}.csv`
    link.click()

    toast({
      title: "Export Successful",
      description: `${filteredEmployees.length} employees exported to CSV.`,
    })
  }

  const handleImportCSV = () => {
    if (!importData.trim()) {
      toast({
        title: "No Data",
        description: "Please paste CSV data to import.",
        variant: "destructive",
      })
      return
    }

    try {
      const lines = importData.trim().split("\n")
      const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
      let importedCount = 0

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""))
        if (values.length >= 7) {
          const monthlySalary = Number.parseFloat(values[headers.indexOf("Monthly Salary")]) || 30000
          const dailyRate = values[headers.indexOf("Daily Rate")]
            ? Number.parseFloat(values[headers.indexOf("Daily Rate")])
            : Math.round(monthlySalary / 22)
          const hireDate = new Date(values[headers.indexOf("Hire Date")] || new Date())

          addEmployee({
            firstName: values[headers.indexOf("First Name")] || values[0] || "",
            lastName: values[headers.indexOf("Last Name")] || values[2] || "",
            middleName: values[headers.indexOf("Middle Name")] || values[1] || "",
            suffix: values[headers.indexOf("Suffix")] || "",
            email: values[headers.indexOf("Email")] || values[3] || "",
            phone: values[headers.indexOf("Phone")] || values[4] || "",
            department: values[headers.indexOf("Department")] || values[5] || "Engineering",
            position: values[headers.indexOf("Position")] || values[6] || "Staff",
            monthlySalary: monthlySalary,
            dailyRate: dailyRate,
            hireDate: hireDate.toISOString().split("T")[0],
            employmentType: (values[headers.indexOf("Employment Type")] as Employee["employmentType"]) || "full-time",
            status: (values[headers.indexOf("Status")] as Employee["status"]) || "active",
            payFrequency:
              (values[headers.indexOf("Pay Frequency")] as "weekly" | "bi-weekly" | "semi-monthly" | "monthly") ||
              "semi-monthly",
            address: {
              street: values[headers.indexOf("Street")] || "",
              barangay: values[headers.indexOf("Barangay")] || "",
              city: values[headers.indexOf("City")] || "",
              province: values[headers.indexOf("Province")] || "",
              state: values[headers.indexOf("State")] || "",
              zipCode: values[headers.indexOf("ZIP Code")] || "",
              country: values[headers.indexOf("Country")] || "Philippines",
            },
            sssNumber: values[headers.indexOf("SSS")] || "",
            philHealthNumber: values[headers.indexOf("PhilHealth")] || "",
            pagIbigNumber: values[headers.indexOf("Pag-IBIG")] || "",
            tinNumber: values[headers.indexOf("TIN")] || "",
            bankName: values[headers.indexOf("Bank Name")] || "",
            bankAccountNumber: values[headers.indexOf("Bank Account Number")] || "",
            bankAccountName: values[headers.indexOf("Bank Account Name")] || "",
            emergencyContact: {
              name: values[headers.indexOf("Emergency Contact Name")] || "",
              relationship: values[headers.indexOf("Emergency Contact Relationship")] || "",
              phone: values[headers.indexOf("Emergency Contact Phone")] || "",
            },
            employeeNumber: values[headers.indexOf("Employee Number")] || `EMP-${Date.now()}-${importedCount}`,
            avatarUrl: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: null,
          } as Employee) // Cast to Employee
          importedCount++
        }
      }

      setIsImportDialogOpen(false)
      setImportData("")

      toast({
        title: "Import Successful",
        description: `${importedCount} employees imported successfully.`,
      })
    } catch (error) {
      console.error("Import Error:", error)
      toast({
        title: "Import Failed",
        description: "Failed to parse CSV data. Please check the format and required columns.",
        variant: "destructive",
      })
    }
  }

  const handleSendEmail = async () => {
    if (!selectedEmployee) return

    if (!emailData.subject || !emailData.message) {
      toast({
        title: "Missing Fields",
        description: "Please fill in subject and message.",
        variant: "destructive",
      })
      return
    }

    setIsSendingEmail(true)

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: selectedEmployee.email,
          subject: emailData.subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #10b981; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">HCDC Payroll System</h1>
              </div>
              <div style="padding: 30px; background-color: #f9fafb;">
                <p style="color: #374151; font-size: 16px;">Dear ${selectedEmployee.firstName} ${selectedEmployee.lastName},</p>
                <div style="color: #374151; font-size: 16px; white-space: pre-wrap;">${emailData.message}</div>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                <p style="color: #6b7280; font-size: 14px;">
                  This email was sent from the HCDC Payroll Management System.
                </p>
              </div>
            </div>
          `,
          text: emailData.message,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Email Sent",
          description: `Email successfully sent to ${selectedEmployee.email}`,
        })
        setIsEmailDialogOpen(false)
        setEmailData({ subject: "", message: "" })
      } else {
        throw new Error(result.error || "Failed to send email")
      }
    } catch (error) {
      console.error("Failed to send email:", error)
      toast({
        title: "Failed to Send Email",
        description: error instanceof Error ? error.message : "An error occurred while sending the email.",
        variant: "destructive",
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  // CHANGE: Added handler for downloading payslip PDF
  const handleDownloadPayslipPDF = async (payslip: (typeof payrollItems)[0]) => {
    if (!selectedEmployee) return

    setDownloadingPayslipId(payslip.id)
    try {
      const payrollRun = payrollRuns.find((pr) => pr.id === payslip.payrollRunId)
      downloadPayslipPDF({
        payslip,
        employee: selectedEmployee,
        payrollRun,
      })
      toast({
        title: "Download Started",
        description: "Your payslip PDF is being downloaded.",
      })
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDownloadingPayslipId(null)
    }
  }

  // CHANGE: Added handler for sending payslip email
  const handleSendPayslipEmail = async (payslip: (typeof payrollItems)[0]) => {
    if (!selectedEmployee) return

    setSendingEmailPayslipId(payslip.id)
    try {
      const payrollRun = payrollRuns.find((pr) => pr.id === payslip.payrollRunId)
      const payPeriod = payrollRun
        ? `${formatDate(payrollRun.payPeriodStart)} - ${formatDate(payrollRun.payPeriodEnd)}`
        : payslip.payrollRunId

      const result = await sendPayslipEmail({
        payslipId: payslip.id,
        employeeEmail: selectedEmployee.email,
        employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
        payPeriod,
        netPay: payslip.netPay,
        grossPay: payslip.grossPay,
        totalDeductions: payslip.totalDeductions,
        basicPay: payslip.basicPay,
        overtimePay: payslip.overtimePay,
        allowances: payslip.allowances,
        sssContribution: payslip.sssContribution,
        philHealthContribution: payslip.philHealthContribution,
        pagIbigContribution: payslip.pagIbigContribution,
        withholdingTax: payslip.withholdingTax,
      })

      if (result.success) {
        setPayrollItems((prev) =>
          prev.map((p) => (p.id === payslip.id ? { ...p, emailSent: true, emailSentAt: new Date().toISOString() } : p)),
        )
        toast({
          title: "Email Sent",
          description: `Payslip sent to ${selectedEmployee.email}`,
        })
      } else {
        toast({
          title: "Email Failed",
          description: result.error || "Failed to send payslip email.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Email Failed",
        description: "An unexpected error occurred while sending the email.",
        variant: "destructive",
      })
    } finally {
      setSendingEmailPayslipId(null)
    }
  }

  // CHANGE: Added handler for downloading payslip PDF
  // CHANGE: Added handler for sending payslip email
  // CHANGE: Added handler for downloading employee data
  const handleDownloadEmployeeData = async () => {
    // Assuming exportEmployeesCSV handles the filtering based on current state if needed,
    // or we can pass filteredEmployees
    await exportEmployeesCSV(filteredEmployees)
    toast({
      title: "Download Initiated",
      description: "Employee data export is being prepared.",
    })
  }

  // CHANGE: Added handler for changing password
  const handleChangePassword = async () => {
    if (!selectedEmployee) return

    setPasswordError("")

    if (passwordForm.newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters")
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Passwords do not match")
      return
    }

    setIsChangingPassword(true)

    const result = await changeEmployeePassword(selectedEmployee.email, passwordForm.newPassword)

    if (result.error) {
      setPasswordError(result.error)
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Password Changed",
        description: `Password has been updated for ${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
      })
      setPasswordForm({ newPassword: "", confirmPassword: "" })
    }

    setIsChangingPassword(false)
  }

  // CHANGE: Add handleChangePassword function (from updates)
  const handleChangePasswordUpdate = async () => {
    if (!selectedEmployee) return

    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure the passwords match.",
        variant: "destructive",
      })
      return
    }

    setIsChangingPassword(true)
    try {
      const result = await changeEmployeePassword(selectedEmployee.email, newPassword)

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Password Changed",
          description: `Password has been updated for ${selectedEmployee.firstName} ${selectedEmployee.lastName}.`,
        })
        setIsPasswordDialogOpen(false)
        setNewPassword("")
        setConfirmPassword("")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to change password. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const copyCredentials = () => {
    if (!newEmployeeCredentials) return

    const text = `Email: ${newEmployeeCredentials.email}\nTemporary Password: ${newEmployeeCredentials.tempPassword}`
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: "Credentials copied to clipboard.",
    })
  }

  const handleSendWelcomeEmail = async () => {
    if (!newEmployeeCredentials) return

    setIsSendingWelcomeEmail(true)

    const result = await sendWelcomeEmail({
      email: newEmployeeCredentials.email,
      firstName: newEmployeeCredentials.firstName,
      tempPassword: newEmployeeCredentials.tempPassword,
    })

    setIsSendingWelcomeEmail(false)

    if (result.emailSkipped) {
      toast({
        title: "Email Service Not Configured",
        description: "Please share the credentials manually with the employee.",
        variant: "destructive",
      })
    } else if (result.success) {
      toast({
        title: "Welcome Email Sent",
        description: `Login credentials sent to ${newEmployeeCredentials.email}`,
      })
      setShowCredentialsDialog(false)
      setNewCredentials(null)
    }
  }

  const getEmployeePayslips = (employeeId: string) => {
    if (!Array.isArray(payrollItems)) {
      return []
    }
    return payrollItems.filter((item) => item.employeeId === employeeId)
  }

  const columns: ColumnDef<Employee>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value)
            const allIds = table.getRowModel().rows.map((row) => row.original.id)
            setSelectedEmployeeIds(value ? allIds : [])
          }}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => {
            row.toggleSelected(!!value)
            if (value) {
              setSelectedEmployeeIds((prev) => [...prev, row.original.id])
            } else {
              setSelectedEmployeeIds((prev) => prev.filter((id) => id !== row.original.id))
            }
          }}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "employeeNumber",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-mono text-sm">{row.getValue("employeeNumber")}</span>,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Employee
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const employee = row.original
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={employee.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {getInitials(`${employee.firstName} ${employee.lastName}`)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium flex items-center gap-2">
                {employee.firstName} {employee.lastName}
                <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">
                  <UserCheck className="h-3 w-3 mr-1" />
                  Account
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">{employee.email}</div>
            </div>
          </div>
        )
      },
      filterFn: (row, id, value) => {
        const employee = row.original
        const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase()
        return fullName.includes(value.toLowerCase())
      },
    },
    {
      accessorKey: "email",
      header: "Contact",
      cell: ({ row }) => {
        const employee = row.original
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate max-w-[180px]">{employee.email}</span>
            </div>
            {employee.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                <span>{employee.phone}</span>
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => {
        const employee = row.original
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{employee.department}</span>
            </div>
            <p className="text-sm text-muted-foreground">{employee.position}</p>
          </div>
        )
      },
      filterFn: (row, id, value) => {
        return value === "all" || row.getValue(id) === value
      },
    },
    {
      accessorKey: "monthlySalary",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Salary
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        return (
          <div>
            {/* CHANGE: Changed PesoSign to Banknote */}
            <p className="flex items-center gap-1 font-medium">
              <Banknote className="h-4 w-4" />
              {formatCurrency(row.getValue("monthlySalary"))}
            </p>
            <p className="text-xs text-muted-foreground">Monthly</p>
          </div>
        )
      },
    },
    {
      accessorKey: "employmentType",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("employmentType") as string
        return (
          <Badge variant="outline" className="capitalize">
            {type.replace("-", " ")}
          </Badge>
        )
      },
    },
    {
      accessorKey: "hireDate",
      header: "Hire Date",
      cell: ({ row }) => formatDate(row.getValue("hireDate")),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge className={getStatusColor(status)} variant="secondary">
            {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value === "all" || row.getValue(id) === value
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const employee = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(employee.id)
                  toast({ title: "Copied", description: "Employee ID copied to clipboard" })
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Employee ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setSelectedEmployee(employee)
                  setIsViewDialogOpen(true)
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedEmployee(employee)
                  populateFormData(employee)
                  setIsEditDialogOpen(true)
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedEmployee(employee)
                  setIsPayslipsDialogOpen(true)
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                View Payslips
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedEmployee(employee)
                  setEmailData({ subject: "", message: "" })
                  setIsEmailDialogOpen(true)
                }}
              >
                <Send className="mr-2 h-4 w-4" />
                Send Email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {employee.status === "active" && (
                <DropdownMenuItem
                  onClick={() => {
                    updateEmployeeStatus(employee.id, "on_leave") // Use updateEmployeeStatus
                    toast({
                      title: "Status Updated",
                      description: `${employee.firstName} ${employee.lastName} is now on leave.`,
                    })
                  }}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Set On Leave
                </DropdownMenuItem>
              )}
              {employee.status === "on_leave" && (
                <DropdownMenuItem
                  onClick={() => {
                    updateEmployeeStatus(employee.id, "active") // Use updateEmployeeStatus
                    toast({
                      title: "Status Updated",
                      description: `${employee.firstName} ${employee.lastName} is now active.`,
                    })
                  }}
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  Set Active
                </DropdownMenuItem>
              )}
              {employee.status === "terminated" ? (
                <DropdownMenuItem
                  onClick={() => {
                    updateEmployeeStatus(employee.id, "active") // Use updateEmployeeStatus
                    toast({
                      title: "Employee Reactivated",
                      description: `${employee.firstName} ${employee.lastName} has been reactivated.`,
                    })
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reactivate Employee
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    updateEmployeeStatus(employee.id, "terminated") // Use updateEmployeeStatus
                    toast({
                      title: "Employee Terminated",
                      description: `${employee.firstName} ${employee.lastName} has been terminated.`,
                    })
                  }}
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Terminate Employee
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  setSelectedEmployee(employee)
                  setIsDeleteDialogOpen(true)
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Permanently
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  // Filter employees
  const filteredEmployees = React.useMemo(() => {
    return employees.filter((emp) => {
      const deptMatch = filterDepartment === "all" || emp.department === filterDepartment
      const statusMatch = filterStatus === "all" || emp.status === filterStatus
      const typeMatch = filterEmploymentType === "all" || emp.employmentType === filterEmploymentType
      return deptMatch && statusMatch && typeMatch
    })
  }, [employees, filterDepartment, filterStatus, filterEmploymentType])

  // Get unique departments from data
  const uniqueDepartments = React.useMemo(() => {
    const depts = new Set(employees.map((e) => e.department).filter((d): d is string => Boolean(d) && d.trim() !== ""))
    return Array.from(depts).sort()
  }, [employees])

  if (!mounted || isLoadingEmployees) {
    return (
      <AdminLayout title="Employees" subtitle="Managing employees">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    )
  }

  // CHANGE: Removed Sync to Database button from header actions
  const headerActions = (
    <div className="flex items-center gap-2">
      {/* CHANGE: Added Download Employee Data Button */}
      <Button variant="outline" size="sm" onClick={handleDownloadEmployeeData} className="gap-2 bg-transparent">
        <Download className="h-4 w-4" />
        Export Data
      </Button>
      {/* CHANGE: Removed Sync to Database button - syncing is now automatic */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={handleExportCSV}>
            <FileText className="h-4 w-4 mr-2" />
            Export as CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Employees</DialogTitle>
            <DialogDescription>Paste CSV data with employee information to import</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Expected columns: First Name, Middle Name, Last Name, Email, Phone, Department, Position, Monthly Salary
            </div>
            <Textarea
              placeholder="Paste CSV data here..."
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportCSV}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>Enter the employee&apos;s information below.</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="employment">Employment</TabsTrigger>
              <TabsTrigger value="government">Government IDs</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="flex justify-center pb-4">
                <AvatarUploader
                  onImageSelect={(url) => setFormData({ ...formData, avatarUrl: url })}
                  currentImageUrl={formData.avatarUrl}
                  size="lg"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="Juan"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="middleName">Middle Name (Optional)</Label>
                  <Input
                    id="middleName"
                    placeholder="Santos"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Dela Cruz"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="juan.delacruz@company.com.ph"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+63 917 123 4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="employment" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                  >
                    <SelectTrigger id="department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position *</Label>
                  <Input
                    id="position"
                    placeholder="Software Engineer"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employmentType">Employment Type</Label>
                  <Select
                    value={formData.employmentType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, employmentType: value as Employee["employmentType"] })
                    }
                  >
                    <SelectTrigger id="employmentType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full Time</SelectItem>
                      <SelectItem value="part-time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="probationary">Probationary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as Employee["status"] })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hireDate">Hire Date</Label>
                  <Input
                    id="hireDate"
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employeeNumber">Employee Number</Label>
                  <Input
                    id="employeeNumber"
                    placeholder="EMP-001"
                    value={formData.employeeNumber}
                    onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {/* CHANGE: Use PESO_SIGN constant */}
                <div className="space-y-2">
                  <Label htmlFor="monthlySalary">Monthly Salary ({PESO_SIGN})</Label>
                  <Input
                    id="monthlySalary"
                    type="number"
                    placeholder="25000"
                    value={formData.monthlySalary}
                    onChange={(e) => setFormData({ ...formData, monthlySalary: e.target.value })}
                  />
                </div>
                {/* CHANGE: Use PESO_SIGN constant */}
                <div className="space-y-2">
                  <Label htmlFor="dailyRate">Daily Rate ({PESO_SIGN})</Label>
                  <Input
                    id="dailyRate"
                    type="number"
                    placeholder="Auto-calculated if empty"
                    value={formData.dailyRate}
                    onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payFrequency">Pay Frequency</Label>
                  <Select
                    value={formData.payFrequency}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        payFrequency: value as "weekly" | "bi-weekly" | "semi-monthly" | "monthly",
                      })
                    }
                  >
                    <SelectTrigger id="payFrequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                      <SelectItem value="semi-monthly">Semi-Monthly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="government" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tinNumber">TIN Number</Label>
                  <Input
                    id="tinNumber"
                    placeholder="123-456-789-000"
                    value={formData.tinNumber}
                    onChange={(e) => setFormData({ ...formData, tinNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sssNumber">SSS Number</Label>
                  <Input
                    id="sssNumber"
                    placeholder="12-3456789-0"
                    value={formData.sssNumber}
                    onChange={(e) => setFormData({ ...formData, sssNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="philHealthNumber">PhilHealth Number</Label>
                  <Input
                    id="philHealthNumber"
                    placeholder="12-123456789-0"
                    value={formData.philHealthNumber}
                    onChange={(e) => setFormData({ ...formData, philHealthNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pagIbigNumber">Pag-IBIG Number</Label>
                  <Input
                    id="pagIbigNumber"
                    placeholder="1234-5678-9012"
                    value={formData.pagIbigNumber}
                    onChange={(e) => setFormData({ ...formData, pagIbigNumber: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="contact" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Address</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Street Address"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  />
                  <Input
                    placeholder="Barangay"
                    value={formData.barangay}
                    onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                  <Input
                    placeholder="Province"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  />
                  <Input
                    placeholder="ZIP Code"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Emergency Contact</Label>
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    placeholder="Contact Name"
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  />
                  <Input
                    placeholder="Relationship"
                    value={formData.emergencyContactRelationship}
                    onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
                  />
                  <Input
                    placeholder="Contact Phone"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isCreatingAccount}>
              Cancel
            </Button>
            <Button onClick={handleAddEmployee} disabled={isCreatingAccount}>
              {isCreatingAccount ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Employee
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )

  return (
    <AdminLayout title="Employees" subtitle={`Managing ${employees.length} employees`}>
      <div className="space-y-6">
        {/* Bulk Actions Bar */}
        {selectedEmployeeIds.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg border">
            <p className="text-sm font-medium">{selectedEmployeeIds.length} employee(s) selected</p>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Change Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleBulkStatusChange("active")}>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                    Set Active
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatusChange("inactive")}>
                    <XCircle className="mr-2 h-4 w-4 text-gray-500" />
                    Set Inactive
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatusChange("on_leave")}>
                    <Clock className="mr-2 h-4 w-4 text-purple-500" />
                    Set On Leave
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatusChange("terminated")}>
                    <AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />
                    Terminate
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedEmployeeIds([])}>
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {uniqueDepartments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterEmploymentType} onValueChange={setFilterEmploymentType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="full-time">Full-time</SelectItem>
                <SelectItem value="part-time">Part-time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="probationary">Probationary</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {headerActions}
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filteredEmployees}
          searchKey="name"
          searchPlaceholder="Search employees..."
        />
      </div>

      {/* View Profile Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          {selectedEmployee && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    {selectedEmployee.avatarUrl && (
                      <AvatarImage
                        src={selectedEmployee.avatarUrl || "/placeholder.svg"}
                        alt={selectedEmployee.firstName}
                      />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
                      {getInitials(selectedEmployee.firstName, selectedEmployee.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-xl">
                      {selectedEmployee.firstName} {selectedEmployee.middleName?.charAt(0)}. {selectedEmployee.lastName}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-2">
                      {selectedEmployee.position} • {selectedEmployee.department}
                      <Badge className={getStatusColor(selectedEmployee.status)} variant="secondary">
                        {selectedEmployee.status.charAt(0).toUpperCase() +
                          selectedEmployee.status.slice(1).replace("_", " ")}
                      </Badge>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <Tabs defaultValue="overview" className="w-full mt-4">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="employment">Employment</TabsTrigger>
                  <TabsTrigger value="government">IDs</TabsTrigger>
                  <TabsTrigger value="contact">Contact</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Card className="p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <User className="h-4 w-4" />
                        <span>Employee Number</span>
                      </div>
                      <p className="text-xl font-semibold">{selectedEmployee.employeeNumber}</p>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        {/* CHANGE: Changed PesoSign to Banknote */}
                        <Banknote className="h-4 w-4" />
                        <span>Monthly Salary</span>
                      </div>
                      <p className="text-xl font-semibold">{formatCurrency(selectedEmployee.monthlySalary)}</p>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Calendar className="h-4 w-4" />
                        <span>Hire Date</span>
                      </div>
                      <p className="text-xl font-semibold">{formatDate(selectedEmployee.hireDate)}</p>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Briefcase className="h-4 w-4" />
                        <span>Employment Type</span>
                      </div>
                      <p className="text-xl font-semibold capitalize">
                        {selectedEmployee.employmentType.replace("-", " ")}
                      </p>
                    </Card>
                  </div>
                  <Card className="p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Mail className="h-4 w-4" />
                      <span>Contact Information</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedEmployee.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedEmployee.phone}</span>
                      </div>
                    </div>
                  </Card>
                </TabsContent>
                <TabsContent value="employment" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Department & Position</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Department</span>
                        <span className="font-medium">{selectedEmployee.department}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Position</span>
                        <span className="font-medium">{selectedEmployee.position}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Employment Type</span>
                        <span className="font-medium capitalize">
                          {selectedEmployee.employmentType.replace("-", " ")}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pay Frequency</span>
                        <span className="font-medium capitalize">{selectedEmployee.payFrequency}</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Compensation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly Salary</span>
                        <span className="font-medium">{formatCurrency(selectedEmployee.monthlySalary)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Daily Rate</span>
                        <span className="font-medium">{formatCurrency(selectedEmployee.dailyRate || 0)}</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Bank Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bank</span>
                        <span className="font-medium">{selectedEmployee.bankName || "Not set"}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Number</span>
                        <span className="font-medium">{selectedEmployee.bankAccountNumber || "Not set"}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Name</span>
                        <span className="font-medium">{selectedEmployee.bankAccountName || "Not set"}</span>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="government" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Government IDs</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">TIN Number</span>
                        <span className="font-medium font-mono">{selectedEmployee.tinNumber || "Not set"}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SSS Number</span>
                        <span className="font-medium font-mono">{selectedEmployee.sssNumber || "Not set"}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">PhilHealth Number</span>
                        <span className="font-medium font-mono">{selectedEmployee.philHealthNumber || "Not set"}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pag-IBIG Number</span>
                        <span className="font-medium font-mono">{selectedEmployee.pagIbigNumber || "Not set"}</span>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="contact" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Address
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedEmployee.address ? (
                        <div className="space-y-1">
                          <p>{selectedEmployee.address.street}</p>
                          {selectedEmployee.address.barangay && <p>{selectedEmployee.address.barangay}</p>}
                          <p>
                            {selectedEmployee.address.city}, {selectedEmployee.address.province}{" "}
                            {selectedEmployee.address.zipCode}
                          </p>
                          <p>{selectedEmployee.address.country}</p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No address on file</p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Phone className="h-4 w-4" /> Emergency Contact
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedEmployee.emergencyContact ? (
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Name</span>
                            <span className="font-medium">{selectedEmployee.emergencyContact.name}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Relationship</span>
                            <span className="font-medium">{selectedEmployee.emergencyContact.relationship}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Phone</span>
                            <span className="font-medium">{selectedEmployee.emergencyContact.phone}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No emergency contact on file</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                {/* CHANGE: Added Security TabsContent with Change Password form */}
                <TabsContent value="security" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lock className="h-4 w-4" /> Change Password
                      </CardTitle>
                      <CardDescription>
                        Reset the employee&apos;s password. They will need to use this new password to log in.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          placeholder="Enter new password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Confirm new password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        />
                      </div>
                      {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                      <Button
                        onClick={handleChangePassword}
                        disabled={isChangingPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                        className="w-full"
                      >
                        {isChangingPassword ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Changing Password...
                          </>
                        ) : (
                          <>
                            <Lock className="mr-2 h-4 w-4" />
                            Change Password
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsViewDialogOpen(false)
                    populateFormData(selectedEmployee)
                    setIsEditDialogOpen(true)
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update the employee&apos;s information below.</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="photo">Photo</TabsTrigger>
              <TabsTrigger value="employment">Employment</TabsTrigger>
              <TabsTrigger value="government">Government IDs</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editFirstName">First Name *</Label>
                  <Input
                    id="editFirstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editMiddleName">Middle Name (Optional)</Label>
                  <Input
                    id="editMiddleName"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editLastName">Last Name *</Label>
                  <Input
                    id="editLastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editEmail">Email *</Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPhone">Phone</Label>
                  <Input
                    id="editPhone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editStatus">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as Employee["status"] })}
                >
                  <SelectTrigger id="editStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            <TabsContent value="photo" className="space-y-4 mt-4">
              <div className="flex flex-col items-center justify-center py-6">
                <Label className="mb-4 text-center">Profile Photo</Label>
                <AvatarUploader
                  currentImage={formData.avatarUrl}
                  fallback={getInitials(formData.firstName, formData.lastName)}
                  onImageSelect={(file, previewUrl) => {
                    setFormData({ ...formData, avatarUrl: previewUrl })
                  }}
                  onImageRemove={() => {
                    setFormData({ ...formData, avatarUrl: null })
                  }}
                  size="lg"
                />
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Upload a profile photo for this employee.
                  <br />
                  Recommended size: 200x200 pixels. Max file size: 5MB.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="employment" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editDepartment">Department *</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                  >
                    <SelectTrigger id="editDepartment">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPosition">Position *</Label>
                  <Input
                    id="editPosition"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editSalary">Monthly Salary (PHP)</Label>
                  <Input
                    id="editSalary"
                    type="number"
                    value={formData.monthlySalary}
                    onChange={(e) => setFormData({ ...formData, monthlySalary: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editHireDate">Hire Date</Label>
                  <Input
                    id="editHireDate"
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editEmploymentType">Employment Type</Label>
                  <Select
                    value={formData.employmentType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, employmentType: value as Employee["employmentType"] })
                    }
                  >
                    <SelectTrigger id="editEmploymentType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="probationary">Probationary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editBankName">Bank</Label>
                  <Select
                    value={formData.bankName}
                    onValueChange={(value) => setFormData({ ...formData, bankName: value })}
                  >
                    <SelectTrigger id="editBankName">
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BDO Unibank">BDO Unibank</SelectItem>
                      <SelectItem value="BPI">BPI</SelectItem>
                      <SelectItem value="Metrobank">Metrobank</SelectItem>
                      <SelectItem value="Landbank">Landbank</SelectItem>
                      <SelectItem value="PNB">PNB</SelectItem>
                      <SelectItem value="Security Bank">Security Bank</SelectItem>
                      <SelectItem value="UnionBank">UnionBank</SelectItem>
                      <SelectItem value="GCash">GCash</SelectItem>
                      <SelectItem value="Maya">Maya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editBankAccountNumber">Account Number</Label>
                  <Input
                    id="editBankAccountNumber"
                    value={formData.bankAccountNumber}
                    onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editBankAccountName">Account Name</Label>
                  <Input
                    id="editBankAccountName"
                    value={formData.bankAccountName}
                    onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="government" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editTinNumber">TIN Number</Label>
                  <Input
                    id="editTinNumber"
                    value={formData.tinNumber}
                    onChange={(e) => setFormData({ ...formData, tinNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editSssNumber">SSS Number</Label>
                  <Input
                    id="editSssNumber"
                    value={formData.sssNumber}
                    onChange={(e) => setFormData({ ...formData, sssNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editPhilHealthNumber">PhilHealth Number</Label>
                  <Input
                    id="editPhilHealthNumber"
                    value={formData.philHealthNumber}
                    onChange={(e) => setFormData({ ...formData, philHealthNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPagIbigNumber">Pag-IBIG Number</Label>
                  <Input
                    id="editPagIbigNumber"
                    value={formData.pagIbigNumber}
                    onChange={(e) => setFormData({ ...formData, pagIbigNumber: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="contact" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Address</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Street Address"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  />
                  <Input
                    placeholder="Barangay"
                    value={formData.barangay}
                    onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                  <Input
                    placeholder="Province"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  />
                  <Input
                    placeholder="ZIP Code"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Emergency Contact</Label>
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    placeholder="Contact Name"
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  />
                  <Input
                    placeholder="Relationship"
                    value={formData.emergencyContactRelationship}
                    onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
                  />
                  <Input
                    placeholder="Contact Phone"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="security" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-medium">Password Management</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Change the password for this employee&apos;s account. They will need to use the new password on
                    their next login.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNewPassword("")
                      setConfirmPassword("")
                      setIsPasswordDialogOpen(true)
                    }}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                </div>
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-medium">Account Status</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Email: <span className="font-medium">{selectedEmployee?.email}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Account linked: <span className="font-medium">{selectedEmployee?.userId ? "Yes" : "No"}</span>
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditEmployee}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payslips Dialog */}
      <Dialog open={isPayslipsDialogOpen} onOpenChange={setIsPayslipsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              Payslips - {selectedEmployee?.firstName} {selectedEmployee?.lastName}
            </DialogTitle>
            <DialogDescription>View payroll history for this employee</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            {selectedEmployee && getEmployeePayslips(selectedEmployee.id).length > 0 ? (
              <div className="space-y-3">
                {getEmployeePayslips(selectedEmployee.id).map((payslip) => (
                  <Card key={payslip.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Pay Period: {payslip.payrollRunId}</p>
                          <p className="text-sm text-muted-foreground">{formatDate(payslip.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">{formatCurrency(payslip.netPay)}</p>
                          <Badge className={getStatusColor(payslip.status)} variant="secondary">
                            {payslip.status}
                          </Badge>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Gross Pay</span>
                          <span>{formatCurrency(payslip.grossPay)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Basic Pay</span>
                          <span>{formatCurrency(payslip.basicPay)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">SSS</span>
                          <span className="text-destructive">-{formatCurrency(payslip.sssContribution)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">PhilHealth</span>
                          <span className="text-destructive">-{formatCurrency(payslip.philHealthContribution)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pag-IBIG</span>
                          <span className="text-destructive">-{formatCurrency(payslip.pagIbigContribution)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tax</span>
                          <span className="text-destructive">-{formatCurrency(payslip.withholdingTax)}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-transparent"
                          onClick={() => handleDownloadPayslipPDF(payslip)}
                          disabled={downloadingPayslipId === payslip.id}
                        >
                          {downloadingPayslipId === payslip.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="mr-2 h-4 w-4" />
                          )}
                          Download PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-transparent"
                          onClick={() => handleSendPayslipEmail(payslip)}
                          disabled={sendingEmailPayslipId === payslip.id}
                        >
                          {sendingEmailPayslipId === payslip.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          Send Email
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No payslips found for this employee</p>
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setIsPayslipsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
            <DialogDescription>
              Send email to {selectedEmployee?.firstName} {selectedEmployee?.lastName} ({selectedEmployee?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailSubject">Subject *</Label>
              <Input
                id="emailSubject"
                placeholder="Email subject"
                value={emailData.subject}
                onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                disabled={isSendingEmail}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailMessage">Message *</Label>
              <Textarea
                id="emailMessage"
                placeholder="Enter your message..."
                rows={6}
                value={emailData.message}
                onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                disabled={isSendingEmail}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)} disabled={isSendingEmail}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={isSendingEmail}>
              {isSendingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Import Employees</DialogTitle>
            <DialogDescription>
              Paste CSV data to import employees. Required columns: First Name, Last Name, Email, Department, Position
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="importData">CSV Data</Label>
              <Textarea
                id="importData"
                placeholder={`First Name,Middle Name,Last Name,Suffix,Email,Phone,Department,Position,Monthly Salary,Daily Rate,Pay Frequency,Employment Type,Status,Hire Date,Bank Name,Bank Account Number,Bank Account Name,TIN,SSS,PhilHealth,Pag-IBIG,Street,Barangay,City,Province,State,ZIP Code,Country,Emergency Contact Name,Emergency Contact Relationship,Emergency Contact Phone\nJuan,Santos,Dela Cruz,,juan@company.com,+63 917 123 4567,Engineering,Software Engineer,35000,2000,semi-monthly,full-time,active,2023-01-01,BDO Unibank,1234567890,Juan S Dela Cruz,123-456-789-000,12-3456789-0,12-123456789-0,1234-5678-9012,123 Main St,Barangay San Jose,Quezon City,Metro Manila,,1101,Philippines,Maria Santos,Mother,+63 998 765 4321`}
                rows={10}
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">CSV Format:</p>
              <p className="text-muted-foreground">
                First Name, Middle Name, Last Name, Suffix, Email, Phone, Department, Position, Monthly Salary, Daily
                Rate, Pay Frequency, Employment Type, Status, Hire Date, Bank Name, Bank Account Number, Bank Account
                Name, TIN, SSS, PhilHealth, Pag-IBIG, Street, Barangay, City, Province, State, ZIP Code, Country,
                Emergency Contact Name, Emergency Contact Relationship, Emergency Contact Phone
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportCSV}>
              <Upload className="h-4 w-4 mr-2" />
              Import Employees
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {selectedEmployee?.firstName} {selectedEmployee?.lastName}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEmployee}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedEmployeeIds.length} Employees</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {selectedEmployeeIds.length} employees? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CHANGE: Renamed dialog and state to showCredentialsDialog and newEmployeeCredentials */}
      <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Employee Account Created
            </DialogTitle>
            <DialogDescription>
              Share these login credentials with the new employee. They can change their password after first login.
            </DialogDescription>
          </DialogHeader>
          {newEmployeeCredentials && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{newEmployeeCredentials.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Temporary Password</p>
                    <p className="font-mono font-medium">{newEmployeeCredentials.tempPassword}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Save these credentials now. The password cannot be retrieved later.
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="gap-2 bg-transparent" onClick={copyCredentials}>
              <Copy className="h-4 w-4" />
              Copy Credentials
            </Button>
            <Button className="gap-2" onClick={handleSendWelcomeEmail} disabled={isSendingWelcomeEmail}>
              {isSendingWelcomeEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Send Welcome Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedEmployee?.firstName} {selectedEmployee?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-destructive">Passwords do not match</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleChangePasswordUpdate}
              disabled={isChangingPassword || !newPassword || newPassword !== confirmPassword}
            >
              {isChangingPassword ? "Changing..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
