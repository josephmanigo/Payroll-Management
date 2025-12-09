"use server"

import { createAdminClient } from "@/lib/supabase/admin"

const MOCK_EMPLOYEES = [
  {
    email: "joseph.manigo@hcdc.edu.ph",
    password: "hcdc2024",
    firstName: "Joseph",
    lastName: "Manigo",
  },
  {
    email: "neokolbe.abracia@hcdc.edu.ph",
    password: "hcdc2024",
    firstName: "Neo Kolbe",
    lastName: "Abracia",
  },
  {
    email: "marvinpaul.saytas@hcdc.edu.ph",
    password: "hcdc2024",
    firstName: "Marvin Paul",
    lastName: "Saytas",
  },
  {
    email: "joseppemark.alingalan@hcdc.edu.ph",
    password: "hcdc2024",
    firstName: "Joseppe Mark",
    lastName: "Alingalan",
  },
  {
    email: "stephenjade.bayate@hcdc.edu.ph",
    password: "hcdc2024",
    firstName: "Stephen Jade",
    lastName: "Bayate",
  },
  {
    email: "alfredmari.cada@hcdc.edu.ph",
    password: "hcdc2024",
    firstName: "Alfred Mari",
    lastName: "Cada",
  },
]

export async function seedMockEmployeeAccounts() {
  const adminClient = createAdminClient()
  const results: { email: string; success: boolean; error?: string }[] = []

  for (const emp of MOCK_EMPLOYEES) {
    try {
      // Check if user already exists
      const { data: existingUsers } = await adminClient.auth.admin.listUsers()
      const existingUser = existingUsers?.users?.find((u) => u.email === emp.email)

      if (existingUser) {
        // User exists, update their password
        const { error: updateError } = await adminClient.auth.admin.updateUserById(existingUser.id, {
          password: emp.password,
          email_confirm: true,
        })

        if (updateError) {
          results.push({ email: emp.email, success: false, error: updateError.message })
          continue
        }

        // Link to employee record
        const { data: employee } = await adminClient.from("employees").select("id").eq("email", emp.email).single()

        if (employee) {
          await adminClient.from("employees").update({ user_id: existingUser.id }).eq("id", employee.id)
        }

        // Update profile
        await adminClient.from("profiles").upsert({
          id: existingUser.id,
          email: emp.email,
          full_name: `${emp.firstName} ${emp.lastName}`,
          role: "employee",
          updated_at: new Date().toISOString(),
        })

        results.push({ email: emp.email, success: true })
        continue
      }

      // Create new auth user
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: emp.email,
        password: emp.password,
        email_confirm: true,
        user_metadata: {
          full_name: `${emp.firstName} ${emp.lastName}`,
        },
      })

      if (authError) {
        results.push({ email: emp.email, success: false, error: authError.message })
        continue
      }

      if (!authData.user) {
        results.push({ email: emp.email, success: false, error: "No user returned" })
        continue
      }

      // Link to employee record
      const { data: employee } = await adminClient.from("employees").select("id").eq("email", emp.email).single()

      if (employee) {
        await adminClient.from("employees").update({ user_id: authData.user.id }).eq("id", employee.id)
      }

      // Create profile
      await adminClient.from("profiles").upsert({
        id: authData.user.id,
        email: emp.email,
        full_name: `${emp.firstName} ${emp.lastName}`,
        role: "employee",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      results.push({ email: emp.email, success: true })
    } catch (error) {
      results.push({
        email: emp.email,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  return results
}

export async function getMockEmployeeCredentials() {
  return MOCK_EMPLOYEES.map((emp) => ({
    email: emp.email,
    password: emp.password,
    name: `${emp.firstName} ${emp.lastName}`,
  }))
}
