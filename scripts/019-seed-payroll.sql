-- Seed mock payroll data for all employees
-- Creates payslips for January 2025 to December 2025 (bi-monthly: 1-15 and 16-end of month)

-- First, delete any existing payslips for these employees to avoid duplicates
DELETE FROM payslips WHERE employee_id IN (
  SELECT id FROM employees WHERE email LIKE '%@hcdc.edu.ph'
);

-- Insert payslips for each employee
-- We'll create payslips from January 2025 to November 2025 (paid through December 2025)

DO $$
DECLARE
  emp RECORD;
  month_num INT;
  period_start DATE;
  period_end DATE;
  pay_date DATE;
  half_salary NUMERIC;
  deductions NUMERIC;
  net NUMERIC;
BEGIN
  -- Loop through each employee
  FOR emp IN 
    SELECT id, monthly_salary, hire_date 
    FROM employees 
    WHERE email LIKE '%@hcdc.edu.ph'
  LOOP
    -- Loop through months (January to November 2025)
    FOR month_num IN 1..11 LOOP
      -- Skip if employee wasn't hired yet
      IF emp.hire_date <= make_date(2025, month_num, 15) THEN
        -- First half of month (1-15)
        period_start := make_date(2025, month_num, 1);
        period_end := make_date(2025, month_num, 15);
        pay_date := make_date(2025, month_num, 20);
        
        -- Cast to numeric before ROUND to fix PostgreSQL error
        half_salary := ROUND((emp.monthly_salary / 2)::numeric, 2);
        -- Random deductions between 5-15% of half salary
        deductions := ROUND((half_salary * (0.05 + random() * 0.10))::numeric, 2);
        net := half_salary - deductions;
        
        INSERT INTO payslips (
          id, employee_id, pay_period_start, pay_period_end, pay_date,
          gross_pay, total_deductions, net_pay, status, email_sent, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), emp.id, period_start, period_end, pay_date,
          half_salary, deductions, net, 'paid', true, NOW(), NOW()
        );
      END IF;
      
      -- Second half of month (16-end)
      IF emp.hire_date <= make_date(2025, month_num, 28) THEN
        period_start := make_date(2025, month_num, 16);
        -- Get last day of month
        period_end := (make_date(2025, month_num, 1) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        -- Pay date is 5th of next month
        IF month_num < 12 THEN
          pay_date := make_date(2025, month_num + 1, 5);
        ELSE
          pay_date := make_date(2026, 1, 5);
        END IF;
        
        -- Cast to numeric before ROUND to fix PostgreSQL error
        half_salary := ROUND((emp.monthly_salary / 2)::numeric, 2);
        -- Random deductions between 5-15% of half salary
        deductions := ROUND((half_salary * (0.05 + random() * 0.10))::numeric, 2);
        net := half_salary - deductions;
        
        INSERT INTO payslips (
          id, employee_id, pay_period_start, pay_period_end, pay_date,
          gross_pay, total_deductions, net_pay, status, email_sent, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), emp.id, period_start, period_end, pay_date,
          half_salary, deductions, net, 'paid', true, NOW(), NOW()
        );
      END IF;
    END LOOP;
    
    -- December 2025 - First half only (1-15), mark as pending for current period
    IF emp.hire_date <= make_date(2025, 12, 15) THEN
      period_start := make_date(2025, 12, 1);
      period_end := make_date(2025, 12, 15);
      pay_date := make_date(2025, 12, 20);
      
      -- Cast to numeric before ROUND to fix PostgreSQL error
      half_salary := ROUND((emp.monthly_salary / 2)::numeric, 2);
      deductions := ROUND((half_salary * (0.05 + random() * 0.10))::numeric, 2);
      net := half_salary - deductions;
      
      INSERT INTO payslips (
        id, employee_id, pay_period_start, pay_period_end, pay_date,
        gross_pay, total_deductions, net_pay, status, email_sent, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), emp.id, period_start, period_end, pay_date,
        half_salary, deductions, net, 'pending', false, NOW(), NOW()
      );
    END IF;
  END LOOP;
END $$;

-- Verify the inserted payslips
SELECT 
  e.first_name || ' ' || e.last_name AS employee_name,
  p.pay_period_start,
  p.pay_period_end,
  p.gross_pay,
  p.total_deductions,
  p.net_pay,
  p.status
FROM payslips p
JOIN employees e ON e.id = p.employee_id
WHERE e.email LIKE '%@hcdc.edu.ph'
ORDER BY e.employee_number, p.pay_period_start;
