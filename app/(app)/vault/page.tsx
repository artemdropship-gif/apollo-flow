import { PageHeader } from "@/components/shared/page-header";
import { getProjects } from "@/features/projects/actions";
import { getVaultItems } from "@/features/vault/actions";
import { VaultClient } from "@/features/vault/components/vault-client";

export default async function VaultPage() {
  const [items, projects] = await Promise.all([
    getVaultItems(),
    getProjects(),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Project Vault"
        description="Зашифрованные доступы, ссылки и промты по проектам"
      />
      <VaultClient items={items} projects={projects} />
    </div>
  );
}
