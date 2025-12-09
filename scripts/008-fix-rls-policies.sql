-- Fix RLS Policies for Real-time Employee Data Sync
-- This script ensures employees can view their own data based on user_id or email linkage

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Employees can view own record" ON employees;
DROP POLICY IF EXISTS "HR and Admin can insert employees" ON employees;
DROP POLICY IF EXISTS "HR and Admin can update employees" ON employees;
DROP POLICY IF EXISTS "HR and Admin can delete employees" ON employees;

DROP POLICY IF EXISTS "Employees can view own payslips" ON payslips;
DROP POLICY IF EXISTS "HR and Admin can manage payslips" ON payslips;

-- =====================================================
-- EMPLOYEES TABLE POLICIES
-- =====================================================

-- Employees can view their own record (linked by user_id OR matching email)
CREATE POLICY "Employees can view own record" ON employees
  FOR SELECT
  USING (
    -- Direct user_id match
    user_id = auth.uid()
    OR
    -- Email match for employees without linked user_id yet
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR
    -- HR/Admin can see all
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('hr', 'admin')
    )
  );

-- HR and Admin can insert new employees
CREATE POLICY "HR and Admin can insert employees" ON employees
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('hr', 'admin')
    )
  );

-- HR and Admin can update any employee
CREATE POLICY "HR and Admin can update employees" ON employees
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('hr', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('hr', 'admin')
    )
  );

-- HR and Admin can delete employees
CREATE POLICY "HR and Admin can delete employees" ON employees
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('hr', 'admin')
    )
  );

-- =====================================================
-- PAYSLIPS TABLE POLICIES
-- =====================================================

-- Drop and recreate payslips policies
DROP POLICY IF EXISTS "Employees can view own payslips" ON payslips;
DROP POLICY IF EXISTS "HR and Admin can manage payslips" ON payslips;

-- Employees can view their own payslips (via employee record linkage)
CREATE POLICY "Employees can view own payslips" ON payslips
  FOR SELECT
  USING (
    -- Check if the payslip belongs to the employee linked to this user
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.id = payslips.employee_id 
      AND (
        employees.user_id = auth.uid()
        OR
        employees.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
    OR
    -- HR/Admin can see all payslips
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('hr', 'admin')
    )
  );

-- HR and Admin have full access to payslips
CREATE POLICY "HR and Admin can insert payslips" ON payslips
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('hr', 'admin')
    )
  );

CREATE POLICY "HR and Admin can update payslips" ON payslips
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('hr', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('hr', 'admin')
    )
  );

CREATE POLICY "HR and Admin can delete payslips" ON payslips
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('hr', 'admin')
    )
  );

-- =====================================================
-- ENABLE REALTIME FOR THESE TABLES
-- =====================================================

-- Enable realtime for employees table
ALTER PUBLICATION supabase_realtime ADD TABLE employees;

-- Enable realtime for payslips table  
ALTER PUBLICATION supabase_realtime ADD TABLE payslips;

-- Enable realtime for profiles table (if not already)
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
