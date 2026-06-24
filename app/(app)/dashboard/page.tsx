import { Suspense } from "react";
import Link from "next/link";
import { Activity, BarChart3, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/session";
import { getDashboardMetrics } from "@/lib/dashboard";
import { StatCards } from "@/features/dashboard/components/stat-cards";
import {
  RecentNotes,
  RecentWorkflows,
} from "@/features/dashboard/components/recent-lists";
import {
  StatusBarChart,
  TimelineAreaChart,
} from "@/features/dashboard/components/dashboard-charts";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";

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

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

async function DashboardContent() {
  const user = await getCurrentUser();
  if (!user) return null;

  const metrics = await getDashboardMetrics(user.id);
  const hasLeads = metrics.totals.leads > 0;

  return (
    <div className="space-y-6">
      <StatCards totals={metrics.totals} />

      {hasLeads ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="size-4 text-primary" />
                Динамика за 14 дней
              </CardTitle>
              <CardDescription>
                Найденные лиды и отправленные сообщения
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TimelineAreaChart data={metrics.timeline} />
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="size-4 text-primary" />
                Воронка по статусам
              </CardTitle>
              <CardDescription>
                Распределение лидов от первого контакта до клиента
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StatusBarChart data={metrics.statusCounts} />
            </CardContent>
          </Card>
        </div>
      ) : (
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
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentNotes notes={metrics.recentNotes} />
        <RecentWorkflows workflows={metrics.recentWorkflows} />
      </div>
    </div>
  );
}
