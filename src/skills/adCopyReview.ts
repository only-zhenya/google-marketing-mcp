/**
 * Скіл: Аналіз Якості Оголошень
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerAdCopyReviewSkill(server: McpServer): void {
  server.tool(
    'skill_ad_copy_review',
    `📊 СКІЛ: Аналіз якості текстів оголошень.
Порівнює CTR та конверсії між оголошеннями, виявляє слабкі тексти, пропонує паузу або переписування.

КОЛИ ВИКОРИСТОВУВАТИ:
- Клієнт каже "перевір оголошення", "чому низький CTR", "покращ тексти реклами"
- При A/B тестуванні оголошень
- Коли CTR нижче 3%

РЕЗУЛЬТАТ: Покрокова інструкція аудиту оголошень з рекомендаціями.`,
    {
      adGroupId: z.string().optional().describe(
        'ID групи оголошень (якщо не вказано — аналіз всіх груп). Отримай ID через get_ad_groups.'
      ),
      campaignId: z.string().optional().describe(
        'ID кампанії для фільтрації. Отримай через get_campaigns.'
      ),
    },
    async ({ adGroupId, campaignId }) => {
      const adGroupFilter = adGroupId ? ` з adGroupId="${adGroupId}"` : '';
      const adGroupNote = adGroupId ? `Фокус на групі оголошень ID: ${adGroupId}.` : 'Аналізуй всі активні групи оголошень.';

      const instructions = `Ти — Senior PPC-копірайтер та аналітик. Проведи АУДИТ ЯКОСТІ ОГОЛОШЕНЬ.
${adGroupNote}

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ:

**КРОК 1 — Завантаж оголошення:**
Виклич get_ads${adGroupFilter}${campaignId ? ` або з campaignId="${campaignId}"` : ''}.

**КРОК 2 — Завантаж групи оголошень для контексту:**
Виклич get_ad_groups${campaignId ? ` з campaignId="${campaignId}"` : ''}.

**КРОК 3 — Завантаж ключові слова для перевірки входжень:**
Виклич get_keywords${campaignId ? ` з campaignId="${campaignId}"` : ''}.

**КРОК 4 — АНАЛІЗ:**

📝 ЯКІСТЬ ТЕКСТУ (для кожного оголошення):
  □ Є входження ключового слова в заголовку?
  □ Є конкретна цифра/факт?
  □ Є чіткий CTA в описі?
  □ Заголовки не повторюють один одного?

📊 ПЕРФОМАНС:
  □ CTR вище або нижче середнього по групі?
  □ Є конверсії?

**КРОК 5 — КЛАСИФІКАЦІЯ:**

🔴 ПАУЗУВАТИ (update_ad_status → PAUSED):
  - CTR < 50% від середнього по групі
  - 0 конверсій при значних витратах

🟠 ПЕРЕПИСАТИ (конкретні рекомендації):
  - Відсутній CTA або ключові слова

🟢 ЗАЛИШИТИ — топ-перфомер

**КРОК 6 — ЗВІТ + ПІДТВЕРДЖЕННЯ:**
Покажи звіт з конкретними рекомендаціями і запитай підтвердження.`;

      return {
        content: [{ type: 'text', text: instructions }],
      };
    }
  );
}
