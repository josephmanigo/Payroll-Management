-- Add 'cancelled' status to bonus_requests check constraint
-- First, drop the existing constraint and recreate it with the new value

-- Drop the existing check constraint on bonus_requests
ALTER TABLE bonus_requests DROP CONSTRAINT IF EXISTS bonus_requests_status_check;

-- Add the new check constraint that includes 'cancelled'
ALTER TABLE bonus_requests ADD CONSTRAINT bonus_requests_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));

-- Also update leave_requests to include 'cancelled' if it has a similar constraint
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_status_check;

-- Add the new check constraint for leave_requests that includes 'cancelled'
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));
