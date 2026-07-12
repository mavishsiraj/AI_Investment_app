"use client";

import { motion } from "framer-motion";
import { BarChart3, ShieldCheck, Sparkles } from "lucide-react";
import { SearchBar } from "@/components/search-bar";

interface HeroProps {
  onSearch: (companyName: string) => void;
  disabled: boolean;
}

const exampleTickers = ["NVIDIA", "Infosys", "Tesla", "Microsoft", "AMD"];

const howItWorks = [
  {
    title: "Live market context",
    description: "Company data, technicals, and recent market signals pulled into a single view.",
    icon: BarChart3,
  },
  {
    title: "Evidence-based scoring",
    description: "A verdict blending deterministic scores with structured synthesis and narrative reasoning.",
    icon: ShieldCheck,
  },
  {
    title: "Decision-ready memo",
    description: "An invest/pass opinion, risk framing, and a concise investment memo.",
    icon: Sparkles,
  },
];

/**
 * hero.tsx
 *
 * Search is the hero, per design brief: large, centered, minimal chrome
 * around it. "How it works" is a light three-up row beneath — informative
 * on first visit, but not competing with the search field for attention.
 */
export function Hero({ onSearch, disabled }: HeroProps) {
  return (
    <section className="flex flex-col items-center gap-10 px-2 pb-4 pt-10 text-center sm:pt-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex max-w-2xl flex-col items-center gap-5"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-muted px-3 py-1 text-xs font-medium uppercase tracking-label text-accent">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          AI investment research agent
        </div>

        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
          Bloomberg-grade research in a single prompt.
        </h1>

        <p className="max-w-xl text-balance text-base leading-7 text-foreground-muted sm:text-lg">
          Investigate any public company with live financial, technical, news, and risk context —
          then get a concise verdict with a memo you can act on.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
        className="w-full max-w-2xl"
      >
        <SearchBar onSearch={onSearch} disabled={disabled} />

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-foreground-faint">Try</span>
          {exampleTickers.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onSearch(example)}
              disabled={disabled}
              className="rounded-full border border-border bg-white/[0.03] px-3 py-1.5 text-sm text-foreground-muted transition-colors hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {example}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.16, ease: "easeOut" }}
        className="grid w-full max-w-4xl gap-4 pt-2 text-left sm:grid-cols-3"
      >
        {howItWorks.map((item) => (
          <div key={item.title} className="flex items-start gap-3 rounded-md border border-border bg-white/[0.02] p-4">
            <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <div>
              <div className="text-sm font-medium text-foreground">{item.title}</div>
              <p className="mt-1 text-sm leading-6 text-foreground-muted">{item.description}</p>
            </div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
