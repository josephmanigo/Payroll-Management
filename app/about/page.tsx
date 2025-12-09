import Link from "next/link"
import { Building2, Target, Eye, Users } from "lucide-react"
import { AnimatedButton } from "@/components/ui/animated-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MobileNav } from "@/components/mobile-nav"
import { ThemeToggle } from "@/components/theme-toggle"

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-2 transition-all duration-200 hover:opacity-80 hover:scale-105"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg sm:text-xl font-bold">Payroll Management</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              Home
            </Link>
            <Link href="/about" className="text-sm font-medium text-foreground">
              About Us
            </Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">
              Contact Us
            </Link>
          </nav>
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <AnimatedButton className="gap-2">Sign in</AnimatedButton>
            </Link>
          </div>
          <div className="flex md:hidden items-center gap-1">
            <ThemeToggle />
            <MobileNav />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="py-8 md:py-16 flex-grow">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">About Us</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
              We are dedicated to simplifying payroll management for small businesses
            </p>
          </div>

          <div className="grid gap-4 md:gap-8 sm:grid-cols-2 md:grid-cols-3 max-w-5xl mx-auto mb-8 md:mb-16">
            <Card>
              <CardHeader className="text-center">
                <div className="flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                  <Target className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <CardTitle className="text-lg md:text-xl">Our Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center text-sm md:text-base">
                  To provide small businesses with an affordable, easy-to-use payroll solution that saves time and
                  ensures accuracy.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <div className="flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                  <Eye className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <CardTitle className="text-lg md:text-xl">Our Vision</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center text-sm md:text-base">
                  To become the leading payroll management platform for small businesses, empowering them to focus on
                  growth.
                </p>
              </CardContent>
            </Card>

            <Card className="sm:col-span-2 md:col-span-1">
              <CardHeader className="text-center">
                <div className="flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                  <Users className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <CardTitle className="text-lg md:text-xl">Our Team</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center text-sm md:text-base">
                  A dedicated team of professionals passionate about creating solutions that make a difference for
                  businesses.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="max-w-3xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Why Choose Us?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm md:text-base">
                  Payroll Management was founded with a simple goal: to make payroll processing accessible and
                  stress-free for small businesses. We understand the challenges that come with managing employee
                  payments, tax calculations, and compliance requirements.
                </p>
                <p className="text-muted-foreground text-sm md:text-base">
                  Our platform is designed to handle all aspects of payroll management, from calculating gross-to-net
                  payments to generating professional payslips. We prioritize security, accuracy, and ease of use in
                  everything we build.
                </p>
                <p className="text-muted-foreground text-sm md:text-base">
                  With Payroll Management, you can focus on what matters most - growing your business - while we take
                  care of the complexities of payroll processing.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 md:py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-left">
            <Link
              href="/"
              className="flex items-center gap-2 transition-all duration-200 hover:opacity-80 hover:scale-105"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Building2 className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold">Payroll Management</span>
            </Link>
            <p className="text-sm text-muted-foreground">© 2025 Payroll Management. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
