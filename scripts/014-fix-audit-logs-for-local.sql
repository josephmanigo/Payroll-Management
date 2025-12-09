-- ==========================================
-- FIX AUDIT LOGS FOR LOCAL DEVELOPMENT
-- Fixes: entity_id type, user_role nullable, RLS recursion
-- ==========================================

-- Step 1: Drop existing RLS policies that cause recursion
DROP POLICY IF EXISTS "HR and Admin can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Employees can view own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Anyone can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON audit_logs;

-- Step 2: Alter entity_id column from UUID to TEXT (accepts any ID format)
ALTER TABLE audit_logs ALTER COLUMN entity_id TYPE TEXT USING entity_id::TEXT;

-- Step 3: Make user_role nullable (in case it's not provided)
ALTER TABLE audit_logs ALTER COLUMN user_role DROP NOT NULL;

-- Step 4: Remove the CHECK constraint on user_role to allow any value
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_role_check;

-- Step 5: Create simple RLS policies that DON'T reference profiles table
-- This prevents infinite recursion

-- Allow all authenticated users to view audit logs
CREATE POLICY "Authenticated users can view audit logs" ON audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to insert audit logs
CREATE POLICY "Authenticated users can insert audit logs" ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Also allow anon to insert (for pre-auth actions like login attempts)
CREATE POLICY "Anon can insert audit logs" ON audit_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Step 6: Fix profiles table RLS policies to prevent recursion
DROP POLICY IF EXISTS "HR and Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "HR and Admin can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can insert profiles" ON profiles;

-- Simple non-recursive policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Anyone can insert profiles" ON profiles
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Step 7: Fix employees table policies
DROP POLICY IF EXISTS "Employees can view own record" ON employees;
DROP POLICY IF EXISTS "HR and Admin can insert employees" ON employees;
DROP POLICY IF EXISTS "HR and Admin can update employees" ON employees;
DROP POLICY IF EXISTS "HR and Admin can delete employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can view employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can insert employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can update employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can delete employees" ON employees;

-- Simple policies for employees (no profiles lookup)
CREATE POLICY "Authenticated users can view employees" ON employees
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert employees" ON employees
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update employees" ON employees
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete employees" ON employees
  FOR DELETE TO authenticated USING (true);

-- Step 8: Fix other tables that might have recursive policies
-- Leave Requests
DROP POLICY IF EXISTS "Admins and HR can view all leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Employees can view own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Employees can insert own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins and HR can update leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Authenticated users can view leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Authenticated users can insert leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Authenticated users can update leave requests" ON leave_requests;

CREATE POLICY "Authenticated users can view leave requests" ON leave_requests
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert leave requests" ON leave_requests
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update leave requests" ON leave_requests
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Bonus Requests
DROP POLICY IF EXISTS "Admins and HR can view all bonus requests" ON bonus_requests;
DROP POLICY IF EXISTS "Employees can view own bonus requests" ON bonus_requests;
DROP POLICY IF EXISTS "Admins and HR can insert bonus requests" ON bonus_requests;
DROP POLICY IF EXISTS "Admins and HR can update bonus requests" ON bonus_requests;
DROP POLICY IF EXISTS "Authenticated users can view bonus requests" ON bonus_requests;
DROP POLICY IF EXISTS "Authenticated users can insert bonus requests" ON bonus_requests;
DROP POLICY IF EXISTS "Authenticated users can update bonus requests" ON bonus_requests;

CREATE POLICY "Authenticated users can view bonus requests" ON bonus_requests
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert bonus requests" ON bonus_requests
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update bonus requests" ON bonus_requests
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Attendance Records
DROP POLICY IF EXISTS "Admins and HR can view all attendance" ON attendance_records;
DROP POLICY IF EXISTS "Employees can view own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Employees can insert own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Employees can update own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Authenticated users can view attendance" ON attendance_records;
DROP POLICY IF EXISTS "Authenticated users can insert attendance" ON attendance_records;
DROP POLICY IF EXISTS "Authenticated users can update attendance" ON attendance_records;

CREATE POLICY "Authenticated users can view attendance" ON attendance_records
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert attendance" ON attendance_records
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update attendance" ON attendance_records
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Anyone can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can view notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can update notifications" ON notifications;

CREATE POLICY "Authenticated users can view notifications" ON notifications
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert notifications" ON notifications
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update notifications" ON notifications
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Payslips
DROP POLICY IF EXISTS "Employees can view own payslips" ON payslips;
DROP POLICY IF EXISTS "HR and Admin can manage payslips" ON payslips;
DROP POLICY IF EXISTS "HR and Admin can insert payslips" ON payslips;
DROP POLICY IF EXISTS "HR and Admin can update payslips" ON payslips;
DROP POLICY IF EXISTS "HR and Admin can delete payslips" ON payslips;
DROP POLICY IF EXISTS "Authenticated users can view payslips" ON payslips;
DROP POLICY IF EXISTS "Authenticated users can insert payslips" ON payslips;
DROP POLICY IF EXISTS "Authenticated users can update payslips" ON payslips;
DROP POLICY IF EXISTS "Authenticated users can delete payslips" ON payslips;

CREATE POLICY "Authenticated users can view payslips" ON payslips
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert payslips" ON payslips
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update payslips" ON payslips
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete payslips" ON payslips
  FOR DELETE TO authenticated USING (true);
