"use client";

import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-foreground-faint"
          aria-hidden="true"
        />
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={disabled}
          maxLength={MAX_LENGTH}
          placeholder="Company name or ticker — try Apple, NVDA, Infosys…"
          aria-label="Company name or ticker"
          className={cn(
            "h-14 w-full rounded-md border border-border bg-surface pl-11 pr-4 text-base text-foreground",
            "placeholder:text-foreground-faint",
            "transition-colors focus:border-accent/50 focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        />
      </div>
      <Button type="submit" size="lg" disabled={disabled || !trimmed} className="sm:w-40">
        {disabled ? "Researching…" : "Research"}
      </Button>
    </form>
  );
}
