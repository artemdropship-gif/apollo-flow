import { PageHeader } from "@/components/shared/page-header";
import { getProjectsSummary } from "@/features/projects/actions";
import { ProjectsClient } from "@/features/projects/components/projects-client";

export default async function ProjectsPage() {
  const projects = await getProjectsSummary();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Проекты"
        description="Конструктор проекта: лиды, воркфлоу, доступы, заметки, задачи и контекст в одном месте"
      />
      <ProjectsClient projects={projects} />
    </div>
  );
}
