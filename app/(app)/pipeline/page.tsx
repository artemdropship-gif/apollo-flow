import { KanbanSquare } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function PipelinePage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="CRM Pipeline"
        description="Kanban-доска по всем найденным клиентам"
      />
      <EmptyState
        icon={KanbanSquare}
        title="Воронка появится здесь"
        description="Перетаскивайте лиды между статусами: Новый → В работе → Написал → Ответил → Переговоры → Клиент. Сохраните лиды в Leads Finder, чтобы они появились на доске."
      />
    </div>
  );
}
