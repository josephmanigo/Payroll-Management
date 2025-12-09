-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Employees can insert own bonus requests" ON bonus_requests;

-- Create a more flexible INSERT policy that allows employees to insert
-- We validate on the server side, so we allow authenticated users to insert
-- The server action already verifies the employee belongs to the user
CREATE POLICY "Authenticated users can insert bonus requests" ON bonus_requests
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Also update the SELECT policy to be more flexible
DROP POLICY IF EXISTS "Employees can view own bonus requests" ON bonus_requests;

CREATE POLICY "Employees can view own bonus requests" ON bonus_requests
  FOR SELECT
  USING (
    -- Check by user_id if linked
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
    OR
    -- Check by email match
    employee_id IN (
      SELECT e.id FROM employees e
      INNER JOIN profiles p ON LOWER(e.email) = LOWER(p.email)
      WHERE p.id = auth.uid()
    )
  );
