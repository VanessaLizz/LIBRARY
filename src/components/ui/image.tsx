"use client"

import * as React from "react"
import { useSize } from "@/hooks/use-size"
import { cn } from "@/lib/utils"

const FALLBACK_IMAGE_URL =
  "https://static.wixstatic.com/media/12d367_4f26ccd17f8f4e3a8958306ea08c2332~mv2.png"

const WIX_MEDIA_HOSTS = ["media.base44.com", "static.wixstatic.com"]
const DEFAULT_TRANSFORM_WIDTH = 1024
const DEVICE_PIXEL_RATIOS = [1, 2, 3]
const MAX_DIMENSION = 6000

export interface WixParsedUrl {
  baseUrl: string
  filename: string
}

export interface FocalPoint {
  x: number
  y: number
}

export interface TransformOptions {
  width: number
  height?: number
  crop?: boolean
  focalPoint?: FocalPoint
  quality: number
}

/**
 * Detecta uma URL da Wix Media e remove a transformação /v1/ existente para reconstruí-la.
 */
function parseWixMediaUrl(src: string): WixParsedUrl | null {
  try {
    const url = new URL(src)
    if (!WIX_MEDIA_HOSTS.includes(url.hostname)) return null
    const v1 = url.pathname.indexOf("/v1/")
    const basePath = v1 === -1 ? url.pathname : url.pathname.slice(0, v1)
    const filename = basePath.split("/").pop()
    if (!filename || /\.svg$/i.test(filename)) return null
    return { baseUrl: `${url.origin}${basePath}`, filename }
  } catch {
    return null
  }
}

const clampDim = (n: number) =>
  Math.min(Math.max(Math.round(n), 1), MAX_DIMENSION)
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/**
 * Constrói a URL de transformação da Wix Media.
 */
function buildTransformUrl(
  parsed: WixParsedUrl,
  { width, height, crop, focalPoint, quality }: TransformOptions
): string {
  const params = [`w_${clampDim(width)}`, `h_${clampDim(height || width)}`]
  if (crop) {
    params.push(
      focalPoint
        ? `fp_${clamp01(focalPoint.x).toFixed(2)}_${clamp01(focalPoint.y).toFixed(2)}`
        : "al_c"
    )
  }
  params.push(`q_${quality}`, "usm_0.66_1.00_0.01", "enc_webp", "quality_auto")
  const outputName = /\.gif$/i.test(parsed.filename)
    ? parsed.filename
    : parsed.filename.replace(/\.[a-z0-9]+$/i, "") + ".webp"
  return `${parsed.baseUrl}/v1/${crop ? "fill" : "fit"}/${params.join(",")}/${outputName}`
}

function buildSrcSet(parsed: WixParsedUrl, options: TransformOptions): string {
  return DEVICE_PIXEL_RATIOS.map(
    (dpr) =>
      `${buildTransformUrl(parsed, {
        ...options,
        width: options.width * dpr,
        height: options.height ? options.height * dpr : undefined,
      })} ${dpr}x`
  ).join(", ")
}

interface ImageWrapperProps extends React.HTMLAttributes<HTMLSpanElement> {
  aspectRatio?: string
}

const ImageWrapper = React.forwardRef<HTMLSpanElement, ImageWrapperProps>(
  ({ aspectRatio, className, style, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("inline-block relative", className)}
      style={{ aspectRatio, ...style }}
      {...props}
    >
      {children}
    </span>
  )
)
ImageWrapper.displayName = "ImageWrapper"

interface ResponsiveImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  parsed: WixParsedUrl
  fittingType?: "fill" | "fit"
  focalPoint?: FocalPoint
  quality: number
  aspectRatio?: string
}

const ResponsiveImage = React.forwardRef<
  HTMLImageElement,
  ResponsiveImageProps
>(
  (
    {
      parsed,
      fittingType,
      focalPoint,
      quality,
      className,
      style,
      aspectRatio,
      onLoad,
      ...props
    },
    parentRef
  ) => {
    const wrapperRef = React.useRef<HTMLSpanElement>(null)
    const imgRef = React.useRef<HTMLImageElement>(null)
    const size = useSize(wrapperRef)
    const [loaded, setLoaded] = React.useState(false)

    React.useImperativeHandle(parentRef, () => imgRef.current!)

    React.useEffect(() => {
      setLoaded(false)
    }, [parsed.baseUrl])

    const crop = fittingType !== "fit"
    const options: TransformOptions | null = size
      ? {
          width: size.width || DEFAULT_TRANSFORM_WIDTH,
          height: size.height ? size.height : undefined,
          crop,
          focalPoint: crop ? focalPoint : undefined,
          quality,
        }
      : null

    return (
      <ImageWrapper
        ref={wrapperRef}
        aspectRatio={aspectRatio}
        className={className}
        style={style}
      >
        {options && !loaded && (
          <img
            src={buildTransformUrl(parsed, {
              ...options,
              width: 20,
              height: options.height
                ? Math.max(1, Math.round((20 * options.height) / options.width))
                : undefined,
              quality: 20,
            })}
            alt=""
            aria-hidden="true"
            className="w-full h-full inset-0 absolute"
            style={{
              objectFit: fittingType === "fit" ? "contain" : "cover",
              filter: "blur(10px)",
              transform: "scale(1.1)",
            }}
          />
        )}
        {options && (
          <img
            ref={imgRef}
            src={buildTransformUrl(parsed, options)}
            srcSet={buildSrcSet(parsed, options)}
            loading="lazy"
            className={cn(
              "w-full h-full inset-0 absolute",
              fittingType === "fit" ? "object-contain" : "object-cover"
            )}
            onLoad={(e) => {
              setLoaded(true)
              onLoad?.(e)
            }}
            {...props}
          />
        )}
      </ImageWrapper>
    )
  }
)
ResponsiveImage.displayName = "ResponsiveImage"

export interface ImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null
  fittingType?: "fill" | "fit"
  originWidth?: number
  originHeight?: number
  focalPointX?: number
  focalPointY?: number
  quality?: number
}

const Image = React.forwardRef<HTMLImageElement, ImageProps>(
  (
    {
      src,
      fittingType = "fill",
      originWidth,
      originHeight,
      focalPointX,
      focalPointY,
      quality = 90,
      ...props
    },
    ref
  ) => {
    const [imgSrc, setImgSrc] = React.useState<string | undefined>(
      src || undefined
    )

    React.useEffect(() => {
      setImgSrc(src || undefined)
    }, [src])

    const imageProps = {
      ...props,
      onError: () => setImgSrc(FALLBACK_IMAGE_URL),
    }

    if (!src) {
      return (
        <img
          ref={ref}
          src={FALLBACK_IMAGE_URL}
          {...imageProps}
          data-empty-image
        />
      )
    }

    const parsed =
      imgSrc === FALLBACK_IMAGE_URL ? null : parseWixMediaUrl(imgSrc || "")

    if (!parsed) {
      const isErrorUrl = imgSrc === FALLBACK_IMAGE_URL
      return (
        <img
          ref={ref}
          src={imgSrc}
          {...imageProps}
          data-error-image={isErrorUrl || undefined}
        />
      )
    }

    const focalPoint =
      typeof focalPointX === "number" && typeof focalPointY === "number"
        ? { x: focalPointX, y: focalPointY }
        : undefined

    const aspectRatio =
      originWidth && originHeight ? `${originWidth} / ${originHeight}` : undefined

    return (
      <ResponsiveImage
        ref={ref}
        parsed={parsed}
        fittingType={fittingType}
        focalPoint={focalPoint}
        quality={quality}
        aspectRatio={aspectRatio}
        {...imageProps}
      />
    )
  }
)
Image.displayName = "Image"

export { Image }