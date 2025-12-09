-- ==========================================
-- AUDIT LOGS TABLE MIGRATION
-- Creates the audit_logs table for tracking all user actions
-- ==========================================

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('admin', 'hr', 'employee')),
  user_name TEXT, -- Stores the user's name at the time of action
  user_email TEXT, -- Stores the user's email at the time of action
  action TEXT NOT NULL, -- Description of what happened
  entity_type TEXT NOT NULL, -- employee, leave, bonus, attendance, payroll, auth, etc.
  entity_id UUID, -- ID of the affected record (nullable for some actions like login/logout)
  metadata JSONB DEFAULT '{}', -- Additional context data
  ip_address TEXT, -- IP address of the user (optional)
  user_agent TEXT, -- Browser/device info (optional)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_role ON audit_logs(user_role);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and HR can view all audit logs
CREATE POLICY "HR and Admin can view all audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'hr')
    )
  );

-- Policy: Employees can view only their own audit logs
CREATE POLICY "Employees can view own audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Service role can insert audit logs (for server-side logging)
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Enable realtime for audit_logs
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;

-- Comment on table
COMMENT ON TABLE audit_logs IS 'Tracks all user actions in the system for audit purposes';
