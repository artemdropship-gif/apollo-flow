import {
  eachDayOfInterval,
  format,
  startOfDay,
  subDays,
} from "date-fns";
import { ru } from "date-fns/locale";
import type { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { LEAD_STATUSES } from "@/lib/constants";

const TIMELINE_DAYS = 14;

export interface DashboardTotals {
  leads: number;
  activeProjects: number;
  clients: number;
  conversionRate: number;
}

export interface StatusCount {
  value: LeadStatus;
  label: string;
  color: string;
  count: number;
}

export interface TimelinePoint {
  date: string;
  label: string;
  leads: number;
  messages: number;
}

export interface RecentNote {
  id: string;
  title: string;
  updatedAt: Date;
  pinned: boolean;
}

export interface RecentWorkflow {
  id: string;
  name: string;
  updatedAt: Date;
  nodeCount: number;
}

export interface DashboardMetrics {
  totals: DashboardTotals;
  statusCounts: StatusCount[];
  timeline: TimelinePoint[];
  recentNotes: RecentNote[];
  recentWorkflows: RecentWorkflow[];
}

export async function getDashboardMetrics(
  userId: string,
): Promise<DashboardMetrics> {
  const now = new Date();
  const since = startOfDay(subDays(now, TIMELINE_DAYS - 1));

  const [
    totalLeads,
    activeProjects,
    clients,
    grouped,
    recentLeads,
    recentMessages,
    recentNotes,
    recentWorkflowsRaw,
  ] = await Promise.all([
    prisma.lead.count({ where: { userId } }),
    prisma.project.count({ where: { userId, status: "ACTIVE" } }),
    prisma.lead.count({ where: { userId, status: "CLIENT" } }),
    prisma.lead.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.lead.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.contactMessage.findMany({
      where: { lead: { userId }, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.note.findMany({
      where: { userId },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      take: 5,
      select: { id: true, title: true, updatedAt: true, pinned: true },
    }),
    prisma.workflow.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        updatedAt: true,
        _count: { select: { nodes: true } },
      },
    }),
  ]);

  const countByStatus = new Map(
    grouped.map((g) => [g.status, g._count._all]),
  );
  const statusCounts: StatusCount[] = LEAD_STATUSES.map((s) => ({
    value: s.value,
    label: s.label,
    color: s.color,
    count: countByStatus.get(s.value) ?? 0,
  }));

  const leadsByDay = countByDay(recentLeads.map((l) => l.createdAt));
  const messagesByDay = countByDay(recentMessages.map((m) => m.createdAt));
  const timeline: TimelinePoint[] = eachDayOfInterval({
    start: since,
    end: now,
  }).map((day) => {
    const key = format(day, "yyyy-MM-dd");
    return {
      date: key,
      label: format(day, "d MMM", { locale: ru }),
      leads: leadsByDay.get(key) ?? 0,
      messages: messagesByDay.get(key) ?? 0,
    };
  });

  const conversionRate =
    totalLeads > 0 ? Math.round((clients / totalLeads) * 100) : 0;

  return {
    totals: { leads: totalLeads, activeProjects, clients, conversionRate },
    statusCounts,
    timeline,
    recentNotes,
    recentWorkflows: recentWorkflowsRaw.map((w) => ({
      id: w.id,
      name: w.name,
      updatedAt: w.updatedAt,
      nodeCount: w._count.nodes,
    })),
  };
}

function countByDay(dates: Date[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const date of dates) {
    const key = format(date, "yyyy-MM-dd");
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}
