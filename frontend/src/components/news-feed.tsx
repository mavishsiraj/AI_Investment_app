"use client";

import type { ResearchReport } from "@/agents/types";

interface NewsFeedProps {
  report: ResearchReport;
}

/**
 * news-feed.tsx
 *
 * Renders report.rawNews (real NewsAPI articles) and report.sentiment (the
 * LLM's synthesis over those exact articles) — never sample/invented
 * headlines. If NEWSAPI_KEY is missing or the request failed, rawNews is
 * empty and sentiment defaults to neutral (per synthesize.ts's fallback);
 * this component shows that explicitly rather than a hardcoded feed.
 */

const overallStyles: Record<string, string> = {
  bullish: "border-[#3fb950]/20 bg-[#3fb950]/10 text-[#3fb950]",
  bearish: "border-[#f85149]/20 bg-[#f85149]/10 text-[#f85149]",
  neutral: "border-white/10 bg-white/5 text-[#8b949e]",
};

const perArticleDot: Record<string, string> = {
  bullish: "bg-[#3fb950]",
  bearish: "bg-[#f85149]",
  neutral: "bg-[#8b949e]",
};

export function NewsFeed({ report }: NewsFeedProps) {
  const { rawNews, sentiment } = report;
  const overall = sentiment?.overall ?? "neutral";
  const perArticleByIndex = new Map(sentiment?.perArticle.map((item) => [item.index, item.sentiment]) ?? []);

  return (
    <section className="rounded-[24px] border border-white/10 bg-[#0d1117]/80 p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium uppercase tracking-[0.3em] text-[#8b949e]">News & sentiment</div>
          <div className="mt-1 text-lg font-semibold text-[#e6edf3]">{report.companyName}</div>
        </div>
        <div className={`inline-block w-fit rounded-full border px-3 py-1 text-sm font-medium capitalize ${overallStyles[overall]}`}>
          {overall}
        </div>
      </div>

      {sentiment && sentiment.themes.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {sentiment.themes.map((theme) => (
            <span key={theme} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-[#8b949e]">
              {theme}
            </span>
          ))}
        </div>
      )}

      {rawNews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-[#8b949e]">
          No news articles available — either NEWSAPI_KEY isn&apos;t configured or no recent coverage was found.
          Sentiment defaults to neutral without news data.
        </div>
      ) : (
        <div className="space-y-3">
          {rawNews.map((article, index) => {
            const articleSentiment = perArticleByIndex.get(index) ?? "neutral";
            return (
              <a
                key={article.url}
                href={article.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-2xl border border-white/8 bg-white/5 p-3 transition hover:border-white/20"
              >
                <div className="flex items-start gap-2">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${perArticleDot[articleSentiment]}`} />
                  <div className="text-sm font-medium text-[#e6edf3]">{article.title}</div>
                </div>
                <div className="mt-1 pl-4 text-sm text-[#8b949e]">{article.source}</div>
              </a>
            );
          })}
        </div>
      )}

      {sentiment && (
        <div className="mt-5 rounded-2xl border border-white/8 bg-[#161b22]/70 p-4 text-sm leading-7 text-[#8b949e]">
          {sentiment.analysis}
        </div>
      )}
    </section>
  );
}
