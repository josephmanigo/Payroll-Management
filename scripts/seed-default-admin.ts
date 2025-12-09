// Seed script to create the default admin account
// Run this script to create admin@company.com with password: admin

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function seedDefaultAdmin() {
  const adminEmail = "admin@company.com"
  const adminPassword = "admin"
  const adminName = "admin"

  console.log("Creating default admin account...")
  console.log(`Email: ${adminEmail}`)
  console.log(`Password: ${adminPassword}`)

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find((u) => u.email === adminEmail)

  if (existingUser) {
    console.log("Admin account already exists. Updating password...")

    // Update password for existing user
    const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: adminPassword,
      user_metadata: {
        full_name: adminName,
        role: "admin",
      },
    })

    if (updateError) {
      console.error("Failed to update admin account:", updateError.message)
      process.exit(1)
    }

    // Update profile
    await supabase.from("profiles").upsert({
      id: existingUser.id,
      email: adminEmail,
      full_name: adminName,
      role: "admin",
      updated_at: new Date().toISOString(),
    })

    console.log("Admin account updated successfully!")
    return
  }

  // Create new admin user
  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      full_name: adminName,
      role: "admin",
    },
  })

  if (createError) {
    console.error("Failed to create admin account:", createError.message)
    process.exit(1)
  }

  if (!userData.user) {
    console.error("Failed to create admin account: No user returned")
    process.exit(1)
  }

  // Create profile
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userData.user.id,
    email: adminEmail,
    full_name: adminName,
    role: "admin",
    updated_at: new Date().toISOString(),
  })

  if (profileError) {
    console.error("Profile creation warning:", profileError.message)
  }

  console.log("")
  console.log("========================================")
  console.log("Default admin account created successfully!")
  console.log("========================================")
  console.log(`Email:    ${adminEmail}`)
  console.log(`Password: ${adminPassword}`)
  console.log(`Role:     Administrator`)
  console.log("========================================")
  console.log("")
  console.log("You can now log in to the admin panel.")
}

seedDefaultAdmin()
