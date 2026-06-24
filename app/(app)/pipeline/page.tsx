import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/session";
import { getSavedLeads } from "@/lib/leads";
import { PipelineBoard } from "@/features/pipeline/components/pipeline-board";

export default async function PipelinePage() {
  const user = await requireUser();
  const leads = await getSavedLeads(user.id);

  return (
    <div className="mx-auto max-w-full">
      <PageHeader
        title="CRM Pipeline"
        description="Kanban-доска по всем найденным клиентам — перетаскивайте карточки между статусами"
      />
      <PipelineBoard leads={leads} />
    </div>
  );
}
