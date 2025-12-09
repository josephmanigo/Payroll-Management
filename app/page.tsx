import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Building2, Users, FileText, Calendar } from "lucide-react"
import { AnimatedButton } from "@/components/ui/animated-button"
import { MobileNav } from "@/components/mobile-nav"
import { ThemeToggle } from "@/components/theme-toggle"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background gap-8 md:gap-16">
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
            <Link href="/" className="text-sm font-medium text-foreground">
              Home
            </Link>
            <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">
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

      {/* Hero Section */}
      <section className="py-8 md:py-16 lg:py-20 leading-7 my-0">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Left side - Content */}
            <div className="order-2 md:order-1">
              <h1 className="font-bold mb-4 text-balance text-2xl sm:text-3xl md:text-4xl">Payroll Management</h1>
              <p className="text-base md:text-lg text-muted-foreground mb-6 md:mb-8 text-pretty">
                The all-in-one solution for managing employees, tracking attendance, and processing salaries with
                unparalleled ease and accuracy.
              </p>

              <div className="flex flex-col gap-4 md:gap-6">
                {/* Effortless Employee Management */}
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 shrink-0">
                    <Users className="h-5 w-5 md:h-6 md:w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-base md:text-lg">
                      Effortless Employee Management
                    </h3>
                    <p className="text-sm md:text-base text-muted-foreground">
                      Keep all employee records organized and accessible in one central hub.
                    </p>
                  </div>
                </div>

                {/* Automated Attendance Tracking */}
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/30 shrink-0">
                    <Calendar className="h-5 w-5 md:h-6 md:w-6 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-base md:text-lg">
                      Automated Attendance Tracking
                    </h3>
                    <p className="text-sm md:text-base text-muted-foreground">
                      Simplify timekeeping with our smart, automated attendance system.
                    </p>
                  </div>
                </div>

                {/* Instant Salary Slip Generation */}
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 shrink-0">
                    <FileText className="h-5 w-5 md:h-6 md:w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-base md:text-lg">
                      Instant Salary Slip Generation
                    </h3>
                    <p className="text-sm md:text-base text-muted-foreground">
                      Generate accurate, professional salary slips in just a few clicks.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:gap-4 mt-6 md:mt-8">
                <Link href="/login" className="w-full sm:w-auto">
                  <AnimatedButton size="lg" className="w-full sm:w-auto">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </AnimatedButton>
                </Link>
                <Link href="/about" className="w-full sm:w-auto">
                  <AnimatedButton size="lg" className="w-full sm:w-auto">
                    Learn More
                  </AnimatedButton>
                </Link>
              </div>
            </div>

            {/* Right side - Image */}
            <div className="relative flex items-center justify-center order-1 md:order-2">
              <Image
                src="/images/payroll.webp"
                alt="Payroll management illustration showing a person working with financial documents, calculator, and tax forms"
                width={800}
                height={600}
                className="h-auto w-full rounded-xl max-w-sm md:max-w-full"
                priority
              />
            </div>
          </div>
        </div>
      </section>

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
