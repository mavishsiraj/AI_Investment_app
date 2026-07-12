import { Badge } from "@/components/ui/badge";

interface DataCoverageBadgeProps {
  dataSources: string[];
}

const TOTAL_DATA_SOURCES = 5;
const LIMITED_THRESHOLD = 3;

/**
 * data-coverage-badge.tsx
 *
 * Previously surfaced the source list only via a native `title` tooltip,
 * unreachable on touch devices and easy to miss on desktop. The source
 * list is now exposed as visible text on hover/focus via <details>, so
 * it's keyboard- and touch-accessible.
 */
export function DataCoverageBadge({ dataSources }: DataCoverageBadgeProps) {
  const count = dataSources.length;
  const limited = count < LIMITED_THRESHOLD;

  return (
    <details className="group relative">
      <summary className="list-none">
        <Badge variant={limited ? "warning" : "neutral"} className="cursor-pointer select-none">
          <span className="font-mono tabular-nums">
            {count}/{TOTAL_DATA_SOURCES} data sources
          </span>
          {limited && <span>· Limited analysis</span>}
        </Badge>
      </summary>
      <div className="absolute right-0 top-full z-10 mt-2 w-56 rounded-md border border-border bg-surface-elevated p-3 text-xs text-foreground-muted shadow-card">
        {dataSources.length > 0 ? dataSources.join(", ") : "No data sources returned data"}
      </div>
    </details>
  );
}
