/**
 * Скіл: Аудит Воронки Конверсій
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { modeSchema, previewResult, executeResult, SkillPreview } from './helpers';

export function registerConversionFunnelSkill(server: McpServer): void {
  server.tool(
    'skill_conversion_funnel_audit',
    `📉 СКІЛ: Діагностика воронки конверсій.
Де зламана воронка: реклама (CTR), лендинг (bounce), офер (0 конверсій).

КОЛИ ВИКОРИСТОВУВАТИ:
- "немає конверсій", "чому не купують", "зламана воронка"

⚡ ПОРЯДОК: спочатку mode="preview", після підтвердження — mode="execute".`,
    {
      mode: modeSchema,
      siteUrl: z.string().describe('URL сайту в GSC. Отримай через get_gsc_sites.'),
      campaignId: z.string().optional().describe('ID кампанії. Отримай через get_campaigns.'),
      conversionGoal: z.string().optional().describe('Ціль конверсії в GA4 (напр. "purchase")'),
    },
    async ({ mode, siteUrl, campaignId, conversionGoal }) => {
      const goalNote = conversionGoal ? `Ціль: "${conversionGoal}".` : '';
      const campaignNote = campaignId ? `Кампанія: ${campaignId}.` : 'Весь акаунт.';

      if (mode === 'preview') {
        const preview: SkillPreview = {
          title: '📉 Діагностика Воронки Конверсій',
          summary: `Воронка: Показ → Клік → Взаємодія → Конверсія. ${campaignNote} ${goalNote}`,
          skillName: 'skill_conversion_funnel_audit',
          estimatedTime: '3-4 хвилини',
          params: { siteUrl, campaignId, conversionGoal },
          steps: [
            { title: 'Рівень 1: Показ → Клік', tools: ['get_campaigns', 'get_performance_report'], description: 'CTR < 2% = проблема' },
            { title: 'Рівень 2: Клік → Взаємодія', tools: ['get_ga4_report'], description: 'engagementRate < 40% = лендинг' },
            { title: 'Рівень 3: Взаємодія → Конверсія', tools: ['get_ga4_report'], description: 'conv rate < 1% = офер' },
            { title: 'Конверсійні дії', tools: ['get_conversion_actions'], description: 'Чи правильно налаштовані' },
            { title: 'Девайси', tools: ['get_device_report'], description: 'Mobile часто ламає воронку' },
            { title: 'Діагноз', tools: [], description: 'Який рівень зламаний + втрати' },
          ],
        };
        return previewResult(preview);
      }

      return executeResult(`Ти — Senior PPC-аналітик. ДІАГНОСТИКА ВОРОНКИ. ${goalNote} ${campaignNote}

Воронка: [Показ] → [Клік] → [Взаємодія] → [Конверсія]

**КРОК 1 — Показ → Клік:**
Виклич get_campaigns та get_performance_report за 30 днів. CTR < 2% = проблема з оголошеннями.

**КРОК 2 — Клік → Взаємодія:**
Виклич get_ga4_report: dimensions=["sessionCampaignName","landingPagePlusQueryString"], metrics=["sessions","engagementRate","bounceRate"]. engagementRate < 40% = проблема з лендингом.

**КРОК 3 — Взаємодія → Конверсія:**
Виклич get_ga4_report: dimensions=["sessionCampaignName"], metrics=["sessions","conversions","engagementRate"]. conv rate < 1% при хорошому engagement = проблема з офером.

**КРОК 4:** Виклич get_conversion_actions. Перевір налаштування.
**КРОК 5:** Виклич get_device_report за 30 днів.

**КРОК 6 — ДІАГНОЗ:**
📉 Який рівень зламаний?
📉 Конкретна причина?
📉 Скільки втрачається?

**КРОК 7:** Рекомендації з інструментами.`);
    }
  );
}
