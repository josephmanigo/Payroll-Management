-- Create leave_requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('vacation', 'sick', 'emergency', 'maternity', 'paternity', 'unpaid', 'bereavement')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_start_date ON leave_requests(start_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_end_date ON leave_requests(end_date);

-- Enable RLS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Employees can view their own leave requests
CREATE POLICY "Employees can view own leave requests" ON leave_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.id = leave_requests.employee_id 
      AND (
        employees.user_id = auth.uid()
        OR employees.email = auth.jwt()->>'email'
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('hr', 'admin')
    )
  );

-- Employees can insert their own leave requests
CREATE POLICY "Employees can insert own leave requests" ON leave_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.id = leave_requests.employee_id 
      AND (
        employees.user_id = auth.uid()
        OR employees.email = auth.jwt()->>'email'
      )
    )
  );

-- Employees can update their own pending leave requests (cancel only)
CREATE POLICY "Employees can cancel own pending leave requests" ON leave_requests
  FOR UPDATE
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.id = leave_requests.employee_id 
      AND (
        employees.user_id = auth.uid()
        OR employees.email = auth.jwt()->>'email'
      )
    )
  )
  WITH CHECK (
    status = 'cancelled'
  );

-- HR and Admin can update all leave requests (approve/reject)
CREATE POLICY "HR and Admin can update leave requests" ON leave_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('hr', 'admin')
    )
  );

-- HR and Admin can delete leave requests
CREATE POLICY "HR and Admin can delete leave requests" ON leave_requests
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('hr', 'admin')
    )
  );

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE leave_requests;
