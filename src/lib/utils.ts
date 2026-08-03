import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utilitário para mesclar classes CSS dinamicamente com Tailwind e clsx.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Verifica se a aplicação está sendo executada dentro de um iframe.
 */
export const isIframe: boolean =
  typeof window !== "undefined" && window.self !== window.top