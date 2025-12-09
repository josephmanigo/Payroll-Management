"use client"

import { TrendingUp } from "lucide-react"
import { PolarGrid, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts"
import { useRouter } from "next/navigation"

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface DepartmentData {
  department: string
  count: number
  totalSalary: number
}

interface DepartmentRadialChartProps {
  data: DepartmentData[]
}

const departmentColors = [
  "oklch(0.65 0.18 175)", // Teal
  "oklch(0.55 0.16 230)", // Blue
  "oklch(0.7 0.16 145)", // Green
  "oklch(0.6 0.14 280)", // Purple
  "oklch(0.65 0.18 200)", // Cyan
  "oklch(0.58 0.12 320)", // Pink
  "oklch(0.72 0.14 120)", // Lime
]

export function DepartmentRadialChart({ data }: DepartmentRadialChartProps) {
  const router = useRouter()

  const chartData = data.map((dept, index) => ({
    department: dept.department,
    employees: dept.count,
    fill: departmentColors[index % departmentColors.length],
  }))

  const chartConfig: ChartConfig = {
    employees: {
      label: "Employees",
    },
    ...data.reduce(
      (acc, dept, index) => ({
        ...acc,
        [`dept-${index}`]: {
          label: dept.department,
          color: departmentColors[index % departmentColors.length],
        },
      }),
      {},
    ),
  }

  const totalEmployees = data.reduce((sum, dept) => sum + dept.count, 0)

  return (
    <div className="flex h-[280px] items-center">
      <div className="w-1/2">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart data={chartData} innerRadius={30} outerRadius={100}>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="department" />} />
              <PolarGrid gridType="circle" stroke="hsl(var(--border))" />
              <RadialBar
                dataKey="employees"
                cornerRadius={6}
                background={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
              />
            </RadialBarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
      <div className="w-1/2 space-y-1.5">
        {data.map((dept, index) => (
          <button
            key={dept.department}
            onClick={() => router.push(`/admin/employees?department=${encodeURIComponent(dept.department)}`)}
            className="flex items-center gap-2.5 w-full p-2 rounded-lg hover:bg-accent transition-colors text-left group"
          >
            <div
              className="h-3.5 w-3.5 rounded-full shrink-0 ring-2 ring-background shadow-sm"
              style={{ backgroundColor: departmentColors[index % departmentColors.length] }}
            />
            <span className="text-sm flex-1 truncate group-hover:text-foreground transition-colors">
              {dept.department}
            </span>
            <span className="text-sm font-semibold tabular-nums">{dept.count}</span>
          </button>
        ))}
        <div className="pt-2 mt-2 border-t flex items-center gap-2 text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          <span>
            {totalEmployees} total employees across {data.length} departments
          </span>
        </div>
      </div>
    </div>
  )
}
