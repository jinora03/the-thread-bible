import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useTheme } from "@/components/theme-provider"

/** Toast feedback (copy, bookmark, note saved). Sonner provides the live region. */
function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={resolvedTheme}
      position="bottom-center"
      offset={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      mobileOffset={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
      style={
        {
          "--normal-bg": "var(--foreground)",
          "--normal-text": "var(--background)",
          "--normal-border": "transparent",
          "--border-radius": "var(--radius-md)",
        } as React.CSSProperties
      }
      toastOptions={{ classNames: { toast: "font-sans text-sm" } }}
      {...props}
    />
  )
}

export { Toaster }
