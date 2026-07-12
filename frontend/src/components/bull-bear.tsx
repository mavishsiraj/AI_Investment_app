"use client";

interface BullBearProps {
  bullCase: string[];
  bearCase: string[];
}

export function BullBear({ bullCase, bearCase }: BullBearProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-[24px] border border-[#3fb950]/20 bg-[#3fb950]/10 p-5">
        <div className="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-[#3fb950]">Bull case</div>
        <ul className="space-y-3">
          {bullCase.map((point) => (
            <li key={point} className="rounded-2xl border border-[#3fb950]/20 bg-[#0d1117]/60 p-3 text-sm leading-6 text-[#e6edf3]">
              + {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-[24px] border border-[#f85149]/20 bg-[#f85149]/10 p-5">
        <div className="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-[#f85149]">Bear case</div>
        <ul className="space-y-3">
          {bearCase.map((point) => (
            <li key={point} className="rounded-2xl border border-[#f85149]/20 bg-[#0d1117]/60 p-3 text-sm leading-6 text-[#e6edf3]">
              − {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
