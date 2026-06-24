import { FolderLock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function VaultPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Project Vault"
        description="Зашифрованные доступы, ссылки и промты по проектам"
      />
      <EmptyState
        icon={FolderLock}
        title="Хранилище проектов скоро будет здесь"
        description="Храните доступы (GitHub, Vercel, домены, API-ключи) с AES-шифрованием, полезные ссылки и промты. Экспортируйте проект в PDF, Markdown или JSON."
      />
    </div>
  );
}
