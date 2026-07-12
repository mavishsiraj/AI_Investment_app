"use client";

import { NotebookText } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";

interface ReasoningProps {
  memo: string;
}

export function Reasoning({ memo }: ReasoningProps) {
  const paragraphs = memo.split(/\n\n+/).filter(Boolean);

  return (
    <Card>
      <div className="flex items-center gap-2">
        <NotebookText className="h-4 w-4 text-accent" aria-hidden="true" />
        <CardLabel>Investment memo</CardLabel>
      </div>
      <div className="mt-4 space-y-4 text-sm leading-7 text-foreground-muted">
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
        ) : (
          <p>No reasoning memo was provided for this report.</p>
        )}
      </div>
    </Card>
  );
}
