"use client";

import { ArrowRight, BarChart3, ShieldCheck, Sparkles } from "lucide-react";
import { SearchBar } from "@/components/search-bar";

interface HeroProps {
  onSearch: (companyName: string) => void;
  disabled: boolean;
}

const exampleTickers = ["NVIDIA", "Infosys", "Tesla", "Microsoft", "AMD"];
const howItWorks = [
  {
    title: "Live market context",
    description: "We pull company data, technicals, and recent market signals into a single view.",
  },
  {
    title: "Evidence-based scoring",
    description: "The verdict blends deterministic scores with structured synthesis and narrative reasoning.",
  },
  {
    title: "Decision-ready memo",
    description: "You get an invest/pass opinion, risk framing, and a concise investment memo.",
  },
];

export function Hero({ onSearch, disabled }: HeroProps) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(211,153,34,0.14),_transparent_38%),linear-gradient(135deg,rgba(13,17,23,0.96),rgba(6,8,14,0.98))] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] sm:p-8 lg:p-10">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-amber-300">
            <Sparkles className="h-3.5 w-3.5" />
            AI investment research agent
          </div>

          <div className="space-y-4">
            <h2 className="max-w-2xl text-4xl font-semibold tracking-tight text-[#e6edf3] sm:text-5xl">
              Bloomberg-grade research in a single prompt.
            </h2>
            <p className="max-w-xl text-base leading-7 text-[#8b949e] sm:text-lg">
              Investigate public companies with live financial, technical, news, and risk context — then
              receive a concise verdict with a memo you can act on.
            </p>
          </div>

          <SearchBar onSearch={onSearch} disabled={disabled} />

          <div className="flex flex-wrap gap-2">
            {exampleTickers.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => onSearch(example)}
                disabled={disabled}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-[#8b949e] transition hover:border-amber-400/40 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-[#0d1117]/80 p-5 backdrop-blur">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.3em] text-[#8b949e]">
            <BarChart3 className="h-4 w-4 text-amber-400" />
            How it works
          </div>
          <div className="space-y-3">
            {howItWorks.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#e6edf3]">
                  <ShieldCheck className="h-4 w-4 text-[#3fb950]" />
                  {item.title}
                </div>
                <p className="text-sm leading-6 text-[#8b949e]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
