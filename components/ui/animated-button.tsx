"use client"

import type * as React from "react"
import { cn } from "@/lib/utils"

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: "default" | "outline"
  size?: "default" | "lg"
  fullWidth?: boolean
}

export function AnimatedButton({
  children,
  className,
  variant = "default",
  size = "default",
  fullWidth = false,
  ...props
}: AnimatedButtonProps) {
  return (
    <button
      className={cn(
        "bubbleeffectbtn",
        size === "lg" && "bubbleeffectbtn-lg",
        variant === "outline" && "bubbleeffectbtn-outline",
        fullWidth && "bubbleeffectbtn-full",
        className,
      )}
      {...props}
    >
      <style jsx>{`
        .bubbleeffectbtn {
          min-width: 130px;
          height: 40px;
          color: #fff;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          outline: none;
          border-radius: 8px;
          border: none;
          background: linear-gradient(45deg, #18181b, #27272a);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          z-index: 1;
          overflow: hidden;
          padding: 0 1rem;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .bubbleeffectbtn-lg {
          height: 44px;
          padding: 0 1.5rem;
          font-size: 1rem;
        }

        .bubbleeffectbtn-full {
          width: 100%;
        }

        .bubbleeffectbtn-outline {
          background: transparent;
          border: 1px solid #27272a;
          color: #18181b; /* Changed text color to black for light mode */
        }

        /* Keep text dark on hover since hover background is light */
        .bubbleeffectbtn-outline:hover {
          color: #18181b;
        }

        /* Added dark mode styles for outline button with white text */
        :global(.dark) .bubbleeffectbtn-outline {
          border-color: #fafafa;
          color: #fafafa;
        }

        :global(.dark) .bubbleeffectbtn-outline:hover {
          color: #18181b;
        }

        .bubbleeffectbtn:before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.1),
            rgba(255, 255, 255, 0)
          );
          transform: rotate(45deg);
          transition: all 0.5s ease;
          z-index: -1;
        }

        .bubbleeffectbtn:hover:before {
          top: -100%;
          left: -100%;
        }

        .bubbleeffectbtn:after {
          border-radius: 8px;
          position: absolute;
          content: '';
          width: 0;
          height: 100%;
          top: 0;
          z-index: -1;
          box-shadow:
            inset 2px 2px 2px 0px rgba(255, 255, 255, 0.5),
            7px 7px 20px 0px rgba(0, 0, 0, 0.1),
            4px 4px 5px 0px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          background: linear-gradient(45deg, #27272a, #3f3f46);
          right: 0;
        }

        .bubbleeffectbtn-outline:after {
          background: linear-gradient(45deg, #f4f4f5, #e4e4e7);
        }

        :global(.dark) .bubbleeffectbtn-outline:after {
          background: linear-gradient(45deg, #27272a, #3f3f46);
        }

        .bubbleeffectbtn:hover:after {
          width: 100%;
          left: 0;
        }

        .bubbleeffectbtn:active {
          top: 2px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .bubbleeffectbtn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .bubbleeffectbtn:disabled:hover:before,
        .bubbleeffectbtn:disabled:hover:after {
          width: 0;
          top: -50%;
          left: -50%;
        }
      `}</style>
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  )
}
