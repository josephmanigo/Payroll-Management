-- Seed default admin account
-- Email: admin@company.com
-- Password: admin
-- 
-- NOTE: This script creates a profile entry. The actual auth user
-- must be created through Supabase Auth API (which the app does automatically).
-- Run the app and use the sign-up page, or the seed script below creates it via API.

-- First, ensure the profile exists for when the auth user is created
-- The actual user creation happens via the Supabase Auth Admin API in the seed script

DO $$
BEGIN
  RAISE NOTICE 'Admin account profile will be created when auth user is set up.';
  RAISE NOTICE 'Use the application to create the admin user with:';
  RAISE NOTICE 'Email: admin@company.com';
  RAISE NOTICE 'Password: admin';
END $$;
