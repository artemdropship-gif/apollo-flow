import { PageHeader } from "@/components/shared/page-header";
import { ArchitectAssistant } from "@/components/workflow/architect-assistant";

export default function WorkflowPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Workflow Builder"
        description="Опишите идею — AI-ассистент предложит архитектуру и стек"
      />
      <ArchitectAssistant />
    </div>
  );
}
