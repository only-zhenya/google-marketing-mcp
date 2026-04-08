/**
 * Скіл: Аудит Воронки Конверсій
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerConversionFunnelSkill(server: McpServer): void {
  server.tool(
    'skill_conversion_funnel_audit',
    `📉 СКІЛ: Діагностика воронки конверсій.
Знаходить де зламана воронка: в рекламі (CTR), лендингу (bounce rate), чи в офері (0 конверсій при хорошому трафіку).

КОЛИ ВИКОРИСТОВУВАТИ:
- Клієнт каже "немає конверсій", "чому не купують", "де проблема", "зламана воронка"
- Коли є кліки але нема конверсій
- Для діагностики проблеми на конкретному рівні воронки

РЕЗУЛЬТАТ: Покрокова інструкція діагностики кожного рівня воронки.`,
    {
      siteUrl: z.string().describe(
        'URL сайту в GSC. Отримай через get_gsc_sites.'
      ),
      campaignId: z.string().optional().describe(
        'ID кампанії. Отримай через get_campaigns.'
      ),
      conversionGoal: z.string().optional().describe(
        'Назва цілі конверсії в GA4 (наприклад "purchase", "lead_form_submit")'
      ),
    },
    async ({ siteUrl, campaignId, conversionGoal }) => {
      const goalNote = conversionGoal ? `Ціль конверсії: "${conversionGoal}".` : '';
      const campaignNote = campaignId ? `Фокус на кампанії ID: ${campaignId}.` : 'Весь акаунт.';

      const instructions = `Ти — Senior PPC-аналітик. ДІАГНОСТИКА ВОРОНКИ КОНВЕРСІЙ. ${goalNote} ${campaignNote}

Воронка: [Показ] → [Клік] → [Взаємодія] → [Конверсія]

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ:

**КРОК 1 — Рівень 1 (Показ → Клік):**
Виклич get_campaigns та get_performance_report за 30 днів.
CTR < 2% = проблема з оголошеннями.

**КРОК 2 — Рівень 2 (Клік → Взаємодія):**
Виклич get_ga4_report: dimensions=["sessionCampaignName","landingPagePlusQueryString"], metrics=["sessions","engagementRate","bounceRate"].
engagementRate < 40% = проблема з лендингом.

**КРОК 3 — Рівень 3 (Взаємодія → Конверсія):**
Виклич get_ga4_report: dimensions=["sessionCampaignName"], metrics=["sessions","conversions","engagementRate"].
conv rate < 1% при хорошому engagement = проблема з офером.

**КРОК 4 — Конверсійні дії:**
Виклич get_conversion_actions. Перевір чи правильно налаштовані конверсії.

**КРОК 5 — Девайси:**
Виклич get_device_report за 30 днів. Часто mobile ламає воронку.

**КРОК 6 — ДІАГНОЗ:**
📉 Який рівень зламаний?
📉 Яка конкретна причина?
📉 Скільки грошей втрачається?

**КРОК 7 — Рекомендації з конкретними інструментами.**`;

      return {
        content: [{ type: 'text', text: instructions }],
      };
    }
  );
}
