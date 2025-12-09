-- Seed mock employees for HCDC Payroll System
-- These employees will be created with default password: hcdc2024
-- Updated to 2025 dates and employee numbers

-- First, delete existing test employees if they exist (to avoid duplicates)
DELETE FROM employees WHERE email IN (
  'joseph.manigo@hcdc.edu.ph',
  'neokolbe.abracia@hcdc.edu.ph',
  'marvinpaul.saytas@hcdc.edu.ph',
  'joseppemark.alingalan@hcdc.edu.ph',
  'stephenjade.bayate@hcdc.edu.ph',
  'alfredmari.cada@hcdc.edu.ph'
);

-- Insert mock employees with 2025 dates and sequential employee numbers
INSERT INTO employees (
  id,
  employee_number,
  first_name,
  last_name,
  email,
  phone,
  department,
  position,
  monthly_salary,
  hire_date,
  status,
  created_at,
  updated_at
) VALUES
  (
    gen_random_uuid(),
    'EMP-2025-001',
    'Joseph',
    'Manigo',
    'joseph.manigo@hcdc.edu.ph',
    '+63 912 345 6789',
    'IT Department',
    'Software Developer',
    45000.00,
    '2025-01-15',
    'active',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'EMP-2025-002',
    'Neo Kolbe',
    'Abracia',
    'neokolbe.abracia@hcdc.edu.ph',
    '+63 912 345 6790',
    'IT Department',
    'System Administrator',
    42000.00,
    '2025-02-01',
    'active',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'EMP-2025-003',
    'Marvin Paul',
    'Saytas',
    'marvinpaul.saytas@hcdc.edu.ph',
    '+63 912 345 6791',
    'Engineering',
    'Network Engineer',
    40000.00,
    '2025-02-15',
    'active',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'EMP-2025-004',
    'Joseppe Mark',
    'Alingalan',
    'joseppemark.alingalan@hcdc.edu.ph',
    '+63 912 345 6792',
    'IT Department',
    'Web Developer',
    38000.00,
    '2025-03-01',
    'active',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'EMP-2025-005',
    'Stephen Jade',
    'Bayate',
    'stephenjade.bayate@hcdc.edu.ph',
    '+63 912 345 6793',
    'IT Department',
    'Database Administrator',
    43000.00,
    '2025-03-15',
    'active',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'EMP-2025-006',
    'Alfred Mari',
    'Cada',
    'alfredmari.cada@hcdc.edu.ph',
    '+63 912 345 6794',
    'Engineering',
    'Technical Support',
    35000.00,
    '2025-04-01',
    'active',
    NOW(),
    NOW()
  );

-- Verify the inserted employees
SELECT employee_number, first_name, last_name, email, department, position, status 
FROM employees 
WHERE email LIKE '%@hcdc.edu.ph'
ORDER BY employee_number;
