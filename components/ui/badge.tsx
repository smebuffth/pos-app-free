// components/ui/badge.tsx (shadcn): the one Badge for every status, count, kind and eyebrow.
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// 24 px pill, 12 px medium text. 8% tints keep the text at WCAG AA 4.5:1 in every preset.
const badgeVariants = cva(
  "inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 rounded-full px-2.5 text-xs font-medium whitespace-nowrap [&>svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "bg-secondary text-secondary-foreground ring-1 ring-inset ring-border",
        primary: "bg-primary/8 text-primary-text",
        success: "bg-success/8 text-success",
        warning: "bg-warning/8 text-warning",
        danger: "bg-destructive/8 text-destructive",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
)

function Badge({ className, tone, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props} />
}

export { Badge, badgeVariants }
