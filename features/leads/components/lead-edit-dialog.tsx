"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CITIES, NICHES } from "@/lib/constants";
import {
  attachLeadProject,
  createLeadManually,
  editLead,
  type LeadEditInput,
} from "@/features/leads/actions";
import { createProject, type ProjectOption } from "@/features/projects/actions";
import type { LeadSocials, SavedLead } from "@/features/leads/types";

const SOCIAL_FIELDS: { key: keyof LeadSocials; label: string }[] = [
  { key: "telegram", label: "Telegram" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "instagram", label: "Instagram" },
  { key: "vk", label: "VK" },
  { key: "facebook", label: "Facebook" },
  { key: "youtube", label: "YouTube" },
];

function emptyForm(): LeadEditInput {
  return {
    name: "",
    niche: "",
    city: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    workingHours: "",
    socials: {},
    comment: "",
  };
}

function fromLead(lead: SavedLead): LeadEditInput {
  return {
    name: lead.name,
    niche: lead.niche ?? "",
    city: lead.city ?? "",
    address: lead.address ?? "",
    phone: lead.phone ?? "",
    email: lead.email ?? "",
    website: lead.website ?? "",
    workingHours: lead.workingHours ?? "",
    socials: lead.socials ?? {},
    comment: lead.comment ?? "",
  };
}

export function LeadEditDialog({
  lead,
  projects,
  trigger,
}: {
  lead?: SavedLead;
  projects: ProjectOption[];
  trigger: React.ReactElement;
}) {
  const isEdit = Boolean(lead);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LeadEditInput>(
    lead ? fromLead(lead) : emptyForm(),
  );
  const [projectId, setProjectId] = useState<string>(lead?.projectId ?? "");
  const [newProject, setNewProject] = useState("");
  const [pending, startTransition] = useTransition();

  function set<K extends keyof LeadEditInput>(key: K, value: LeadEditInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setSocial(key: keyof LeadSocials, value: string) {
    setForm((f) => ({ ...f, socials: { ...f.socials, [key]: value } }));
  }

  function submit() {
    if (!form.name.trim()) {
      toast.error("Укажите название");
      return;
    }
    startTransition(async () => {
      try {
        let targetProject = projectId;
        if (newProject.trim()) {
          const res = await createProject({ name: newProject });
          targetProject = res.id;
        }

        if (isEdit && lead) {
          await editLead(lead.id, form);
          await attachLeadProject(lead.id, targetProject || null);
          toast.success("Лид обновлён");
        } else {
          const res = await createLeadManually(form);
          if (targetProject) await attachLeadProject(res.id, targetProject);
          toast.success("Лид создан");
        }
        setOpen(false);
        if (!isEdit) {
          setForm(emptyForm());
          setProjectId("");
          setNewProject("");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Не удалось сохранить");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Редактировать «${lead?.name}»` : "Новый лид"}
          </DialogTitle>
          <DialogDescription>
            Заполните данные о компании. Контакты соцсетей делают кнопки
            «Сообщение» кликабельными.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Название *">
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="ООО «Компания»"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ниша">
              <Input
                value={form.niche ?? ""}
                onChange={(e) => set("niche", e.target.value)}
                list="niche-suggestions-edit"
              />
              <datalist id="niche-suggestions-edit">
                {NICHES.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </Field>
            <Field label="Город">
              <Input
                value={form.city ?? ""}
                onChange={(e) => set("city", e.target.value)}
                list="city-suggestions-edit"
              />
              <datalist id="city-suggestions-edit">
                {CITIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
          </div>
          <Field label="Адрес">
            <Input
              value={form.address ?? ""}
              onChange={(e) => set("address", e.target.value)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Телефон">
              <Input
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+7 900 000-00-00"
              />
            </Field>
            <Field label="Email">
              <Input
                value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value)}
                placeholder="hello@company.ru"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Сайт">
              <Input
                value={form.website ?? ""}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://…"
              />
            </Field>
            <Field label="Часы работы">
              <Input
                value={form.workingHours ?? ""}
                onChange={(e) => set("workingHours", e.target.value)}
                placeholder="Пн–Пт 9–18"
              />
            </Field>
          </div>

          <div className="space-y-2 rounded-lg border border-border/60 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Соцсети и мессенджеры (ссылка или @username)
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SOCIAL_FIELDS.map((s) => (
                <Field key={s.key} label={s.label}>
                  <Input
                    value={form.socials[s.key] ?? ""}
                    onChange={(e) => setSocial(s.key, e.target.value)}
                    placeholder={
                      s.key === "whatsapp" ? "79000000000 или ссылка" : "@username"
                    }
                  />
                </Field>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-border/60 p-3">
            <p className="text-xs font-medium text-muted-foreground">Проект</p>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="">— Без проекта —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <Input
              value={newProject}
              onChange={(e) => setNewProject(e.target.value)}
              placeholder="…или создать новый проект"
            />
          </div>

          <Field label="Комментарий">
            <Textarea
              value={form.comment ?? ""}
              onChange={(e) => set("comment", e.target.value)}
              rows={2}
              className="resize-none"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {isEdit ? "Сохранить" : "Создать лид"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
