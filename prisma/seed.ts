import { PrismaClient, type Prisma } from "@prisma/client";
import { auth } from "../lib/auth";
import { computeLeadScore, type ScoreInput } from "../lib/score";
import { emptyAudit, type WebsiteAudit } from "../lib/audit/website";

const prisma = new PrismaClient();

function audit(partial: Partial<WebsiteAudit>): WebsiteAudit {
  return { ...emptyAudit(true), reachable: true, broken: false, ...partial };
}

const DEMO_EMAIL = "demo@apollo-flow.local";
const DEMO_PASSWORD = "Demo123!";
const DEMO_NAME = "Demo User";

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(10, 30, 0, 0);
  return d;
}

const CONTACTED_STATUSES: LeadStatusValue[] = [
  "CONTACTED",
  "REPLIED",
  "NEGOTIATION",
  "CLIENT",
];

type LeadStatusValue =
  | "NEW"
  | "IN_PROGRESS"
  | "CONTACTED"
  | "REPLIED"
  | "NEGOTIATION"
  | "CLIENT"
  | "REJECTED";

async function main() {
  // Idempotent: remove the previous demo user (cascade clears all its data).
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const ctx = await auth.$context;
  const passwordHash = await ctx.password.hash(DEMO_PASSWORD);

  const user = await prisma.user.create({
    data: {
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      emailVerified: true,
      accounts: {
        create: {
          accountId: DEMO_EMAIL,
          providerId: "credential",
          password: passwordHash,
        },
      },
    },
  });

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: "Веб-студия — поток клиентов",
      description: "Поиск и сопровождение клиентов на разработку сайтов.",
      client: "Внутренний",
      status: "ACTIVE",
    },
  });

  await prisma.project.create({
    data: {
      userId: user.id,
      name: "CRM для стоматологии",
      description: "Проектирование архитектуры CRM с онлайн-записью.",
      client: "Клиника «Улыбка»",
      status: "PAUSED",
    },
  });

  const leadSeeds: Array<{
    name: string;
    niche: string;
    city: string;
    phone?: string;
    website: string | null;
    rating?: number;
    reviewsCount?: number;
    status: LeadStatusValue;
    createdDaysAgo: number;
    score: ScoreInput;
  }> = [
    {
      name: "Салон красоты «Аврора»",
      niche: "Салон красоты",
      city: "Казань",
      phone: "+7 900 000-00-01",
      website: null,
      rating: 4.6,
      reviewsCount: 12,
      status: "NEW",
      createdDaysAgo: 1,
      score: { audit: emptyAudit(false), reviewsCount: 12, socialsActive: false },
    },
    {
      name: "Барбершоп «Бритва»",
      niche: "Барбершоп",
      city: "Казань",
      phone: "+7 900 000-00-02",
      website: "http://britva-old.example",
      rating: 4.2,
      reviewsCount: 8,
      status: "IN_PROGRESS",
      createdDaysAgo: 3,
      score: {
        audit: audit({
          outdatedDesign: true,
          notResponsive: true,
          poorSeo: true,
          loadTimeMs: 5200,
        }),
        reviewsCount: 8,
        socialsActive: false,
      },
    },
    {
      name: "Стоматология «Дентал+»",
      niche: "Стоматология",
      city: "Казань",
      phone: "+7 900 000-00-03",
      website: "https://dental-plus.example",
      rating: 4.9,
      reviewsCount: 240,
      status: "CONTACTED",
      createdDaysAgo: 6,
      score: {
        audit: audit({
          hasForms: true,
          hasCta: true,
          modern: true,
          premium: true,
          loadTimeMs: 1400,
        }),
        reviewsCount: 240,
        socialsActive: true,
      },
    },
    {
      name: "Цветочный магазин «Флора»",
      niche: "Цветочный магазин",
      city: "Казань",
      phone: "+7 900 000-00-04",
      website: "http://flora-broken.example",
      rating: 4.0,
      reviewsCount: 5,
      status: "REPLIED",
      createdDaysAgo: 8,
      score: { audit: emptyAudit(true), reviewsCount: 5, socialsActive: false },
    },
    {
      name: "Фитнес-клуб «Энергия»",
      niche: "Фитнес клуб",
      city: "Казань",
      phone: "+7 900 000-00-05",
      website: "https://energy-fit.example",
      rating: 4.7,
      reviewsCount: 64,
      status: "NEGOTIATION",
      createdDaysAgo: 10,
      score: {
        audit: audit({
          notResponsive: true,
          poorSeo: true,
          hasForms: true,
          loadTimeMs: 3100,
        }),
        reviewsCount: 64,
        socialsActive: true,
      },
    },
    {
      name: "Кофейня «Зерно»",
      niche: "Кафе",
      city: "Казань",
      phone: "+7 900 000-00-06",
      website: "https://zerno-coffee.example",
      rating: 4.8,
      reviewsCount: 130,
      status: "CLIENT",
      createdDaysAgo: 12,
      score: {
        audit: audit({
          hasForms: true,
          hasCta: true,
          modern: true,
          loadTimeMs: 1800,
        }),
        reviewsCount: 130,
        socialsActive: true,
      },
    },
    {
      name: "Маникюрный салон «Ноготок»",
      niche: "Маникюрный салон",
      city: "Казань",
      phone: "+7 900 000-00-07",
      website: null,
      rating: 4.3,
      reviewsCount: 9,
      status: "NEW",
      createdDaysAgo: 0,
      score: { audit: emptyAudit(false), reviewsCount: 9, socialsActive: false },
    },
    {
      name: "Автосервис «Мотор»",
      niche: "Автосервис",
      city: "Казань",
      phone: "+7 900 000-00-08",
      website: "http://motor-old.example",
      rating: 3.9,
      reviewsCount: 18,
      status: "NEW",
      createdDaysAgo: 2,
      score: {
        audit: audit({ outdatedDesign: true, notResponsive: true }),
        reviewsCount: 18,
        socialsActive: false,
      },
    },
    {
      name: "Косметология «Идеал»",
      niche: "Косметология",
      city: "Казань",
      phone: "+7 900 000-00-09",
      website: "http://ideal-broken.example",
      rating: 4.1,
      reviewsCount: 22,
      status: "IN_PROGRESS",
      createdDaysAgo: 4,
      score: { audit: emptyAudit(true), reviewsCount: 22, socialsActive: true },
    },
    {
      name: "Пиццерия «Точка»",
      niche: "Пиццерия",
      city: "Казань",
      phone: "+7 900 000-00-10",
      website: "https://tochka-pizza.example",
      rating: 4.5,
      reviewsCount: 76,
      status: "CONTACTED",
      createdDaysAgo: 5,
      score: {
        audit: audit({ notResponsive: true, poorSeo: true, hasForms: true }),
        reviewsCount: 76,
        socialsActive: true,
      },
    },
    {
      name: "Юрист Соколова",
      niche: "Юрист",
      city: "Казань",
      phone: "+7 900 000-00-11",
      website: null,
      rating: 4.8,
      reviewsCount: 14,
      status: "CONTACTED",
      createdDaysAgo: 7,
      score: { audit: emptyAudit(false), reviewsCount: 14, socialsActive: false },
    },
    {
      name: "Детский центр «Радуга»",
      niche: "Детский центр",
      city: "Казань",
      phone: "+7 900 000-00-12",
      website: "http://raduga-old.example",
      rating: 4.4,
      reviewsCount: 31,
      status: "REPLIED",
      createdDaysAgo: 9,
      score: {
        audit: audit({ outdatedDesign: true, poorSeo: true }),
        reviewsCount: 31,
        socialsActive: true,
      },
    },
    {
      name: "SPA «Лагуна»",
      niche: "SPA",
      city: "Казань",
      phone: "+7 900 000-00-13",
      website: "https://laguna-spa.example",
      rating: 4.9,
      reviewsCount: 88,
      status: "REJECTED",
      createdDaysAgo: 11,
      score: {
        audit: audit({ modern: true, premium: true, hasForms: true, hasCta: true }),
        reviewsCount: 88,
        socialsActive: true,
      },
    },
    {
      name: "Магазин одежды «Стиль»",
      niche: "Магазин одежды",
      city: "Казань",
      phone: "+7 900 000-00-14",
      website: "http://stil-old.example",
      rating: 4.0,
      reviewsCount: 11,
      status: "NEGOTIATION",
      createdDaysAgo: 13,
      score: {
        audit: audit({ outdatedDesign: true, notResponsive: true, poorSeo: true }),
        reviewsCount: 11,
        socialsActive: false,
      },
    },
  ];

  for (const seed of leadSeeds) {
    const { score, reasons } = computeLeadScore(seed.score);
    const contacted = CONTACTED_STATUSES.includes(seed.status);
    const createdAt = daysAgo(seed.createdDaysAgo);
    const lead = await prisma.lead.create({
      data: {
        userId: user.id,
        projectId: project.id,
        name: seed.name,
        niche: seed.niche,
        city: seed.city,
        phone: seed.phone,
        website: seed.website,
        rating: seed.rating,
        reviewsCount: seed.reviewsCount,
        source: "seed",
        websiteStatus: !seed.website
          ? "none"
          : seed.score.audit.broken
            ? "broken"
            : "ok",
        leadScore: score,
        scoreReasons: reasons as unknown as Prisma.InputJsonValue,
        aiAudit: seed.score.audit as unknown as Prisma.InputJsonValue,
        status: seed.status,
        favorite: seed.status === "NEGOTIATION",
        contacted,
        isClient: seed.status === "CLIENT",
        createdAt,
      },
    });

    if (contacted) {
      // First touch a day after the lead was found (capped at today).
      const sentAt = daysAgo(Math.max(seed.createdDaysAgo - 1, 0));
      await prisma.contactMessage.create({
        data: {
          leadId: lead.id,
          channel: "TELEGRAM",
          content: `Здравствуйте! Посмотрел сайт «${seed.name}» — есть идеи, как получать больше заявок.`,
          createdAt: sentAt,
        },
      });
    }
  }

  await prisma.note.createMany({
    data: [
      {
        userId: user.id,
        projectId: project.id,
        title: "Скрипт первого касания",
        content:
          "# Холодное сообщение\n\n- Указать конкретную проблему сайта\n- Предложить быстрый аудит\n- Призыв к действию: 15-минутный созвон",
        tags: ["продажи", "скрипты"],
        folder: "Продажи",
        pinned: true,
      },
      {
        userId: user.id,
        title: "Идеи по нишам",
        content:
          "Барбершопы и салоны красоты без сайтов — самый горячий сегмент.",
        tags: ["идеи"],
      },
    ],
  });

  const workflow = await prisma.workflow.create({
    data: {
      userId: user.id,
      projectId: project.id,
      name: "Архитектура: CRM для стоматологии",
      description: "Базовая схема, сгенерированная как пример.",
    },
  });

  await prisma.workflowNode.createMany({
    data: [
      {
        workflowId: workflow.id,
        type: "frontend",
        label: "Frontend",
        description: "Next.js + Tailwind",
        posX: 0,
        posY: 0,
        color: "#3b82f6",
      },
      {
        workflowId: workflow.id,
        type: "backend",
        label: "Backend",
        description: "Next.js API Routes",
        posX: 0,
        posY: 160,
        color: "#22c55e",
      },
      {
        workflowId: workflow.id,
        type: "database",
        label: "База данных",
        description: "PostgreSQL + Prisma",
        posX: 0,
        posY: 320,
        color: "#a855f7",
      },
    ],
  });

  console.log(`Seeded demo user ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
