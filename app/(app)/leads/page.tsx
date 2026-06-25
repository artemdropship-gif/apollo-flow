import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/session";
import { getSavedLeads } from "@/lib/leads";
import { getProjects } from "@/features/projects/actions";
import { LeadsClient } from "@/features/leads/components/leads-client";

export default async function LeadsPage() {
  const user = await requireUser();
  const [savedLeads, projects] = await Promise.all([
    getSavedLeads(user.id),
    getProjects(),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Leads Finder"
        description="Город + ниша → поиск компаний, аудит сайтов и Lead Score"
      />
      <LeadsClient savedLeads={savedLeads} projects={projects} />
    </div>
  );
}
