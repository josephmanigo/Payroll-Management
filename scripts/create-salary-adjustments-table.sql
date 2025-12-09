-- Create salary_adjustments table
CREATE TABLE IF NOT EXISTS salary_adjustments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('increase', 'decrease', 'bonus', 'deduction')),
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  effective_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_employee_id ON salary_adjustments(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_status ON salary_adjustments(status);

-- Enable RLS
ALTER TABLE salary_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view salary adjustments" ON salary_adjustments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert salary adjustments" ON salary_adjustments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update salary adjustments" ON salary_adjustments
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete salary adjustments" ON salary_adjustments
  FOR DELETE TO authenticated USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_salary_adjustments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_salary_adjustments_updated_at
  BEFORE UPDATE ON salary_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION update_salary_adjustments_updated_at();
