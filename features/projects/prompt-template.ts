/**
 * Reusable template prompt (#10). The user copies this, sends it to ANY external
 * AI session (even one not created from Apollo-Flow), and the AI replies with a
 * single JSON block that can be pasted back to populate a project.
 *
 * Kept in a plain module (not the "use server" file) so it can be imported by
 * client components — a "use server" file may only export async functions.
 */
export const PROJECT_IMPORT_TEMPLATE = `Ты помогаешь перенести проект в систему Apollo-Flow.
Изучи весь наш диалог/контекст и собери всю полезную информацию о проекте.
Верни ОДИН блок JSON (и больше ничего) строго в этой схеме:

\`\`\`json
{
  "name": "название проекта",
  "client": "имя клиента или компании (если есть)",
  "description": "суть проекта в 1-3 предложениях",
  "context": "важный контекст: договорённости, ограничения, решения, история",
  "tasks": ["текущая задача 1", "задача 2", "задача 3"],
  "notes": [
    { "title": "Заголовок заметки", "content": "Текст в Markdown" }
  ]
}
\`\`\`

Заполняй только то, что реально известно. Не выдумывай. Не добавляй текста вне JSON.`;
