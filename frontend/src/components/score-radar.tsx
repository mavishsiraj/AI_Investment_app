"use client";

import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import type { ResearchReport } from "@/agents/types";

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
    <section className="rounded-[24px] border border-white/10 bg-[#0d1117]/80 p-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium uppercase tracking-[0.3em] text-[#8b949e]">Score radar</div>
          <div className="mt-1 text-2xl font-semibold text-[#e6edf3]">{Math.round(scores.weighted)}/100</div>
        </div>
        <div className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">
          Weighted score
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="80%">
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "#8b949e", fontSize: 11, fontFamily: "IBM Plex Mono, monospace" }}
            />
            <PolarRadiusAxis angle={20} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              dataKey="value"
              stroke="#d29922"
              fill="#d29922"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
