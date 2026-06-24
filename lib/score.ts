import type { WebsiteAudit } from "@/lib/audit/website";

export interface ScoreInput {
  audit: WebsiteAudit;
  reviewsCount?: number | null;
  socialsActive?: boolean | null;
}

export interface ScoreResult {
  score: number;
  reasons: { reason: string; points: number }[];
}

const FEW_REVIEWS_THRESHOLD = 20;

/**
 * Lead score formula (per product spec):
 *  +40 no website        +25 outdated design   +20 non-responsive
 *  +20 few reviews        +15 poor SEO          +15 inactive socials
 *  +10 broken website    -20 modern website     -30 premium website
 */
export function computeLeadScore(input: ScoreInput): ScoreResult {
  const { audit } = input;
  const reasons: { reason: string; points: number }[] = [];
  const add = (reason: string, points: number) => reasons.push({ reason, points });

  if (!audit.hasWebsite) {
    add("Нет сайта", 40);
  } else {
    if (audit.broken) add("Сломанный сайт", 10);
    if (audit.outdatedDesign) add("Устаревший дизайн", 25);
    if (audit.notResponsive) add("Неадаптивный сайт", 20);
    if (audit.poorSeo) add("Плохое SEO", 15);
    if (audit.premium) add("Сайт уровня premium", -30);
    else if (audit.modern) add("Современный сайт", -20);
  }

  if (
    input.reviewsCount != null &&
    input.reviewsCount < FEW_REVIEWS_THRESHOLD
  ) {
    add("Мало отзывов", 20);
  }

  if (input.socialsActive === false) {
    add("Неактивные соцсети", 15);
  }

  const score = Math.max(
    0,
    Math.min(100, reasons.reduce((sum, r) => sum + r.points, 0)),
  );

  return { score, reasons };
}

export function scorePriority(score: number): {
  label: string;
  color: string;
} {
  if (score >= 70) return { label: "Высокий", color: "#ef4444" };
  if (score >= 40) return { label: "Средний", color: "#f59e0b" };
  return { label: "Низкий", color: "#22c55e" };
}
