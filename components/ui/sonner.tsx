"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

// One static theme: the app ships a single preset and has no theme switcher. Sonner slides in from the bottom edge on phones
// and from the corner on desktop.
const Toaster = (props: ToasterProps) => (
  <Sonner
    theme="light"
    position="bottom-right"
    duration={4000}
    className="toaster group"
    style={
      {
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",
        "--border-radius": "var(--radius)",
      } as React.CSSProperties
    }
    {...props}
  />
)

export { Toaster }
