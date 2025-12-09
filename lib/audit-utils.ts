import { PESO_SIGN } from "./utils"

/**
 * Helper function to format action descriptions
 * This is a pure utility function, not a server action
 */
export function formatAuditAction(action: string, entityType: string, metadata?: Record<string, unknown>): string {
  const entityName = metadata?.entityName || metadata?.name || ""

  switch (action) {
    // Auth
    case "login":
      return "Logged in to the system"
    case "logout":
      return "Logged out of the system"
    case "password_reset":
      return "Requested password reset"
    case "password_change":
      return `Changed password${metadata?.changedBy === "admin" ? " (by admin)" : ""}`

    // Employee
    case "employee_created":
      return `Created employee${entityName ? `: ${entityName}` : ""}${metadata?.employeeName ? `: ${metadata.employeeName}` : ""}`
    case "employee_updated":
      return `Updated employee${entityName ? `: ${entityName}` : ""}${metadata?.employeeName ? `: ${metadata.employeeName}` : ""}${metadata?.updatedFields ? ` (${(metadata.updatedFields as string[]).join(", ")})` : ""}`
    case "employee_deleted":
      return `Deleted employee${entityName ? `: ${entityName}` : ""}${metadata?.employeeName ? `: ${metadata.employeeName}` : ""}${metadata?.deletedEmployee ? `: ${(metadata.deletedEmployee as { name: string }).name}` : ""}`
    case "employee_status_changed":
      return `Changed employee status${entityName ? ` for ${entityName}` : ""}${metadata?.employeeName ? ` for ${metadata.employeeName}` : ""}${metadata?.newStatus ? ` to ${metadata.newStatus}` : ""}`
    case "employees_list_viewed":
      return `Viewed employee list${metadata?.employeeCount ? ` (${metadata.employeeCount} employees)` : ""}`
    case "employee_profile_viewed":
      return `Viewed employee profile${entityName ? `: ${entityName}` : ""}${metadata?.employeeName ? `: ${metadata.employeeName}` : ""}`
    case "employee_synced":
      return `Synced employee${metadata?.employeeName ? `: ${metadata.employeeName}` : ""}${metadata?.email ? ` (${metadata.email})` : ""}${metadata?.operation ? ` [${metadata.operation}]` : ""}`
    case "employees_bulk_synced":
      return `Bulk synced employee accounts${metadata?.synced ? ` (${metadata.synced} synced` : ""}${metadata?.failed ? `, ${metadata.failed} failed)` : ")"}`
    case "employee_account_checked":
      return `Checked employee account status${metadata?.email ? ` for ${metadata.email}` : ""}${metadata?.isLinked ? " (linked)" : " (not linked)"}`
    case "welcome_email_sent":
      return `Sent welcome email${metadata?.employeeName ? ` to ${metadata.employeeName}` : ""}${metadata?.employeeEmail ? ` (${metadata.employeeEmail})` : ""}`

    // Leave
    case "leave_requested":
      return `Submitted leave request${metadata?.leaveType ? ` (${metadata.leaveType})` : ""}${metadata?.totalDays ? ` for ${metadata.totalDays} day(s)` : ""}`
    case "leave_approved":
      return `Approved leave request${entityName ? ` for ${entityName}` : ""}${metadata?.employeeName ? ` for ${metadata.employeeName}` : ""}`
    case "leave_rejected":
      return `Rejected leave request${entityName ? ` for ${entityName}` : ""}${metadata?.employeeName ? ` for ${metadata.employeeName}` : ""}`
    case "leave_cancelled":
      return `Cancelled leave request${metadata?.leaveType ? ` (${metadata.leaveType})` : ""}`
    case "leave_requests_viewed":
      return `Viewed leave requests${metadata?.requestCount ? ` (${metadata.requestCount} requests)` : ""}${metadata?.count ? ` (${metadata.count} requests)` : ""}`
    case "leave_deleted":
      return `Deleted leave request${entityName ? ` for ${entityName}` : ""}${metadata?.employeeName ? ` for ${metadata.employeeName}` : ""}`

    // Bonus - Using PESO_SIGN constant instead of direct ₱ character
    case "bonus_requested":
      return `Submitted bonus request${metadata?.amount ? ` for ${PESO_SIGN}${Number(metadata.amount).toLocaleString()}` : ""}`
    case "bonus_approved":
      return `Approved bonus request${entityName ? ` for ${entityName}` : ""}${metadata?.amount ? ` (${PESO_SIGN}${Number(metadata.amount).toLocaleString()})` : ""}`
    case "bonus_rejected":
      return `Rejected bonus request${entityName ? ` for ${entityName}` : ""}${metadata?.amount ? ` (${PESO_SIGN}${Number(metadata.amount).toLocaleString()})` : ""}`
    case "bonus_cancelled":
      return `Cancelled bonus request${entityName ? ` for ${entityName}` : ""}${metadata?.amount ? ` (${PESO_SIGN}${Number(metadata.amount).toLocaleString()})` : ""}${metadata?.reason ? ` - ${metadata.reason}` : ""}`
    case "bonus_requests_viewed":
      return `Viewed bonus requests${metadata?.requestCount ? ` (${metadata.requestCount} requests)` : ""}${metadata?.count ? ` (${metadata.count} requests)` : ""}`
    case "bonus_deleted":
      return `Deleted bonus request${entityName ? ` for ${entityName}` : ""}${metadata?.amount ? ` (${PESO_SIGN}${Number(metadata.amount).toLocaleString()})` : ""}`

    // Attendance
    case "time_in":
      return `Timed in${entityName ? ` - ${entityName}` : ""}${metadata?.employeeName ? ` - ${metadata.employeeName}` : ""}${metadata?.lateMinutes && Number(metadata.lateMinutes) > 0 ? ` (${metadata.lateMinutes} mins late)` : ""}`
    case "time_out":
      return `Timed out${entityName ? ` - ${entityName}` : ""}${metadata?.employeeName ? ` - ${metadata.employeeName}` : ""}${metadata?.totalHours ? ` (${Number(metadata.totalHours).toFixed(2)} hrs)` : ""}`
    case "attendance_viewed":
      return `Viewed attendance records${metadata?.date ? ` for ${metadata.date}` : ""}${metadata?.recordCount ? ` (${metadata.recordCount} records)` : ""}`
    case "attendance_updated":
      return `Updated attendance record${entityName ? ` for ${entityName}` : ""}${metadata?.employeeName ? ` for ${metadata.employeeName}` : ""}`
    case "attendance_deleted":
      return `Deleted attendance record${entityName ? ` for ${entityName}` : ""}${metadata?.employeeName ? ` for ${metadata.employeeName}` : ""}`

    // Payroll - Using PESO_SIGN constant
    case "payroll_created":
      return `Created payroll run${metadata?.payPeriod ? ` for ${metadata.payPeriod}` : ""}${metadata?.payPeriodStart ? ` for ${metadata.payPeriodStart} - ${metadata.payPeriodEnd}` : ""}${metadata?.employeeCount ? ` (${metadata.employeeCount} employees)` : ""}`
    case "payroll_processed":
      return `Processed payroll${metadata?.payPeriod ? ` for ${metadata.payPeriod}` : ""}${metadata?.payPeriodStart ? ` for ${metadata.payPeriodStart} - ${metadata.payPeriodEnd}` : ""}${metadata?.totalNet ? ` (${PESO_SIGN}${Number(metadata.totalNet).toLocaleString()} total)` : ""}`
    case "payroll_approved":
      return `Approved payroll${metadata?.payPeriod ? ` for ${metadata.payPeriod}` : ""}`
    case "payroll_finalized":
      return `Finalized payroll${metadata?.payPeriod ? ` for ${metadata.payPeriod}` : ""}`
    case "payroll_cancelled":
      return `Cancelled payroll${metadata?.payPeriod ? ` for ${metadata.payPeriod}` : ""}`
    case "payroll_deleted":
      return `Deleted payroll record${metadata?.payPeriodStart ? ` for ${metadata.payPeriodStart} - ${metadata.payPeriodEnd}` : ""}`
    case "payslips_bulk_deleted":
      return `Bulk deleted payslips${metadata?.deletedCount ? ` (${metadata.deletedCount} records)` : ""}${metadata?.payPeriod ? ` for ${metadata.payPeriod}` : ""}`
    case "payslips_all_deleted":
      return `Deleted all payslips${metadata?.deletedCount ? ` (${metadata.deletedCount} records)` : ""}`
    case "payslips_viewed":
      return `Viewed payslips${metadata?.payslipCount ? ` (${metadata.payslipCount} records)` : ""}${metadata?.count ? ` (${metadata.count} records)` : ""}`

    // Payslip - Using PESO_SIGN constant
    case "payslip_generated":
      return `Generated payslip${entityName ? ` for ${entityName}` : ""}${metadata?.netPay ? ` (${PESO_SIGN}${Number(metadata.netPay).toLocaleString()})` : ""}`
    case "payslip_emailed":
      return `Emailed payslip${entityName ? ` to ${entityName}` : ""}${metadata?.employeeName ? ` to ${metadata.employeeName}` : ""}${metadata?.employeeEmail ? ` (${metadata.employeeEmail})` : ""}`
    case "payslip_self_emailed":
      return `Emailed payslip to self${metadata?.payPeriod ? ` for ${metadata.payPeriod}` : ""}`
    case "payslip_downloaded":
      return `Downloaded payslip${metadata?.payPeriod ? ` for ${metadata.payPeriod}` : ""}`
    case "payslip_viewed":
      return `Viewed payslip${metadata?.payPeriod ? ` for ${metadata.payPeriod}` : ""}`
    case "payslip_sent":
      return `Sent payslip${metadata?.employeeName ? ` to ${metadata.employeeName}` : ""}${metadata?.employeeEmail ? ` (${metadata.employeeEmail})` : ""}${metadata?.payPeriod ? ` for ${metadata.payPeriod}` : ""}`
    case "payslip_updated":
      return `Updated payslip${metadata?.updatedFields ? ` (${(metadata.updatedFields as string[]).join(", ")})` : ""}`
    case "payslip_deleted":
      return `Deleted payslip${metadata?.employeeName ? ` for ${metadata.employeeName}` : ""}${metadata?.payPeriod ? ` (${metadata.payPeriod})` : ""}`
    case "payslip_synced":
      return `Synced payslip${metadata?.employeeName ? ` for ${metadata.employeeName}` : ""}${metadata?.payPeriod ? ` (${metadata.payPeriod})` : ""}${metadata?.operation ? ` [${metadata.operation}]` : ""}`

    // Profile
    case "profile_updated":
      return `Updated profile${metadata?.updatedFields ? ` (${(metadata.updatedFields as string[]).join(", ")})` : ""}`
    case "avatar_uploaded":
      return `Uploaded profile avatar${metadata?.fileName ? ` (${metadata.fileName})` : ""}`
    case "avatar_updated":
      return `Updated profile avatar${metadata?.fileName ? ` (${metadata.fileName})` : ""}`
    case "avatar_removed":
      return "Removed profile avatar"

    // Admin accounts
    case "admin_created":
      return `Created admin account${metadata?.createdUserName ? `: ${metadata.createdUserName}` : ""}${metadata?.createdUserEmail ? ` (${metadata.createdUserEmail})` : ""}`
    case "admin_deleted":
      return `Deleted admin account${metadata?.deletedUserName ? `: ${metadata.deletedUserName}` : ""}${metadata?.deletedUserEmail ? ` (${metadata.deletedUserEmail})` : ""}`
    case "account_created":
      return `Created user account${metadata?.createdUserName ? `: ${metadata.createdUserName}` : ""}${metadata?.createdUserRole ? ` (${metadata.createdUserRole})` : ""}`
    case "account_deleted":
      return `Deleted user account${metadata?.deletedUserName ? `: ${metadata.deletedUserName}` : ""}${metadata?.deletedUserEmail ? ` (${metadata.deletedUserEmail})` : ""}`

    // Department
    case "department_created":
      return `Created department${metadata?.departmentName ? `: ${metadata.departmentName}` : ""}`
    case "department_updated":
      return `Updated department${metadata?.departmentName ? `: ${metadata.departmentName}` : ""}${metadata?.previousName ? ` (was: ${metadata.previousName})` : ""}`
    case "department_deleted":
      return `Deleted department${metadata?.departmentName ? `: ${metadata.departmentName}` : ""}`

    // Salary adjustments - Using PESO_SIGN constant
    case "salary_adjustment_created":
      return `Created salary adjustment${entityName ? ` for ${entityName}` : ""}${metadata?.employeeName ? ` for ${metadata.employeeName}` : ""}${metadata?.amount ? ` (${PESO_SIGN}${Number(metadata.amount).toLocaleString()})` : ""}`
    case "salary_adjustment_updated":
      return `Updated salary adjustment${entityName ? ` for ${entityName}` : ""}${metadata?.employeeName ? ` for ${metadata.employeeName}` : ""}${metadata?.amount ? ` (${PESO_SIGN}${Number(metadata.amount).toLocaleString()})` : ""}`
    case "salary_adjustment_approved":
      return `Approved salary adjustment${entityName ? ` for ${entityName}` : ""}${metadata?.employeeName ? ` for ${metadata.employeeName}` : ""}${metadata?.amount ? ` (${PESO_SIGN}${Number(metadata.amount).toLocaleString()})` : ""}`
    case "salary_adjustment_rejected":
      return `Rejected salary adjustment${entityName ? ` for ${entityName}` : ""}${metadata?.employeeName ? ` for ${metadata.employeeName}` : ""}`

    // Data export
    case "data_exported":
      return `Exported ${entityType} data${metadata?.format ? ` as ${metadata.format}` : ""}${metadata?.recordCount ? ` (${metadata.recordCount} records)` : ""}`
    case "report_generated":
      return `Generated ${entityType} report${metadata?.reportType ? ` - ${metadata.reportType}` : ""}`

    // System actions
    case "contact_form_submitted":
      return `Submitted contact form${metadata?.subject ? `: ${metadata.subject}` : ""}${metadata?.senderName ? ` (from ${metadata.senderName})` : ""}`
    case "contact_form_failed":
      return `Failed to submit contact form${metadata?.error ? `: ${metadata.error}` : ""}${metadata?.senderEmail ? ` (from ${metadata.senderEmail})` : ""}`
    case "audit_logs_viewed":
      return `Viewed audit logs${metadata?.resultsCount ? ` (${metadata.resultsCount} records)` : ""}${metadata?.count ? ` (${metadata.count} records)` : ""}`
    case "audit_log_deleted":
      return `Deleted audit log entry${metadata?.deletedAction ? ` (${metadata.deletedAction})` : ""}${metadata?.deletedLog ? ` (${(metadata.deletedLog as { action: string }).action})` : ""}`
    case "bulk_sync_completed":
      return `Completed bulk sync${metadata?.synced ? ` (${metadata.synced} synced, ${metadata?.failed || 0} failed)` : ""}`
    case "data_synced":
      return `Synced data${metadata?.entityType ? ` (${metadata.entityType})` : ""}${metadata?.count ? ` - ${metadata.count} records` : ""}`

    // Generic
    case "created":
      return `Created ${entityType}${entityName ? `: ${entityName}` : ""}`
    case "updated":
      return `Updated ${entityType}${entityName ? `: ${entityName}` : ""}`
    case "deleted":
      return `Deleted ${entityType}${entityName ? `: ${entityName}` : ""}`
    case "viewed":
      return `Viewed ${entityType}${entityName ? `: ${entityName}` : ""}`
    case "exported":
      return `Exported ${entityType} data`

    default:
      return action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }
}
