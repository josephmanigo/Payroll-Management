"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { PageLoader } from "@/components/ui/page-loader"

interface LoadingContextType {
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

const LoadingContext = createContext<LoadingContextType>({
  isLoading: false,
  setIsLoading: () => {},
})

export const useLoading = () => useContext(LoadingContext)

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const pathname = usePathname()
  const previousPathname = useRef(pathname)
  const isFirstRender = useRef(true)

  // Initial page load - show loader briefly
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
      isFirstRender.current = false
    }, 800)

    return () => clearTimeout(timer)
  }, [])

  // Route change detection - only trigger on pathname changes
  useEffect(() => {
    // Skip if first render or same pathname
    if (isFirstRender.current || previousPathname.current === pathname) {
      return
    }

    previousPathname.current = pathname
    setIsLoading(true)

    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 400)

    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {isLoading && <PageLoader />}
      {children}
    </LoadingContext.Provider>
  )
}
