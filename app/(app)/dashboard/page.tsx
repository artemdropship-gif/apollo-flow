import Link from "next/link";
import {
  Activity,
  KanbanSquare,
  NotebookPen,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATS = [
  { label: "Найдено лидов", value: 0, icon: Search, hint: "За всё время" },
  { label: "Активные проекты", value: 0, icon: KanbanSquare, hint: "В работе" },
  { label: "Клиенты", value: 0, icon: Users, hint: "Закрытые сделки" },
  { label: "Конверсия", value: "0%", icon: TrendingUp, hint: "Лид → клиент" },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Dashboard"
        description="Обзор воронки, проектов и активности"
      >
        <Button render={<Link href="/leads" />}>
          <Search className="size-4" />
          Найти клиентов
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((stat) => (
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

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <EmptyState
          icon={Activity}
          title="Пока нет активности"
          description="Запустите поиск лидов, чтобы здесь появилась статистика по найденным компаниям и отправленным сообщениям."
          action={
            <Button variant="outline" render={<Link href="/leads" />}>
              Открыть Leads Finder
            </Button>
          }
        />
        <EmptyState
          icon={NotebookPen}
          title="Нет заметок"
          description="Создавайте заметки по проектам и клиентам — последние из них будут отображаться здесь."
          action={
            <Button variant="outline" render={<Link href="/notes" />}>
              Открыть заметки
            </Button>
          }
        />
      </div>
    </div>
  );
}
