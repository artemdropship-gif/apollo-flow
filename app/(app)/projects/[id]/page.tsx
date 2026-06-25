import { notFound } from "next/navigation";
import { getProjectDetail } from "@/features/projects/actions";
import { ProjectDetailClient } from "@/features/projects/components/project-detail-client";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectDetail(id);
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <ProjectDetailClient project={project} />
    </div>
  );
}
