import { useState } from "react"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"

export function CollapsibleSection() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="p-6 max-w-md mx-auto">
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="w-full border rounded-lg p-4 bg-white shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">
            Painel Expansível
          </h3>
          <CollapsibleTrigger className="p-2 hover:bg-slate-100 rounded-md transition-colors">
            <ChevronDown
              className={`h-4 w-4 text-slate-600 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600">
          Conteúdo expansível integrado e pronto para uso.
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}