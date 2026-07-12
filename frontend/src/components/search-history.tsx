"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { StatusIndicator, type StatusLevel } from "@/components/ui/status-indicator";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "research-search-history";
const MAX_ENTRIES = 12;

export interface SearchHistoryEntry {
  companyName: string;
  symbol: string | null;
  /** null covers both "still running" and "errored before a verdict existed" — rendered as neutral either way. */
  decision: "INVEST" | "PASS" | null;
  timestamp: string;
}

/**
 * search-history.tsx
 *
 * localStorage is read/written defensively throughout: private-browsing
 * mode, disabled storage, or a quota error should degrade to "no history"
 * rather than crash the page. Entries are deduped by company name
 * (case-insensitive), most recent first, capped at 12.
 */
export function readSearchHistory(): SearchHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SearchHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function recordSearchHistory(entry: SearchHistoryEntry): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readSearchHistory().filter(
      (item) => item.companyName.toLowerCase() !== entry.companyName.toLowerCase()
    );
    const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Storage unavailable or full — searching still works, just without history.
  }
}

interface SearchHistoryProps {
  onSelect: (companyName: string) => void;
  /** Bump this after a search reaches a terminal state to force a re-read from localStorage. */
  refreshKey: number;
}

const decisionLevel: Record<string, StatusLevel> = {
  INVEST: "positive",
  PASS: "negative",
};

export function SearchHistory({ onSelect, refreshKey }: SearchHistoryProps) {
  const [entries, setEntries] = useState<SearchHistoryEntry[]>([]);

  useEffect(() => {
    setEntries(readSearchHistory());
  }, [refreshKey]);

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-6">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-label text-foreground-muted">
        <History className="h-3.5 w-3.5" aria-hidden="true" />
        Recent searches
      </div>
      <ul className="flex flex-wrap gap-2">
        {entries.map((entry) => (
          <li key={`${entry.companyName}-${entry.timestamp}`}>
            <button
              type="button"
              onClick={() => onSelect(entry.companyName)}
              className={cn(
                "flex items-center gap-2 rounded-full border border-border bg-white/[0.03] px-3 py-1.5 text-sm text-foreground-muted",
                "transition-colors hover:border-accent/40 hover:text-foreground"
              )}
            >
              <StatusIndicator level={(entry.decision && decisionLevel[entry.decision]) || "neutral"} />
              {entry.companyName}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
