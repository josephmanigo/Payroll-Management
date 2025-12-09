-- Fix infinite recursion in profiles RLS policies
-- The issue is that checking role from profiles table within profiles policy causes recursion

-- Drop the problematic policies
DROP POLICY IF EXISTS "HR and Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "HR and Admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create a security definer function to safely get user role without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
  RETURN COALESCE(user_role, 'employee');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;

-- Recreate profiles policies using the security definer function
-- Users can always view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- HR and Admin can view all profiles (uses security definer function)
CREATE POLICY "HR and Admin can view all profiles" ON public.profiles
  FOR SELECT USING (
    public.get_user_role(auth.uid()) IN ('admin', 'hr')
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- HR and Admin can update all profiles
CREATE POLICY "HR and Admin can update all profiles" ON public.profiles
  FOR UPDATE USING (
    public.get_user_role(auth.uid()) IN ('admin', 'hr')
  );

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Service role can insert any profile (for admin user creation)
CREATE POLICY "Service role can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Also fix the employees table policies
DROP POLICY IF EXISTS "Employees can view own record" ON public.employees;
DROP POLICY IF EXISTS "HR and Admin can insert employees" ON public.employees;
DROP POLICY IF EXISTS "HR and Admin can update employees" ON public.employees;

-- Recreate employees policies using security definer function
CREATE POLICY "Employees can view own record" ON public.employees
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('admin', 'hr')
  );

CREATE POLICY "HR and Admin can insert employees" ON public.employees
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) IN ('admin', 'hr')
  );

CREATE POLICY "HR and Admin can update employees" ON public.employees
  FOR UPDATE USING (
    public.get_user_role(auth.uid()) IN ('admin', 'hr')
  );

-- Fix payslips policies
DROP POLICY IF EXISTS "Employees can view own payslips" ON public.payslips;
DROP POLICY IF EXISTS "HR and Admin can manage payslips" ON public.payslips;

CREATE POLICY "Employees can view own payslips" ON public.payslips
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE employees.id = payslips.employee_id 
      AND employees.user_id = auth.uid()
    )
    OR public.get_user_role(auth.uid()) IN ('admin', 'hr')
  );

CREATE POLICY "HR and Admin can manage payslips" ON public.payslips
  FOR ALL USING (
    public.get_user_role(auth.uid()) IN ('admin', 'hr')
  );
