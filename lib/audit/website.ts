import * as cheerio from "cheerio";

export interface WebsiteAudit {
  hasWebsite: boolean;
  reachable: boolean;
  broken: boolean;
  outdatedDesign: boolean;
  notResponsive: boolean;
  poorSeo: boolean;
  hasForms: boolean;
  hasCta: boolean;
  modern: boolean;
  premium: boolean;
  loadTimeMs: number | null;
  notes: string[];
}

const FETCH_TIMEOUT_MS = 8000;

export function emptyAudit(hasWebsite: boolean): WebsiteAudit {
  return {
    hasWebsite,
    reachable: false,
    broken: hasWebsite,
    outdatedDesign: false,
    notResponsive: false,
    poorSeo: false,
    hasForms: false,
    hasCta: false,
    modern: false,
    premium: false,
    loadTimeMs: null,
    notes: hasWebsite ? ["Сайт не открывается"] : ["Сайт отсутствует"],
  };
}

function normalizeUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) return `https://${url}`;
  return url;
}

export async function auditWebsite(
  rawUrl: string | null | undefined,
): Promise<WebsiteAudit> {
  if (!rawUrl || !rawUrl.trim()) return emptyAudit(false);

  const url = normalizeUrl(rawUrl.trim());
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const start = Date.now();

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "ApolloFlowBot/1.0 (+audit)" },
    });
    const loadTimeMs = Date.now() - start;

    if (!res.ok) {
      const a = emptyAudit(true);
      a.loadTimeMs = loadTimeMs;
      a.notes = [`Сайт отвечает ошибкой (HTTP ${res.status})`];
      return a;
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const notes: string[] = [];

    const hasViewport = $('meta[name="viewport"]').length > 0;
    const notResponsive = !hasViewport;
    if (notResponsive) notes.push("Нет meta viewport — слабая мобильная версия");

    const title = $("title").text().trim();
    const description = $('meta[name="description"]').attr("content")?.trim();
    const h1 = $("h1").length;
    const poorSeo = !title || !description || h1 === 0;
    if (poorSeo) notes.push("Слабое SEO (нет title/description/H1)");

    const hasForms = $("form").length > 0 || $('input[type="email"]').length > 0;
    if (!hasForms) notes.push("Нет форм заявок");

    const ctaWords = /заяв|заказ|оставить|связаться|купить|записаться|book|order|contact|buy|sign up|get started/i;
    const hasCta =
      $("a,button").toArray().some((el) => ctaWords.test($(el).text())) ||
      hasForms;
    if (!hasCta) notes.push("Нет явного call-to-action");

    const lower = html.toLowerCase();
    const frameworkModern =
      lower.includes("__next_data__") ||
      lower.includes("/_next/") ||
      lower.includes("data-reactroot") ||
      lower.includes("nuxt") ||
      lower.includes("vite") ||
      lower.includes("tailwind");
    const modern = frameworkModern && hasViewport;

    const outdatedMarkers =
      /<font[\s>]|<marquee|<frameset|<center[\s>]|bgcolor=|<table[^>]*role=["']?presentation/i;
    const outdatedDesign =
      !hasViewport ||
      outdatedMarkers.test(html) ||
      (loadTimeMs > 4000 && !modern);
    if (outdatedDesign) notes.push("Признаки устаревшего дизайна");

    const premium = modern && hasViewport && !poorSeo && hasForms && loadTimeMs < 2500;

    return {
      hasWebsite: true,
      reachable: true,
      broken: false,
      outdatedDesign,
      notResponsive,
      poorSeo,
      hasForms,
      hasCta,
      modern,
      premium,
      loadTimeMs,
      notes: notes.length ? notes : ["Сайт в хорошем состоянии"],
    };
  } catch {
    const a = emptyAudit(true);
    a.loadTimeMs = null;
    a.broken = true;
    a.notes = ["Сайт не открывается или таймаут"];
    return a;
  } finally {
    clearTimeout(timeout);
  }
}
