-- Fix RLS policies for employees table to allow authenticated users to view all employees
-- This is needed for the employee portal to work correctly

-- First, ensure RLS is enabled
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Authenticated users can view employees" ON employees;
DROP POLICY IF EXISTS "Employees can view own record" ON employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON employees;

-- Create a policy that allows all authenticated users to view all employees
-- This is needed because employees need to be looked up by email during login
CREATE POLICY "Authenticated users can view all employees"
ON employees
FOR SELECT
TO authenticated
USING (true);

-- Create a policy that allows admins to manage (insert, update, delete) employees
CREATE POLICY "Admins can manage employees"
ON employees
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'hr')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'hr')
  )
);

-- Also add a policy for service role to bypass RLS
CREATE POLICY "Service role can do anything"
ON employees
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'employees';
