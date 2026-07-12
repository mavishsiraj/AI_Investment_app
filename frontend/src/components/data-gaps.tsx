"use client";

import { Info } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";

interface DataGapsProps {
  errors?: string[];
}

/**
 * data-gaps.tsx
 *
 * Only renders when there are non-fatal gaps to disclose — an empty state
 * here would just be noise. Kept low-key (not warning/negative tokens):
 * these are honest disclosures about partial data, not something wrong
 * with the app.
 */
export function DataGaps({ errors }: DataGapsProps) {
  if (!errors || errors.length === 0) return null;

  return (
    <Card className="bg-white/[0.015]">
      <div className="flex items-center gap-2">
        <Info className="h-3.5 w-3.5 text-foreground-faint" aria-hidden="true" />
        <CardLabel>Data gaps</CardLabel>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm leading-6 text-foreground-muted">
        {errors.map((error, index) => (
          <li key={index} className="flex gap-2">
            <span className="text-foreground-faint">·</span>
            {error}
          </li>
        ))}
      </ul>
    </Card>
  );
}
