-- Create bonus_requests table
CREATE TABLE IF NOT EXISTS bonus_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_bonus_requests_employee_id ON bonus_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_bonus_requests_status ON bonus_requests(status);

-- Enable RLS
ALTER TABLE bonus_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Employees can view their own bonus requests
CREATE POLICY "Employees can view own bonus requests" ON bonus_requests
  FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  );

-- Policy: Employees can insert their own bonus requests
CREATE POLICY "Employees can insert own bonus requests" ON bonus_requests
  FOR INSERT
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  );

-- Policy: HR and Admin can view all bonus requests
CREATE POLICY "HR and Admin can view all bonus requests" ON bonus_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

-- Policy: HR and Admin can update bonus requests
CREATE POLICY "HR and Admin can update bonus requests" ON bonus_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

-- Policy: HR and Admin can delete bonus requests
CREATE POLICY "HR and Admin can delete bonus requests" ON bonus_requests
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

-- Enable realtime for bonus_requests
ALTER PUBLICATION supabase_realtime ADD TABLE bonus_requests;
