/**
 * Скіл: Harvest Сміттєвих Запитів
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerSearchTermsHarvestSkill(server: McpServer): void {
  server.tool(
    'skill_search_terms_harvest',
    `🧹 СКІЛ: Швидке очищення від сміттєвих пошукових запитів.
Знаходить запити що зливають бюджет без конверсій, формує і додає мінус-слова.

КОЛИ ВИКОРИСТОВУВАТИ:
- Клієнт каже "почисти запити", "багато сміття", "додай мінус-слова", "злив бюджету"
- При регулярній оптимізації (раз на 1-2 тижні)
- Коли є підозра на нерелевантний трафік

РЕЗУЛЬТАТ: Покрокова інструкція збору та блокування сміттєвих запитів.`,
    {
      campaignId: z.string().optional().describe(
        'ID кампанії (якщо не вказано — весь акаунт). Отримай ID через get_campaigns.'
      ),
      spendThreshold: z.string().optional().describe(
        'Мінімальні витрати на запит щоб потрапити до аналізу (за замовчуванням 3)'
      ),
      days: z.string().optional().describe(
        'Кількість днів для аналізу (за замовчуванням 14)'
      ),
    },
    async ({ campaignId, spendThreshold, days }) => {
      const threshold = spendThreshold ? Number(spendThreshold) : 3;
      const period = days ? Number(days) : 14;
      const campaignFilter = campaignId ? ` з campaignId="${campaignId}"` : '';

      const instructions = `Ти — Senior PPC-спеціаліст. Проведи HARVEST (збір і очищення) пошукових запитів за останні ${period} днів.
Поріг витрат для аналізу: ${threshold} (валюта акаунту).

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ:

**КРОК 1 — Інформація про акаунт:**
Виклич get_account_info.

**КРОК 2 — Завантаж пошукові запити:**
Виклич get_search_terms${campaignFilter} з limit=500.

**КРОК 3 — Завантаж поточні мінус-слова (щоб не дублювати):**
Виклич get_negative_keywords${campaignFilter}.

**КРОК 4 — ФІЛЬТРАЦІЯ:**
Знайди запити де витрати > ${threshold} та конверсій = 0 та ще НЕ є мінус-словом.
Категорії сміття: "як", "що таке", "безкоштовно", "своїми руками", "відео", "реферат", "скачати", "DIY"

**КРОК 5 — ПРІОРИТИЗАЦІЯ:**
🔴 КРИТИЧНО (витрати > ${threshold * 5}): негайно в мінус
🟠 ВАЖЛИВО (витрати ${threshold * 2}-${threshold * 5})
🟡 УВАГА (витрати ${threshold}-${threshold * 2})

**КРОК 6 — ЗВІТ:**
| Запит | Витрати | Кліки | Категорія | Рекомендація |
Потенційна місячна економія: ~X грн

**КРОК 7 — ПІДТВЕРДЖЕННЯ → add_negative_keywords**`;

      return {
        content: [{ type: 'text', text: instructions }],
      };
    }
  );
}
