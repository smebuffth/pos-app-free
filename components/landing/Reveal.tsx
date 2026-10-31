import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Fades a block up as it scrolls into view, with a CSS scroll-driven animation (.reveal in app/globals.css).
// No JavaScript: the content is visible as rendered, and only browsers that support view timelines animate it.
// "Reduce motion" turns it off.
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("reveal", className)}>{children}</div>;
}
