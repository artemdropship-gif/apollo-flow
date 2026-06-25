"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Plus, Sun } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { NAV_ITEMS } from "@/lib/constants";
import { useCommandStore } from "@/stores/command";

export function CommandPalette() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { open, setOpen, toggle } = useCommandStore();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Команды">
      <CommandInput placeholder="Поиск разделов и действий..." />
      <CommandList>
        <CommandEmpty>Ничего не найдено.</CommandEmpty>
        <CommandGroup heading="Навигация">
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.href}
              value={item.title}
              onSelect={() => run(() => router.push(item.href))}
            >
              <item.icon className="size-4" />
              <span>{item.title}</span>
              {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Действия">
          <CommandItem
            value="Новый поиск лидов"
            onSelect={() => run(() => router.push("/leads"))}
          >
            <Plus className="size-4" />
            <span>Новый поиск лидов</span>
          </CommandItem>
          <CommandItem
            value="Новая заметка"
            onSelect={() => run(() => router.push("/notes"))}
          >
            <Plus className="size-4" />
            <span>Новая заметка</span>
          </CommandItem>
          <CommandItem
            value="Сменить тему"
            onSelect={() =>
              run(() => setTheme(theme === "dark" ? "light" : "dark"))
            }
          >
            {theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
            <span>Сменить тему</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
