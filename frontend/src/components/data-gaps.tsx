"use client";

interface DataGapsProps {
  errors?: string[];
}

export function DataGaps({ errors }: DataGapsProps) {
  if (!errors || errors.length === 0) return null;

  return (
    <section className="rounded-[20px] border border-white/8 bg-white/5 p-4 text-sm text-[#8b949e]">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#484f58]">Data gaps</div>
      <ul className="space-y-1">
        {errors.map((error) => (
          <li key={error}>• {error}</li>
        ))}
      </ul>
    </section>
  );
}
