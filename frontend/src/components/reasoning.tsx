"use client";

interface ReasoningProps {
  memo: string;
}

export function Reasoning({ memo }: ReasoningProps) {
  const paragraphs = memo.split(/\n\n+/).filter(Boolean);

  return (
    <section className="rounded-[24px] border border-white/10 bg-[#0d1117]/80 p-5">
      <div className="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-[#8b949e]">Investment memo</div>
      <div className="space-y-4 text-sm leading-8 text-[#8b949e]">
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
        ) : (
          <p>No reasoning memo was provided for this report.</p>
        )}
      </div>
    </section>
  );
}
