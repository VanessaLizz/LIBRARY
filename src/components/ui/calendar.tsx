import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export type CalendarProps = {
  className?: string
  selected?: Date
  onSelect?: (date: Date) => void
}

export function Calendar({ className, selected, onSelect }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    selected || new Date()
  )

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate()

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay()

  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    )
  }

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    )
  }

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ]

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const paddingDays = Array.from({ length: firstDayOfMonth }, (_, i) => i)

  const isSameDay = (d1: Date, dayNumber: number) => {
    if (!d1) return false
    return (
      d1.getDate() === dayNumber &&
      d1.getMonth() === currentMonth.getMonth() &&
      d1.getFullYear() === currentMonth.getFullYear()
    )
  }

  return (
    <div className={cn("p-3 w-fit bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800", className)}>
      <div className="flex items-center justify-between pb-3">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-slate-800"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-slate-800"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="w-8 h-8 flex items-center justify-center">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {paddingDays.map((_, i) => (
          <div key={`pad-${i}`} className="w-8 h-8" />
        ))}
        {days.map((day) => {
          const isSelected = selected && isSameDay(selected, day)
          return (
            <button
              key={day}
              type="button"
              onClick={() => {
                const date = new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth(),
                  day
                )
                onSelect?.(date)
              }}
              className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center text-sm transition-colors",
                isSelected
                  ? "bg-brand-600 text-white hover:bg-brand-700 font-semibold"
                  : "hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-900 dark:text-gray-100"
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}