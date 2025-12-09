"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { TrendingUp } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, PESO_SIGN } from "@/lib/utils"

interface PayrollDataPoint {
  date: string
  gross: number
  net: number
}

interface PayrollAreaChartProps {
  data: PayrollDataPoint[]
  className?: string
}

const chartConfig = {
  payroll: {
    label: "Payroll",
  },
  gross: {
    label: "Gross Pay",
    color: "oklch(0.65 0.18 175)", // Teal
  },
  net: {
    label: "Net Pay",
    color: "oklch(0.6 0.16 145)", // Emerald green
  },
} satisfies ChartConfig

export function PayrollAreaChart({ data, className }: PayrollAreaChartProps) {
  const [timeRange, setTimeRange] = React.useState("90d")

  const filteredData = React.useMemo(() => {
    return data.filter((item) => {
      const date = new Date(item.date)
      const referenceDate = new Date(data[data.length - 1]?.date || new Date())
      let daysToSubtract = 90
      if (timeRange === "30d") {
        daysToSubtract = 30
      } else if (timeRange === "7d") {
        daysToSubtract = 7
      }
      const startDate = new Date(referenceDate)
      startDate.setDate(startDate.getDate() - daysToSubtract)
      return date >= startDate
    })
  }, [data, timeRange])

  return (
    <Card className={`pt-0 overflow-hidden border-border/50 ${className || ""}`}>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            Monthly Payroll Trend
          </CardTitle>
          <CardDescription>Showing gross and net payroll for the selected period</CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex" aria-label="Select a value">
            <SelectValue placeholder="Last 3 months" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">
              Last 3 months
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Last 30 days
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Last 7 days
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillGross" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.65 0.18 175)" stopOpacity={0.6} />
                <stop offset="95%" stopColor="oklch(0.65 0.18 175)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillNet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.6 0.16 145)" stopOpacity={0.6} />
                <stop offset="95%" stopColor="oklch(0.6 0.16 145)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${PESO_SIGN}${(value / 1000).toFixed(0)}k`}
              width={50}
            />
            <ChartTooltip
              cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "4 4" }}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  }}
                  formatter={(value, name) => (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{name === "gross" ? "Gross Pay" : "Net Pay"}:</span>
                      <span className="font-semibold">{formatCurrency(value as number)}</span>
                    </div>
                  )}
                  indicator="dot"
                />
              }
            />
            <Area dataKey="net" type="monotone" fill="url(#fillNet)" stroke="oklch(0.6 0.16 145)" strokeWidth={2.5} />
            <Area
              dataKey="gross"
              type="monotone"
              fill="url(#fillGross)"
              stroke="oklch(0.65 0.18 175)"
              strokeWidth={2.5}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
