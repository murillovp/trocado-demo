import type { CSSProperties } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/** Toasts speak in the app's font, radius and colours; success is the positive green, errors the destructive red. */
const THEME_STYLE = {
  fontFamily: "var(--font-sans)",
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--border-radius": "var(--radius)",
  "--success-bg": "color-mix(in oklab, var(--positive) 10%, var(--popover))",
  "--success-text": "var(--positive)",
  "--success-border": "color-mix(in oklab, var(--positive) 30%, var(--popover))",
  "--error-bg": "color-mix(in oklab, var(--destructive) 10%, var(--popover))",
  "--error-text": "var(--destructive)",
  "--error-border": "color-mix(in oklab, var(--destructive) 30%, var(--popover))",
} as CSSProperties

export function Toaster({ style, ...props }: ToasterProps) {
  return <Sonner position="top-center" richColors style={{ ...THEME_STYLE, ...style }} {...props} />
}
