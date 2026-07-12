import { AlertTriangle, CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusLevel = "positive" | "warning" | "negative" | "neutral";

const config: Record<StatusLevel, { icon: typeof CheckCircle2; className: string; label: string }> = {
  positive: { icon: CheckCircle2, className: "text-positive", label: "Healthy" },
  warning: { icon: AlertTriangle, className: "text-warning", label: "Watch" },
  negative: { icon: XCircle, className: "text-negative", label: "Weak" },
  neutral: { icon: MinusCircle, className: "text-foreground-faint", label: "N/A" },
};

/**
 * status-indicator.tsx
 *
 * Replaces color-only dots (an accessibility issue for color-blind users
 * flagged in the audit) with an icon + color pairing, so status reads even
 * without color.
 */
export function StatusIndicator({ level, className }: { level: StatusLevel; className?: string }) {
  const { icon: Icon, className: colorClass, label } = config[level];
  return (
    <span className={cn("inline-flex items-center", colorClass, className)}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
