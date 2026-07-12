"use client";

import { ExternalLink } from "lucide-react";
import type { ResearchReport } from "@/agents/types";
import { Card, CardLabel, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusIndicator, type StatusLevel } from "@/components/ui/status-indicator";

interface NewsFeedProps {
  report: ResearchReport;
}

const overallVariant: Record<string, "positive" | "negative" | "neutral"> = {
  bullish: "positive",
  bearish: "negative",
  neutral: "neutral",
};

const sentimentLevel: Record<string, StatusLevel> = {
  bullish: "positive",
  bearish: "negative",
  neutral: "neutral",
};

/**
 * news-feed.tsx
 *
 * Renders report.rawNews (real NewsAPI articles) and report.sentiment (the
 * LLM's synthesis over those exact articles) — never sample headlines. If
 * NEWSAPI_KEY is missing or the request failed, rawNews is empty and
 * sentiment defaults to neutral; this component shows that explicitly.
 */
export function NewsFeed({ report }: NewsFeedProps) {
  const { rawNews, sentiment } = report;
  const overall = sentiment?.overall ?? "neutral";
  const perArticleByIndex = new Map(sentiment?.perArticle.map((item) => [item.index, item.sentiment]) ?? []);

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardLabel>News &amp; sentiment</CardLabel>
          <CardTitle>{report.companyName}</CardTitle>
        </div>
        <Badge variant={overallVariant[overall]} className="w-fit capitalize">
          {overall}
        </Badge>
      </div>

      {sentiment && sentiment.themes.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {sentiment.themes.map((theme) => (
            <Badge key={theme} variant="neutral">
              {theme}
            </Badge>
          ))}
        </div>
      )}

      {rawNews.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-4 text-sm text-foreground-muted">
          No news articles available — either the news source isn&apos;t configured or no recent coverage was
          found. Sentiment defaults to neutral without news data.
        </div>
      ) : (
        <ul className="space-y-2">
          {rawNews.map((article, index) => {
            const articleSentiment = perArticleByIndex.get(index) ?? "neutral";
            return (
              <li key={article.url}>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-start gap-3 rounded-md border border-border bg-white/[0.02] p-3 transition-colors hover:border-border-strong"
                >
                  <StatusIndicator level={sentimentLevel[articleSentiment] ?? "neutral"} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium leading-6 text-foreground">{article.title}</span>
                      <ExternalLink
                        className="mt-1 h-3.5 w-3.5 shrink-0 text-foreground-faint opacity-0 transition-opacity group-hover:opacity-100"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="mt-0.5 text-xs text-foreground-muted">{article.source}</div>
                    <span className="sr-only"> (opens in a new tab)</span>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      )}

      {sentiment && (
        <p className="mt-5 rounded-md border border-border bg-surface-elevated p-4 text-sm leading-7 text-foreground-muted">
          {sentiment.analysis}
        </p>
      )}
    </Card>
  );
}
