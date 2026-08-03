import * as React from "react"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface CarouselContextProps {
  carouselRef: React.RefObject<HTMLDivElement | null>
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
  orientation: "horizontal" | "vertical"
}

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)
  if (!context) {
    throw new Error("useCarousel deve ser usado dentro de um <Carousel />")
  }
  return context
}

export interface CarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
}

const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(
  ({ orientation = "horizontal", className, children, ...props }, ref) => {
    const carouselRef = React.useRef<HTMLDivElement>(null)
    const [canScrollPrev, setCanScrollPrev] = React.useState(false)
    const [canScrollNext, setCanScrollNext] = React.useState(true)

    const checkScroll = React.useCallback(() => {
      const el = carouselRef.current
      if (!el) return

      if (orientation === "horizontal") {
        setCanScrollPrev(el.scrollLeft > 0)
        setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
      } else {
        setCanScrollTop(el.scrollTop > 0)
        setCanScrollNext(el.scrollTop + el.clientHeight < el.scrollHeight - 1)
      }
    }, [orientation])

    const setCanScrollTop = (val: boolean) => setCanScrollPrev(val)

    React.useEffect(() => {
      const el = carouselRef.current
      if (!el) return

      checkScroll()
      el.addEventListener("scroll", checkScroll)
      window.addEventListener("resize", checkScroll)

      return () => {
        el.removeEventListener("scroll", checkScroll)
        window.removeEventListener("resize", checkScroll)
      }
    }, [checkScroll])

    const scrollPrev = React.useCallback(() => {
      const el = carouselRef.current
      if (!el) return
      const amount = orientation === "horizontal" ? el.clientWidth : el.clientHeight
      el.scrollBy({
        left: orientation === "horizontal" ? -amount : 0,
        top: orientation === "vertical" ? -amount : 0,
        behavior: "smooth",
      })
    }, [orientation])

    const scrollNext = React.useCallback(() => {
      const el = carouselRef.current
      if (!el) return
      const amount = orientation === "horizontal" ? el.clientWidth : el.clientHeight
      el.scrollBy({
        left: orientation === "horizontal" ? amount : 0,
        top: orientation === "vertical" ? amount : 0,
        behavior: "smooth",
      })
    }, [orientation])

    return (
      <CarouselContext.Provider
        value={{
          carouselRef,
          scrollPrev,
          scrollNext,
          canScrollPrev,
          canScrollNext,
          orientation,
        }}
      >
        <div
          ref={ref}
          className={cn("relative", className)}
          role="region"
          aria-roledescription="carousel"
          {...props}
        >
          {children}
        </div>
      </CarouselContext.Provider>
    )
  }
)
Carousel.displayName = "Carousel"

const CarouselContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
>(({ className, ...props }, ref) => {
  const { carouselRef, orientation } = useCarousel()

  return (
    <div
      ref={carouselRef}
      className={cn(
        "flex scroll-smooth overflow-x-auto scrollbar-none snap-x snap-mandatory",
        orientation === "horizontal" ? "-ml-4 flex-row" : "-mt-4 flex-col overflow-y-auto overflow-x-hidden h-96",
        className
      )}
      style={{ scrollbarWidth: "none" }}
      {...props}
    />
  )
})
CarouselContent.displayName = "CarouselContent"

const CarouselItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { orientation } = useCarousel()

  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="slide"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full snap-start",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className
      )}
      {...props}
    />
  )
})
CarouselItem.displayName = "CarouselItem"

const CarouselPrevious = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        "absolute h-8 w-8 rounded-full z-10",
        orientation === "horizontal"
          ? "-left-12 top-1/2 -translate-y-1/2"
          : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="sr-only">Anterior</span>
    </Button>
  )
})
CarouselPrevious.displayName = "CarouselPrevious"

const CarouselNext = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollNext, canScrollNext } = useCarousel()

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        "absolute h-8 w-8 rounded-full z-10",
        orientation === "horizontal"
          ? "-right-12 top-1/2 -translate-y-1/2"
          : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ArrowRight className="h-4 w-4" />
      <span className="sr-only">Próximo</span>
    </Button>
  )
})
CarouselNext.displayName = "CarouselNext"

export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
}