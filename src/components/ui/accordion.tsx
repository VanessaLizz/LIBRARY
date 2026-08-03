import React, { useState, createContext, useContext } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionContextType {
  openValue: string | null;
  toggle: (value: string) => void;
}

const AccordionContext = createContext<AccordionContextType | null>(null);

interface AccordionProps {
  children: React.ReactNode;
  type?: 'single';
  collapsible?: boolean;
  className?: string;
  defaultValue?: string | null;
}

export function Accordion({ children, className = '', defaultValue = null }: AccordionProps) {
  const [openValue, setOpenValue] = useState<string | null>(defaultValue);

  const toggle = (value: string) => {
    setOpenValue((prev) => (prev === value ? null : value));
  };

  return (
    <AccordionContext.Provider value={{ openValue, toggle }}>
      <div className={`divide-y divide-gray-200 dark:divide-gray-800 ${className}`}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

const AccordionItemContext = createContext<{ value: string }>({ value: '' });

export function AccordionItem({ value, children, className = '' }: AccordionItemProps) {
  return (
    <AccordionItemContext.Provider value={{ value }}>
      <div className={`border-b border-gray-200 dark:border-gray-800 ${className}`}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

interface AccordionTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export function AccordionTrigger({ children, className = '' }: AccordionTriggerProps) {
  const ctx = useContext(AccordionContext);
  const itemCtx = useContext(AccordionItemContext);

  if (!ctx) throw new Error('AccordionTrigger deve estar dentro de Accordion');

  const isOpen = ctx.openValue === itemCtx.value;

  return (
    <button
      type="button"
      onClick={() => ctx.toggle(itemCtx.value)}
      className={`flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline text-left w-full ${className}`}
    >
      {children}
      <ChevronDown
        className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 ${
          isOpen ? 'rotate-180' : ''
        }`}
      />
    </button>
  );
}

interface AccordionContentProps {
  children: React.ReactNode;
  className?: string;
}

export function AccordionContent({ children, className = '' }: AccordionContentProps) {
  const ctx = useContext(AccordionContext);
  const itemCtx = useContext(AccordionItemContext);

  if (!ctx) throw new Error('AccordionContent deve estar dentro de Accordion');

  const isOpen = ctx.openValue === itemCtx.value;

  if (!isOpen) return null;

  return (
    <div className={`pb-4 pt-0 text-sm animate-fade-in ${className}`}>
      {children}
    </div>
  );
}