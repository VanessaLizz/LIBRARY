import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import {
  BookOpen,
  BarChart3,
  LayoutDashboard,
  Library,
  Download,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

interface NavItem {
  label: string
  path: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Minhas Leituras", path: "/livros", icon: BookOpen },
  { label: "Estante Virtual", path: "/estante", icon: Library },
  { label: "Estatísticas", path: "/estatisticas", icon: BarChart3 },
  { label: "Importar Skoob", path: "/importar", icon: Download },
]

export interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r bg-background px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Leituria</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur md:hidden">
          <div className="flex items-center gap-2 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="font-semibold">Leituria</span>
          </div>
          <nav className="flex gap-1 border-t px-2 py-2">
            {navItems.map((item) => {
              const active = location.pathname === item.path
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label.split(" ")[0]}
                </Link>
              )
            })}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}