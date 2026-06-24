import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronRight, NotebookPen, Pin, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RecentNote, RecentWorkflow } from "@/lib/dashboard";

function timeAgo(date: Date) {
  return formatDistanceToNow(date, { addSuffix: true, locale: ru });
}

export function RecentNotes({ notes }: { notes: RecentNote[] }) {
  return (
    <Card className="glass">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <NotebookPen className="size-4 text-primary" />
          Последние заметки
        </CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" render={<Link href="/notes" />}>
            Все
            <ChevronRight className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <EmptyMini text="Заметок пока нет" />
        ) : (
          <ul className="divide-y divide-border/60">
            {notes.map((note) => (
              <li key={note.id}>
                <Link
                  href="/notes"
                  className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:text-primary"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {note.pinned && (
                      <Pin className="size-3.5 shrink-0 text-primary" />
                    )}
                    <span className="truncate text-sm font-medium">
                      {note.title || "Без названия"}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {timeAgo(note.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function RecentWorkflows({
  workflows,
}: {
  workflows: RecentWorkflow[];
}) {
  return (
    <Card className="glass">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Workflow className="size-4 text-primary" />
          Последние workflow
        </CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" render={<Link href="/workflow" />}>
            Все
            <ChevronRight className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {workflows.length === 0 ? (
          <EmptyMini text="Архитектур пока нет" />
        ) : (
          <ul className="divide-y divide-border/60">
            {workflows.map((wf) => (
              <li key={wf.id}>
                <Link
                  href="/workflow"
                  className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:text-primary"
                >
                  <span className="truncate text-sm font-medium">
                    {wf.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline">{wf.nodeCount} блок.</Badge>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(wf.updatedAt)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyMini({ text }: { text: string }) {
  return (
    <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>
  );
}
