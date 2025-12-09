-- Fix RLS policies for employees table to allow viewing by email
-- This allows employees to see their record even if user_id hasn't been linked yet

-- Drop existing SELECT policy for employees
DROP POLICY IF EXISTS "Employees can view own record" ON employees;

-- Create new SELECT policy that checks both user_id AND email
CREATE POLICY "Employees can view own record" ON employees
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR email = auth.email()
  );

-- Drop existing UPDATE policy for linking user_id  
DROP POLICY IF EXISTS "Employees can link own user_id" ON employees;

-- Create new UPDATE policy that allows employees to update their own record by email match
-- This allows them to link their user_id when they first log in
CREATE POLICY "Employees can link own user_id" ON employees
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR email = auth.email()
  )
  WITH CHECK (
    user_id = auth.uid() 
    OR email = auth.email()
  );

-- Also fix attendance_records policies to support email-based lookup
DROP POLICY IF EXISTS "Employees can view own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Employees can insert own attendance" ON attendance_records;
DROP POLICY IF EXISTS "Employees can update own attendance" ON attendance_records;

-- Allow employees to view their attendance by matching employee_id through email
CREATE POLICY "Employees can view own attendance" ON attendance_records
  FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees 
      WHERE user_id = auth.uid() OR email = auth.email()
    )
  );

-- Allow employees to insert their own attendance
CREATE POLICY "Employees can insert own attendance" ON attendance_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees 
      WHERE user_id = auth.uid() OR email = auth.email()
    )
  );

-- Allow employees to update their own attendance (for time-out)
CREATE POLICY "Employees can update own attendance" ON attendance_records
  FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees 
      WHERE user_id = auth.uid() OR email = auth.email()
    )
  )
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees 
      WHERE user_id = auth.uid() OR email = auth.email()
    )
  );

-- Fix leave_requests policies
DROP POLICY IF EXISTS "Employees can view own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Employees can insert own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Employees can cancel own pending leave requests" ON leave_requests;

CREATE POLICY "Employees can view own leave requests" ON leave_requests
  FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees 
      WHERE user_id = auth.uid() OR email = auth.email()
    )
  );

CREATE POLICY "Employees can insert own leave requests" ON leave_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees 
      WHERE user_id = auth.uid() OR email = auth.email()
    )
  );

CREATE POLICY "Employees can cancel own pending leave requests" ON leave_requests
  FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees 
      WHERE user_id = auth.uid() OR email = auth.email()
    )
    AND status = 'pending'
  )
  WITH CHECK (
    status = 'cancelled'
  );

-- Fix payslips policy
DROP POLICY IF EXISTS "Employees can view own payslips" ON payslips;

CREATE POLICY "Employees can view own payslips" ON payslips
  FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees 
      WHERE user_id = auth.uid() OR email = auth.email()
    )
  );

-- Fix bonus_requests policy
DROP POLICY IF EXISTS "Employees can view own bonus requests" ON bonus_requests;

CREATE POLICY "Employees can view own bonus requests" ON bonus_requests
  FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees 
      WHERE user_id = auth.uid() OR email = auth.email()
    )
  );
