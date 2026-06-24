import { KanbanSquare, Search, TrendingUp, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardTotals } from "@/lib/dashboard";

interface StatItem {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint: string;
}

export function StatCards({ totals }: { totals: DashboardTotals }) {
  const stats: StatItem[] = [
    {
      label: "Найдено лидов",
      value: totals.leads,
      icon: Search,
      hint: "За всё время",
    },
    {
      label: "Активные проекты",
      value: totals.activeProjects,
      icon: KanbanSquare,
      hint: "В работе",
    },
    {
      label: "Клиенты",
      value: totals.clients,
      icon: Users,
      hint: "Закрытые сделки",
    },
    {
      label: "Конверсия",
      value: `${totals.conversionRate}%`,
      icon: TrendingUp,
      hint: "Лид → клиент",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="glass">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </CardTitle>
            <stat.icon className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
