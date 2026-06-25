import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-grid text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Compass className="size-7" />
      </div>
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">Страница не найдена</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Похоже, такой страницы не существует.
        </p>
      </div>
      <Button render={<Link href="/dashboard" />}>На главную</Button>
    </div>
  );
}
