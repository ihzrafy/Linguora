"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const axis = { stroke: "var(--muted-foreground)", fontSize: 12, tickLine: false, axisLine: false } as const;
const tooltipStyle = {
  contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12, color: "var(--popover-foreground)" },
  cursor: { fill: "var(--muted)", opacity: 0.5 },
};

export function ActivityBarChart({ data, dataKey, label, height = 220 }: { data: { label: string; value: number }[]; dataKey?: string; label: string; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label={`${label}: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" {...axis} />
          <YAxis allowDecimals={false} {...axis} />
          <Tooltip {...tooltipStyle} formatter={(v) => [v, label]} />
          <Bar dataKey={dataKey ?? "value"} fill="var(--chart-1)" radius={[6, 6, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AccuracyLineChart({ data, height = 220 }: { data: { label: string; accuracy: number | null }[]; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="Grafik akurasi harian">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" {...axis} />
          <YAxis domain={[0, 100]} {...axis} unit="%" />
          <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, "Akurasi"]} />
          <Line type="monotone" dataKey="accuracy" stroke="var(--chart-2)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SkillRadar({ data, height = 260 }: { data: { skill: string; accuracy: number }[]; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label={`Performa keterampilan: ${data.map((d) => `${d.skill} ${d.accuracy}%`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="skill" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          <Radar dataKey="accuracy" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.25} />
          <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, "Akurasi"]} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
