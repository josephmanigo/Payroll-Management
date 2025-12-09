-- Seed employees back into the database
-- This script restores the 6 employees that were deleted
-- Updated to 2025 format employee numbers

-- Delete existing employees first to avoid conflicts (no unique constraint on email)
DELETE FROM employees WHERE email IN (
  'joseph.manigo@hcdc.edu.ph',
  'neokolbe.abracia@hcdc.edu.ph',
  'marvinpaul.saytas@hcdc.edu.ph',
  'joseppemark.alingalan@hcdc.edu.ph',
  'stephenjade.bayate@hcdc.edu.ph',
  'alfredmari.cada@hcdc.edu.ph'
);

INSERT INTO employees (
  id,
  employee_number,
  first_name,
  last_name,
  email,
  phone,
  department,
  position,
  status,
  monthly_salary,
  hire_date,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  'EMP-2025-001',
  'Joseph',
  'Manigo',
  'joseph.manigo@hcdc.edu.ph',
  '+63 1353 626 3263',
  'Sales',
  'Business Development Officer',
  'active',
  42805,
  '2025-01-15',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'EMP-2025-002',
  'Neo Kolbe',
  'Abracia',
  'neokolbe.abracia@hcdc.edu.ph',
  '+63 1271 362 5262',
  'Operations',
  'Operations Manager',
  'active',
  55389,
  '2025-02-01',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'EMP-2025-003',
  'Marvin Paul',
  'Saytas',
  'marvinpaul.saytas@hcdc.edu.ph',
  '+63 1591 245 8704',
  'Operations',
  'Project Manager',
  'active',
  41761,
  '2025-03-15',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'EMP-2025-004',
  'Joseppe Mark',
  'Alingalan',
  'joseppemark.alingalan@hcdc.edu.ph',
  '+63 978 381 7668',
  'Operations',
  'Project Manager',
  'active',
  32375,
  '2025-04-01',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'EMP-2025-005',
  'Stephen Jade',
  'Bayate',
  'stephenjade.bayate@hcdc.edu.ph',
  '+63 913 495 7635',
  'Customer Support',
  'Customer Service Representative',
  'active',
  21845,
  '2025-05-15',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'EMP-2025-006',
  'Alfred Mari',
  'Cada',
  'alfredmari.cada@hcdc.edu.ph',
  '+63 1178 781 4628',
  'Operations',
  'Business Analyst',
  'active',
  43492,
  '2025-06-01',
  NOW(),
  NOW()
);

-- Verify the inserted employees
SELECT employee_number, first_name, last_name, email, department, position 
FROM employees 
WHERE email LIKE '%@hcdc.edu.ph'
ORDER BY employee_number;
