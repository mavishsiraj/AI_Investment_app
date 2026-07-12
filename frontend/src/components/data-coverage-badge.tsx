interface DataCoverageBadgeProps {
  dataSources: string[];
}

const TOTAL_DATA_SOURCES = 5;
const LIMITED_THRESHOLD = 3;

export function DataCoverageBadge({ dataSources }: DataCoverageBadgeProps) {
  const count = dataSources.length;
  const limited = count < LIMITED_THRESHOLD;

  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs ${
        limited
          ? "border-amber-700 bg-amber-950/40 text-amber-300"
          : "border-neutral-700 bg-neutral-900 text-neutral-400"
      }`}
      title={dataSources.join(", ") || "No data sources returned data"}
    >
      <span className="font-mono">
        {count}/{TOTAL_DATA_SOURCES} data sources
      </span>
      {limited && <span>— Limited analysis — some data unavailable</span>}
    </div>
  );
}
