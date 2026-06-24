"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
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
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-5" />
      <h1 className="text-sm font-semibold">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="gap-2 text-muted-foreground"
        >
          <Search className="size-4" />
          <span className="hidden sm:inline">Поиск...</span>
          <kbd className="ml-2 hidden items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline-flex">
            ⌘K
          </kbd>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
