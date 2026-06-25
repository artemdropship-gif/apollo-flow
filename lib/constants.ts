import type { LeadStatus, ProjectStatus } from "@prisma/client";
import {
  LayoutDashboard,
  Search,
  KanbanSquare,
  Workflow,
  FolderLock,
  NotebookPen,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  shortcut?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, shortcut: "D" },
  { title: "Leads Finder", href: "/leads", icon: Search, shortcut: "L" },
  { title: "CRM Pipeline", href: "/pipeline", icon: KanbanSquare, shortcut: "P" },
  { title: "Workflow Builder", href: "/workflow", icon: Workflow, shortcut: "W" },
  { title: "Project Vault", href: "/vault", icon: FolderLock, shortcut: "V" },
  { title: "Notes", href: "/notes", icon: NotebookPen, shortcut: "N" },
  { title: "Settings", href: "/settings", icon: Settings, shortcut: "S" },
];

export const NICHES: string[] = [
  "Салон красоты",
  "Барбершоп",
  "Маникюрный салон",
  "Косметология",
  "Магазин духов",
  "Цветочный магазин",
  "Автосервис",
  "Стоматология",
  "Кафе",
  "Ресторан",
  "Пиццерия",
  "Фитнес клуб",
  "Юрист",
  "Недвижимость",
  "Частная клиника",
  "Детский центр",
  "Школа",
  "Отель",
  "SPA",
  "Магазин одежды",
];

export interface LeadStatusMeta {
  value: LeadStatus;
  label: string;
  color: string;
}

export const LEAD_STATUSES: LeadStatusMeta[] = [
  { value: "NEW", label: "Новый", color: "#64748b" },
  { value: "IN_PROGRESS", label: "В работе", color: "#3b82f6" },
  { value: "CONTACTED", label: "Написал", color: "#a855f7" },
  { value: "REPLIED", label: "Ответил", color: "#06b6d4" },
  { value: "NEGOTIATION", label: "Переговоры", color: "#f59e0b" },
  { value: "CLIENT", label: "Клиент", color: "#22c55e" },
  { value: "REJECTED", label: "Отказ", color: "#ef4444" },
];

export const LEAD_STATUS_MAP: Record<LeadStatus, LeadStatusMeta> =
  Object.fromEntries(LEAD_STATUSES.map((s) => [s.value, s])) as Record<
    LeadStatus,
    LeadStatusMeta
  >;

export interface ProjectStatusMeta {
  value: ProjectStatus;
  label: string;
  color: string;
}

export const PROJECT_STATUSES: ProjectStatusMeta[] = [
  { value: "ACTIVE", label: "Активен", color: "#22c55e" },
  { value: "PAUSED", label: "На паузе", color: "#f59e0b" },
  { value: "COMPLETED", label: "Завершён", color: "#3b82f6" },
  { value: "ARCHIVED", label: "Архив", color: "#64748b" },
];

export const VAULT_CATEGORIES = [
  "Github",
  "Vercel",
  "Railway",
  "Supabase",
  "Cloudflare",
  "Домен",
  "API ключ",
  "Токен",
  "Промт",
  "Другое",
] as const;

export const PROMPT_TOOLS = ["Claude", "Cursor", "Gemini", "Другое"] as const;

export interface WorkflowNodeType {
  type: string;
  label: string;
  color: string;
}

export const WORKFLOW_NODE_TYPES: WorkflowNodeType[] = [
  { type: "frontend", label: "Frontend", color: "#3b82f6" },
  { type: "backend", label: "Backend", color: "#22c55e" },
  { type: "api", label: "API", color: "#06b6d4" },
  { type: "database", label: "База данных", color: "#a855f7" },
  { type: "ai", label: "AI", color: "#ec4899" },
  { type: "auth", label: "Authentication", color: "#f59e0b" },
  { type: "payments", label: "Payments", color: "#14b8a6" },
  { type: "storage", label: "Storage", color: "#8b5cf6" },
  { type: "integrations", label: "Integrations", color: "#f97316" },
  { type: "deployment", label: "Deployment", color: "#64748b" },
];

export const WORKFLOW_NODE_TYPE_MAP: Record<string, WorkflowNodeType> =
  Object.fromEntries(WORKFLOW_NODE_TYPES.map((n) => [n.type, n]));
