import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/session";
import { getSavedLeads } from "@/lib/leads";
import { LeadsClient } from "@/features/leads/components/leads-client";

export default async function LeadsPage() {
  const user = await requireUser();
  const savedLeads = await getSavedLeads(user.id);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Leads Finder"
        description="Город + ниша → поиск компаний, аудит сайтов и Lead Score"
      />
      <LeadsClient savedLeads={savedLeads} />
    </div>
  );
}
