-- Update RLS policies to support role-based access control

-- First, let's add policies for HR managers and admins to view all profiles
DROP POLICY IF EXISTS "HR and Admin can view all profiles" ON public.profiles;
CREATE POLICY "HR and Admin can view all profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'hr')
    )
  );

-- HR and Admin can update any profile
DROP POLICY IF EXISTS "HR and Admin can update all profiles" ON public.profiles;
CREATE POLICY "HR and Admin can update all profiles" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'hr')
    )
  );

-- Create employees table if not exists
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_number TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  department TEXT,
  position TEXT,
  monthly_salary DECIMAL(12, 2) DEFAULT 0,
  hire_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Employees can only view their own record
DROP POLICY IF EXISTS "Employees can view own record" ON public.employees;
CREATE POLICY "Employees can view own record" ON public.employees
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'hr')
    )
  );

-- Only HR and Admin can insert employees
DROP POLICY IF EXISTS "HR and Admin can insert employees" ON public.employees;
CREATE POLICY "HR and Admin can insert employees" ON public.employees
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'hr')
    )
  );

-- Only HR and Admin can update employees
DROP POLICY IF EXISTS "HR and Admin can update employees" ON public.employees;
CREATE POLICY "HR and Admin can update employees" ON public.employees
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'hr')
    )
  );

-- Create payslips table if not exists
CREATE TABLE IF NOT EXISTS public.payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  pay_date DATE NOT NULL,
  gross_pay DECIMAL(12, 2) DEFAULT 0,
  total_deductions DECIMAL(12, 2) DEFAULT 0,
  net_pay DECIMAL(12, 2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on payslips
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

-- Employees can only view their own payslips
DROP POLICY IF EXISTS "Employees can view own payslips" ON public.payslips;
CREATE POLICY "Employees can view own payslips" ON public.payslips
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE employees.id = payslips.employee_id 
      AND employees.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'hr')
    )
  );

-- Only HR and Admin can manage payslips
DROP POLICY IF EXISTS "HR and Admin can manage payslips" ON public.payslips;
CREATE POLICY "HR and Admin can manage payslips" ON public.payslips
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'hr')
    )
  );
