"use client";

import { useState, type FormEvent } from "react";

interface SearchBarProps {
  onSearch: (companyName: string) => void;
  disabled: boolean;
}

const MAX_LENGTH = 100;

/**
 * search-bar.tsx
 *
 * text-base (16px) on the input is deliberate, not a default: iOS Safari
 * auto-zooms the viewport on focus for any input with a computed font-size
 * under 16px, which is jarring on a search-first landing page.
 */
export function SearchBar({ onSearch, disabled }: SearchBarProps) {
  const [value, setValue] = useState("");
  const trimmed = value.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!trimmed || disabled) return;
    onSearch(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2 sm:flex-row">
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled}
        maxLength={MAX_LENGTH}
        placeholder="Company name or ticker (e.g. Apple, AAPL)"
        aria-label="Company name or ticker"
        className="text-base flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !trimmed}
        className="rounded-md bg-amber-600 px-5 py-3 font-medium text-neutral-950 transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {disabled ? "Researching…" : "Research"}
      </button>
    </form>
  );
}
