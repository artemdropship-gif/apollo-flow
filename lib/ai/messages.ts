import type { MessageChannel } from "@prisma/client";
import { chat } from "@/lib/ai/anthropic";

export interface LeadLike {
  name: string;
  niche?: string | null;
  website?: string | null;
  scoreReasons?: { reason: string; points: number }[] | null;
}

const CHANNEL_LABELS: Record<MessageChannel, string> = {
  TELEGRAM: "сообщение в Telegram",
  WHATSAPP: "сообщение в WhatsApp",
  EMAIL: "холодное письмо",
  PROPOSAL: "коммерческое предложение",
};

function topIssue(lead: LeadLike): string {
  const positive = (lead.scoreReasons ?? []).filter((r) => r.points > 0);
  if (!positive.length) {
    return lead.website
      ? "сайт можно сделать современнее и удобнее"
      : "у бизнеса нет сайта";
  }
  positive.sort((a, b) => b.points - a.points);
  return positive[0].reason.toLowerCase();
}

function templateMessage(lead: LeadLike, channel: MessageChannel): string {
  const niche = lead.niche ? lead.niche.toLowerCase() : "вашего бизнеса";
  const issue = topIssue(lead);

  switch (channel) {
    case "TELEGRAM":
    case "WHATSAPP":
      return `Здравствуйте! Посмотрел ${niche} «${lead.name}». Заметил, что ${issue}. Я занимаюсь созданием современных сайтов, которые помогают получать больше заявок. Могу показать пару идей конкретно под вас — удобно созвониться на 10 минут?`;
    case "EMAIL":
      return `Тема: Больше заявок для «${lead.name}»\n\nЗдравствуйте!\n\nИзучил ${niche} «${lead.name}» и обратил внимание, что ${issue}. Из-за этого часть потенциальных клиентов уходит к конкурентам.\n\nЯ помогаю бизнесу получать больше обращений за счёт быстрого, удобного и адаптивного сайта с понятными формами заявок. Готов бесплатно показать конкретные улучшения под вашу нишу.\n\nБудет удобно обсудить на этой неделе?\n\nС уважением,\nваш веб-разработчик`;
    case "PROPOSAL":
      return `Коммерческое предложение для «${lead.name}»\n\n1. Проблема\nСейчас ${issue}, что снижает поток заявок.\n\n2. Решение\n— Современный адаптивный сайт (Linear/Notion-стиль)\n— Понятные формы заявок и call-to-action\n— Базовая SEO-оптимизация и высокая скорость\n— Подключение мессенджеров и аналитики\n\n3. Результат\nБольше обращений с того же трафика и профессиональный образ бренда.\n\n4. Следующий шаг\nКороткий созвон (10–15 минут), чтобы показать прототип под «${lead.name}».`;
    default:
      return "";
  }
}

export async function generateMessage(
  lead: LeadLike,
  channel: MessageChannel,
): Promise<string> {
  const reasons = (lead.scoreReasons ?? [])
    .filter((r) => r.points > 0)
    .map((r) => r.reason)
    .join(", ");

  const prompt = `Ты — опытный веб-разработчик, который пишет персональные продающие сообщения потенциальным клиентам на русском языке.
Бизнес: "${lead.name}"${lead.niche ? `, ниша: ${lead.niche}` : ""}.
Найденные проблемы: ${reasons || "сайт можно улучшить"}.
Сайт: ${lead.website || "отсутствует"}.

Напиши ${CHANNEL_LABELS[channel]}. Тон — дружелюбный, конкретный, без воды и без обещаний "за 5 минут". 1 короткий абзац для мессенджеров; для письма — с темой; для КП — со структурой. Не используй markdown-заголовки решёткой.`;

  const ai = await chat([
    {
      role: "system",
      content:
        "Ты помогаешь веб-разработчику с холодными продажами. Пиши кратко, по-русски, естественно.",
    },
    { role: "user", content: prompt },
  ]);

  return ai ?? templateMessage(lead, channel);
}
