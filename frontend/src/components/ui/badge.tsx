import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "border-border bg-white/[0.03] text-foreground-muted",
        accent: "border-accent/25 bg-accent-muted text-accent",
        positive: "border-positive/25 bg-positive-muted text-positive",
        negative: "border-negative/25 bg-negative-muted text-negative",
        warning: "border-warning/25 bg-warning-muted text-warning",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
