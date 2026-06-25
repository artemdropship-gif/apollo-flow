import { NotebookPen } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function NotesPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Notes"
        description="Markdown-заметки с тегами, папками и автосохранением"
      />
      <EmptyState
        icon={NotebookPen}
        title="Заметки скоро будут здесь"
        description="Полноценный markdown-редактор с тегами, папками, поиском, закреплением и автосохранением каждые 5 секунд."
      />
    </div>
  );
}
