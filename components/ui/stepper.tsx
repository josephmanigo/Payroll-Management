"use client"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Step {
  id: string
  title: string
  description?: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  onStepClick?: (stepIndex: number) => void
  className?: string
}

export function Stepper({ steps, currentStep, onStepClick, className }: StepperProps) {
  return (
    <nav aria-label="Progress" className={cn("w-full", className)}>
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const isClickable = onStepClick && (isCompleted || index === currentStep + 1)

          return (
            <li key={step.id} className="relative flex flex-1 items-center">
              {index > 0 && (
                <div
                  className={cn(
                    "absolute left-0 top-4 -translate-x-1/2 h-0.5 w-full -ml-2",
                    isCompleted || isCurrent ? "bg-primary" : "bg-border",
                  )}
                  style={{ width: "calc(100% - 2rem)", left: "-50%" }}
                />
              )}
              <div className="relative flex flex-col items-center group">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick?.(index)}
                  disabled={!isClickable}
                  className={cn(
                    "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-200",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary bg-background text-primary",
                    !isCompleted && !isCurrent && "border-border bg-background text-muted-foreground",
                    isClickable && "cursor-pointer hover:scale-110",
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </button>
                <div className="mt-2 text-center">
                  <p className={cn("text-sm font-medium", isCurrent ? "text-foreground" : "text-muted-foreground")}>
                    {step.title}
                  </p>
                  {step.description && <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
