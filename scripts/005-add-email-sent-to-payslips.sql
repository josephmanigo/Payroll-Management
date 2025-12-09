-- Add email_sent and email_sent_at columns to payslips table
ALTER TABLE payslips 
ADD COLUMN IF NOT EXISTS email_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS email_sent_at timestamp with time zone;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payslips_email_sent ON payslips(email_sent);
