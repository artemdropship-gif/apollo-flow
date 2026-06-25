import { PageHeader } from "@/components/shared/page-header";
import {
  getWorkflow,
  getWorkflows,
  type WorkflowDetail,
} from "@/features/workflow/actions";
import { WorkflowClient } from "@/features/workflow/components/workflow-client";

export default async function WorkflowPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const [workflows, selected] = await Promise.all([
    getWorkflows(),
    id ? getWorkflow(id) : Promise.resolve<WorkflowDetail | null>(null),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      {!selected && (
        <PageHeader
          title="Workflow Builder"
          description="Опишите идею — Проект Аполлон спроектирует архитектуру. Или соберите схему из блоков вручную."
        />
      )}
      <WorkflowClient workflows={workflows} selected={selected} />
    </div>
  );
}
