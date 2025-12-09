-- Fix employee email lookup for real-time data sync
-- This ensures employees can be found by their auth email

-- Update the employee SELECT policy to handle email lookup more reliably
DROP POLICY IF EXISTS "Employees can view own record" ON employees;

CREATE POLICY "Employees can view own record" ON employees
  FOR SELECT
  USING (
    -- Direct user_id match (fastest)
    user_id = auth.uid()
    OR
    -- Email match using auth.jwt() for better performance
    email = auth.jwt()->>'email'
    OR
    -- HR/Admin can see all employees
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('hr', 'admin')
    )
  );

-- Update payslips policy similarly
DROP POLICY IF EXISTS "Employees can view own payslips" ON payslips;

CREATE POLICY "Employees can view own payslips" ON payslips
  FOR SELECT
  USING (
    -- Check if payslip belongs to employee linked to current user
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.id = payslips.employee_id 
      AND (
        employees.user_id = auth.uid()
        OR
        employees.email = auth.jwt()->>'email'
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

-- Grant realtime access (safe to run multiple times)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'employees'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE employees;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'payslips'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE payslips;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Tables may already be in publication
  NULL;
END $$;
