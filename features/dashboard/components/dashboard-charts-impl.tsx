"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StatusCount, TimelinePoint } from "@/lib/dashboard";

const LEADS_COLOR = "#7c5cff";
const MESSAGES_COLOR = "#06b6d4";

const axisProps = {
  stroke: "var(--muted-foreground)",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const;

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-lg border border-border/60 px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((item, i) => (
        <p key={i} className="flex items-center gap-1.5 text-muted-foreground">
          <span
            className="inline-block size-2 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.name}: <span className="font-medium text-foreground">{item.value}</span>
        </p>
      ))}
    </div>
  );
}

export function TimelineAreaChart({ data }: { data: TimelinePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="fillLeads" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={LEADS_COLOR} stopOpacity={0.35} />
            <stop offset="95%" stopColor={LEADS_COLOR} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fillMessages" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={MESSAGES_COLOR} stopOpacity={0.35} />
            <stop offset="95%" stopColor={MESSAGES_COLOR} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--border)"
        />
        <XAxis dataKey="label" {...axisProps} minTickGap={16} />
        <YAxis allowDecimals={false} width={32} {...axisProps} />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="leads"
          name="Лиды"
          stroke={LEADS_COLOR}
          strokeWidth={2}
          fill="url(#fillLeads)"
        />
        <Area
          type="monotone"
          dataKey="messages"
          name="Сообщения"
          stroke={MESSAGES_COLOR}
          strokeWidth={2}
          fill="url(#fillMessages)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function StatusBarChart({ data }: { data: StatusCount[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--border)"
        />
        <XAxis dataKey="label" {...axisProps} interval={0} angle={0} />
        <YAxis allowDecimals={false} width={32} {...axisProps} />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          content={<ChartTooltip />}
        />
        <Bar dataKey="count" name="Лиды" radius={[6, 6, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.value} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
