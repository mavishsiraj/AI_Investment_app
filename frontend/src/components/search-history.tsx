"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "research-search-history";
const MAX_ENTRIES = 12;

export interface SearchHistoryEntry {
  companyName: string;
  symbol: string | null;
  /** null covers both "still running" and "errored before a verdict existed" — rendered as a neutral dot either way. */
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

export function SearchHistory({ onSelect, refreshKey }: SearchHistoryProps) {
  const [entries, setEntries] = useState<SearchHistoryEntry[]>([]);

  useEffect(() => {
    setEntries(readSearchHistory());
  }, [refreshKey]);

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-neutral-400">Recent searches</h2>
      <ul className="flex flex-wrap gap-2">
        {entries.map((entry) => (
          <li key={`${entry.companyName}-${entry.timestamp}`}>
            <button
              type="button"
              onClick={() => onSelect(entry.companyName)}
              className="flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-200 transition hover:border-amber-600"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  entry.decision === "INVEST"
                    ? "bg-green-500"
                    : entry.decision === "PASS"
                      ? "bg-red-500"
                      : "bg-neutral-600"
                }`}
                aria-hidden="true"
              />
              {entry.companyName}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
