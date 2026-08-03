import React, { createContext, useContext, useState } from 'react';

interface AlertDialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AlertDialogContext = createContext<AlertDialogContextType | null>(null);

export function AlertDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

export function AlertDialogTrigger({ children }: { children: React.ReactNode; asChild?: boolean }) {
  const ctx = useContext(AlertDialogContext);
  if (!ctx) return null;

  return (
    <span onClick={() => ctx.setOpen(true)} className="cursor-pointer inline-block">
      {children}
    </span>
  );
}

export function AlertDialogContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ctx = useContext(AlertDialogContext);
  if (!ctx || !ctx.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
      <div
        className={`w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-gray-200 dark:border-gray-800 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function AlertDialogHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-col space-y-2 text-center sm:text-left ${className}`}>{children}</div>;
}

export function AlertDialogFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 ${className}`}>{children}</div>;
}

export function AlertDialogTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-lg font-semibold text-gray-900 dark:text-gray-100 ${className}`}>{children}</h2>;
}

export function AlertDialogDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>{children}</p>;
}

export function AlertDialogAction({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const ctx = useContext(AlertDialogContext);

  const handleClick = () => {
    if (onClick) onClick();
    ctx?.setOpen(false);
  };

  return (
    <button
      onClick={handleClick}
      className={`btn-primary px-4 py-2 text-sm font-medium ${className}`}
    >
      {children}
    </button>
  );
}

export function AlertDialogCancel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ctx = useContext(AlertDialogContext);

  return (
    <button
      onClick={() => ctx?.setOpen(false)}
      className={`btn-ghost px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-700 ${className}`}
    >
      {children}
    </button>
  );
}