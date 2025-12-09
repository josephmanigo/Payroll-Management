-- Fix RLS policy to allow employees to view records matching their email OR user_id
-- This allows newly signed-up users to see their employee record even if user_id is not linked yet

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Employees can view own record" ON employees;

-- Create a more flexible policy that matches by user_id OR email
CREATE POLICY "Employees can view own record" ON employees
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Also allow employees to update their own record to link user_id
DROP POLICY IF EXISTS "Employees can link own user_id" ON employees;

CREATE POLICY "Employees can link own user_id" ON employees
  FOR UPDATE
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
  );
