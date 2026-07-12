"use client";

import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import type { ResearchReport } from "@/agents/types";
import { Card, CardLabel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ScoreRadarProps {
  report: ResearchReport;
}

export function ScoreRadar({ report }: ScoreRadarProps) {
  const scores = report.verdict.scores;
  const data = [
    { subject: "Growth", value: scores.growth },
    { subject: "Value", value: scores.valuation },
    { subject: "Safety", value: scores.leverage },
    { subject: "Sentiment", value: scores.sentiment },
    { subject: "Low Risk", value: scores.risk },
    { subject: "Moat", value: scores.competition },
  ];

  return (
    <Card>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <CardLabel>Score radar</CardLabel>
          <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
            {Math.round(scores.weighted)}/100
          </div>
        </div>
        <Badge variant="accent">Weighted score</Badge>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="80%">
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "#9ca3af", fontSize: 11, fontFamily: "ui-monospace, monospace" }}
            />
            <PolarRadiusAxis angle={20} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar dataKey="value" stroke="#5b7cf0" fill="#5b7cf0" fillOpacity={0.15} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
