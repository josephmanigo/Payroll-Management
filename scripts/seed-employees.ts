// This script creates Supabase Auth accounts for all existing employees
// Run this once to set up employee login credentials
// Default password: "employee"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Existing employees from mock data
const employees = [
  {
    id: "EMP-001",
    firstName: "Joseph",
    lastName: "Manigo",
    email: "joseph.manigo@hcdc.edu.ph",
    department: "Sales",
    position: "Business Development Officer",
    salary: 42805.0,
  },
  {
    id: "EMP-002",
    firstName: "Neo Kolbe",
    lastName: "Abracia",
    email: "neokolbe.abracia@hcdc.edu.ph",
    department: "Operations",
    position: "Operations Manager",
    salary: 55389.0,
  },
  {
    id: "EMP-003",
    firstName: "Marvin Paul",
    lastName: "Saytas",
    email: "marvinpaul.saytas@hcdc.edu.ph",
    department: "Operations",
    position: "Project Manager",
    salary: 41761.0,
  },
  {
    id: "EMP-004",
    firstName: "Joseppe Mark",
    lastName: "Alingalan",
    email: "joseppemark.alingalan@hcdc.edu.ph",
    department: "Operations",
    position: "Project Manager",
    salary: 32375.0,
  },
  {
    id: "EMP-005",
    firstName: "Stephen Jade",
    lastName: "Bayate",
    email: "stephenjade.bayate@hcdc.edu.ph",
    department: "Customer Support",
    position: "Customer Service Representative",
    salary: 21845.0,
  },
  {
    id: "EMP-006",
    firstName: "Alfred Mari",
    lastName: "Cada",
    email: "alfredmari.cada@hcdc.edu.ph",
    department: "Operations",
    position: "Business Analyst",
    salary: 43492.0,
  },
]

const DEFAULT_PASSWORD = "employee"

async function seedEmployees() {
  console.log("Starting employee account seeding...")

  for (const employee of employees) {
    console.log(`\nProcessing: ${employee.email}`)

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users.find((u) => u.email === employee.email)

    if (existingUser) {
      console.log(`  - User already exists with ID: ${existingUser.id}`)

      // Update employee record with user_id if not set
      const { error: updateError } = await supabase.from("employees").upsert(
        {
          employee_number: employee.id,
          first_name: employee.firstName,
          last_name: employee.lastName,
          email: employee.email,
          department: employee.department,
          position: employee.position,
          user_id: existingUser.id,
          status: "active",
          hire_date: new Date().toISOString().split("T")[0],
        },
        { onConflict: "email" },
      )

      if (updateError) {
        console.log(`  - Error updating employee: ${updateError.message}`)
      } else {
        console.log(`  - Employee record updated`)
      }

      continue
    }

    // Create new auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: employee.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: `${employee.firstName} ${employee.lastName}`,
        role: "employee",
      },
    })

    if (authError) {
      console.log(`  - Error creating auth user: ${authError.message}`)
      continue
    }

    console.log(`  - Auth user created with ID: ${authData.user.id}`)

    // Create profile
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: authData.user.id,
        email: employee.email,
        full_name: `${employee.firstName} ${employee.lastName}`,
        department: employee.department,
        role: "employee",
      },
      { onConflict: "id" },
    )

    if (profileError) {
      console.log(`  - Error creating profile: ${profileError.message}`)
    } else {
      console.log(`  - Profile created`)
    }

    // Create/update employee record
    const { error: employeeError } = await supabase.from("employees").upsert(
      {
        employee_number: employee.id,
        first_name: employee.firstName,
        last_name: employee.lastName,
        email: employee.email,
        department: employee.department,
        position: employee.position,
        user_id: authData.user.id,
        status: "active",
        hire_date: new Date().toISOString().split("T")[0],
        monthly_salary: employee.salary,
      },
      { onConflict: "email" },
    )

    if (employeeError) {
      console.log(`  - Error creating employee record: ${employeeError.message}`)
    } else {
      console.log(`  - Employee record created`)
    }
  }

  console.log("\n✅ Employee seeding complete!")
  console.log(`\nDefault password for all employees: "${DEFAULT_PASSWORD}"`)
  console.log("\nEmployees can log in with:")
  employees.forEach((emp) => {
    console.log(`  - ${emp.email} / ${DEFAULT_PASSWORD}`)
  })
}

seedEmployees().catch(console.error)
