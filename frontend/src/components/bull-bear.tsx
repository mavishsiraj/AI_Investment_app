"use client";

import { Plus, Minus } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";

interface BullBearProps {
  bullCase: string[];
  bearCase: string[];
}

export function BullBear({ bullCase, bearCase }: BullBearProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <Card className="border-positive/20 bg-positive-muted">
        <CardLabel className="text-positive">Bull case</CardLabel>
        <ul className="mt-4 space-y-3">
          {bullCase.map((point) => (
            <li
              key={point}
              className="flex items-start gap-2.5 rounded-md border border-positive/15 bg-surface/60 p-3 text-sm leading-6 text-foreground"
            >
              <Plus className="mt-0.5 h-4 w-4 shrink-0 text-positive" aria-hidden="true" />
              {point}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="border-negative/20 bg-negative-muted">
        <CardLabel className="text-negative">Bear case</CardLabel>
        <ul className="mt-4 space-y-3">
          {bearCase.map((point) => (
            <li
              key={point}
              className="flex items-start gap-2.5 rounded-md border border-negative/15 bg-surface/60 p-3 text-sm leading-6 text-foreground"
            >
              <Minus className="mt-0.5 h-4 w-4 shrink-0 text-negative" aria-hidden="true" />
              {point}
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
