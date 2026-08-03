import * as React from "react"

export interface Size {
  width: number
  height: number
}

export function useSize<T extends HTMLElement>(
  ref: React.RefObject<T | null>
): Size | null {
  const [size, setSize] = React.useState<Size | null>(null)

  React.useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const updateSize = () => {
      setSize({
        width: element.offsetWidth,
        height: element.offsetHeight,
      })
    }

    // Primeira medição imediata antes da pintura na tela
    updateSize()

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return

      const borderBox = entry.borderBoxSize?.[0]

      if (borderBox) {
        setSize({
          width: borderBox.inlineSize,
          height: borderBox.blockSize,
        })
      } else {
        // Fallback para navegadores sem suporte completo a borderBoxSize
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [ref])

  return size
}