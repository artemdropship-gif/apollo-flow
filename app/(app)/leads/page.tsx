import { Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function LeadsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Leads Finder"
        description="Город + ниша → поиск компаний, аудит сайтов и Lead Score"
      />
      <EmptyState
        icon={Search}
        title="Поиск клиентов скоро будет здесь"
        description="Введите город и нишу — система найдёт компании на картах, проверит актуальность, проведёт AI-аудит сайта и рассчитает Lead Score, а затем сгенерирует персональные сообщения."
      />
    </div>
  );
}
