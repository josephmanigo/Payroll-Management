-- Add avatar_url column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add avatar_url column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create storage buckets (run these in Supabase Dashboard > Storage)
-- Note: Storage bucket creation requires the Supabase Dashboard or API
-- The following policies should be applied after creating buckets

-- Bucket: avatars (public)
-- Bucket: documents (private)
-- Bucket: payslips (private)

-- Storage policies for avatars bucket (public read, authenticated write)
-- These need to be created in Supabase Dashboard after bucket creation
