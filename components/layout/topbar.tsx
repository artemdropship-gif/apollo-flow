"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AssistantBar } from "@/features/assistant/components/assistant-bar";
import { NAV_ITEMS } from "@/lib/constants";
import { useCommandStore } from "@/stores/command";

function useTitle() {
  const pathname = usePathname();
  const match = NAV_ITEMS.find(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
  return match?.title ?? "Apollo-Flow";
}

export function Topbar() {
  const title = useTitle();
  const setOpen = useCommandStore((s) => s.setOpen);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-5" />
      <h1 className="hidden shrink-0 text-sm font-semibold md:block">{title}</h1>
      <div className="flex flex-1 justify-center">
        <AssistantBar />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Поиск (⌘K)"
          className="text-muted-foreground"
        >
          <Search className="size-4" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
