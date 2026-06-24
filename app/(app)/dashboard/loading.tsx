import { PageHeader } from "@/components/shared/page-header";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Dashboard"
        description="Обзор воронки, проектов и активности"
      />
      <DashboardSkeleton />
    </div>
  );
}
