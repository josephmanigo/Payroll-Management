import type { SVGProps } from "react"

export function PesoSign(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 19V5" />
      <path d="M6 9h8a4 4 0 0 1 0 8H6" />
      <path d="M4 8h12" />
      <path d="M4 11h12" />
    </svg>
  )
}
