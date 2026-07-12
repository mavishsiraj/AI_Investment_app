import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Uses the third surface layer + shadow, for content that should sit above the page (verdict banner, confidence panel). */
  elevated?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, elevated, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-md border border-border p-5",
        elevated ? "bg-surface-elevated shadow-card" : "bg-surface",
        className
      )}
      {...props}
    />
  );
});

export function CardLabel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "text-xs font-medium uppercase tracking-label text-foreground-muted",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-1 text-lg font-semibold text-foreground", className)}
      {...props}
    />
  );
}
