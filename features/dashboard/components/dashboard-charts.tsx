"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const ChartFallback = () => <Skeleton className="h-[260px] w-full rounded-lg" />;

export const TimelineAreaChart = dynamic(
  () =>
    import("./dashboard-charts-impl").then((m) => ({
      default: m.TimelineAreaChart,
    })),
  { ssr: false, loading: ChartFallback },
);

export const StatusBarChart = dynamic(
  () =>
    import("./dashboard-charts-impl").then((m) => ({
      default: m.StatusBarChart,
    })),
  { ssr: false, loading: ChartFallback },
);
