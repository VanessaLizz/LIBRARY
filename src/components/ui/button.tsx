import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",

      ...props
    },
    ref
  ) => {
    const variantStyles = {
      default:
        "bg-brand-600 text-white shadow hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-700",
      destructive:
        "bg-red-600 text-white shadow-sm hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700",
      outline:
        "border border-gray-300 bg-transparent shadow-sm hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:hover:bg-slate-800 dark:hover:text-gray-100",
      secondary:
        "bg-gray-100 text-gray-900 shadow-sm hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-100 dark:hover:bg-slate-700",
      ghost:
        "hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-slate-800 dark:hover:text-gray-100",
      link: "text-brand-600 underline-offset-4 hover:underline dark:text-brand-400",
    }

    const sizeStyles = {
      default: "h-9 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-10 rounded-md px-8",
      icon: "h-9 w-9 p-0",
    }

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }