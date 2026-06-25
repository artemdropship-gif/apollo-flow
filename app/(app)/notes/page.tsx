import { PageHeader } from "@/components/shared/page-header";
import { getProjects } from "@/features/projects/actions";
import { getNotes } from "@/features/notes/actions";
import { NotesClient } from "@/features/notes/components/notes-client";

export default async function NotesPage() {
  const [notes, projects] = await Promise.all([getNotes(), getProjects()]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Notes"
        description="Markdown-заметки с тегами и автосохранением"
      />
      <NotesClient initialNotes={notes} projects={projects} />
    </div>
  );
}
