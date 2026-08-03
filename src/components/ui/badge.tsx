import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline"
}

function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantStyles = {
    default:
      "border-transparent bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
    secondary:
      "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-100 dark:hover:bg-slate-700",
    destructive:
      "border-transparent bg-red-600 text-white hover:bg-red-700 shadow-sm",
    outline:
      "border-gray-200 text-gray-900 dark:border-gray-800 dark:text-gray-100",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }