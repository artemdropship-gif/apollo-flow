import { Workflow } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function WorkflowPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Workflow Builder"
        description="Интерактивный конструктор архитектуры проектов"
      />
      <EmptyState
        icon={Workflow}
        title="Конструктор архитектуры скоро будет здесь"
        description="Стройте схемы из блоков (Frontend, Backend, API, БД, AI и др.) с drag-and-drop, или опишите идею — AI-ассистент сам предложит архитектуру и стек."
      />
    </div>
  );
}
