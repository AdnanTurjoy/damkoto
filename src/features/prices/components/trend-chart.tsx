"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useI18n } from "@/lib/i18n/client";
import { formatDate, formatTaka } from "@/lib/i18n/core";

// Validated categorical order (lightness band, chroma, CVD and contrast checks pass).
const SERIES_COLORS = ["#15803d", "#2563eb", "#d97706", "#c026d3"];

export interface TrendSeries {
  key: string;
  label: string;
}

/** Weekly median comparable price; gaps stay gaps (no interpolation across missing weeks). */
export function TrendChart({ data, series, unitLabel }: { data: Record<string, string | number | null>[]; series: TrendSeries[]; unitLabel: string }) {
  const { locale } = useI18n();
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="#e6dfcf" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="week" tickFormatter={(v: string) => formatDate(locale, v)} tick={{ fontSize: 12, fill: "#5b6860" }} tickLine={false} axisLine={{ stroke: "#e6dfcf" }} minTickGap={24} />
          <YAxis tickFormatter={(v: number) => formatTaka(locale, v)} tick={{ fontSize: 12, fill: "#5b6860" }} tickLine={false} axisLine={false} width={64} />
          <Tooltip
            formatter={(value, name) => [`${formatTaka(locale, Number(value))} / ${unitLabel}`, name]}
            labelFormatter={(label) => formatDate(locale, String(label))}
            contentStyle={{ borderRadius: 12, border: "1px solid #e6dfcf", fontFamily: "var(--font-sans)" }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          {series.map((s, i) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} connectNulls={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
