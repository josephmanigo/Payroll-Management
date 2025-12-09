-- Fix the foreign key constraint on salary_adjustments table
-- This script removes the strict foreign key and makes approved_by optional

-- First, drop the existing foreign key constraint if it exists
ALTER TABLE salary_adjustments 
DROP CONSTRAINT IF EXISTS salary_adjustments_approved_by_fkey;

-- Make approved_by nullable (if not already)
ALTER TABLE salary_adjustments 
ALTER COLUMN approved_by DROP NOT NULL;

-- Add a softer constraint that only validates if the value is not null
-- and references auth.users instead of profiles (since not all users may have profiles)
ALTER TABLE salary_adjustments
ADD CONSTRAINT salary_adjustments_approved_by_fkey 
FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
