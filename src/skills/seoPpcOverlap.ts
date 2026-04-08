/**
 * Скіл: SEO vs PPC — Аналіз Перетину
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { modeSchema, previewResult, executeResult, SkillPreview } from './helpers';

export function registerSeoPpcOverlapSkill(server: McpServer): void {
  server.tool(
    'skill_seo_ppc_overlap',
    `🔄 СКІЛ: SEO vs PPC — аналіз перетину.
Де реклама дублює органіку та де SEO слабке → підсилити PPC.

КОЛИ ВИКОРИСТОВУВАТИ:
- "порівняй органіку з рекламою", "SEO vs PPC", "де зекономити"

⚡ ПОРЯДОК: спочатку mode="preview", після підтвердження — mode="execute".`,
    {
      mode: modeSchema,
      siteUrl: z.string().describe('URL сайту в GSC. Отримай через get_gsc_sites.'),
      campaignId: z.string().optional().describe('ID кампанії. Отримай через get_campaigns.'),
    },
    async ({ mode, siteUrl, campaignId }) => {
      const campaignFilter = campaignId ? ` з campaignId="${campaignId}"` : '';

      if (mode === 'preview') {
        const preview: SkillPreview = {
          title: '🔄 SEO vs PPC — Перетин',
          summary: `Крос-аналіз Search Console + Google Ads для ${siteUrl}.`,
          skillName: 'skill_seo_ppc_overlap',
          estimatedTime: '3-4 хвилини',
          params: { siteUrl, campaignId },
          steps: [
            { title: 'Органічний трафік', tools: ['get_gsc_search_analytics'], description: 'GSC: queries + pages' },
            { title: 'Платний трафік', tools: ['get_search_terms', 'get_keywords'], description: 'Ads search terms + keywords' },
            { title: 'GA4 конверсії', tools: ['get_ga4_report'], description: 'По джерелах' },
            { title: 'Перехресний аналіз', tools: [], description: '🔴 дублювання → 🟡 підтримка → 🟢 можливість → 🔵 SEO-gap' },
            { title: 'Звіт + план', tools: [], description: 'Фінансовий підсумок' },
          ],
        };
        return previewResult(preview);
      }

      return executeResult(`Ти — Senior PPC + SEO стратег. Аналіз перетину платного та органічного.
Сайт: ${siteUrl}

**КРОК 1:** Виклич get_gsc_search_analytics для "${siteUrl}" з dimensions=["query","page"], startDate за 30 днів, rowLimit=1000.
**КРОК 2:** Виклич get_search_terms${campaignFilter} з limit=500. Виклич get_keywords${campaignFilter}.
**КРОК 3:** Виклич get_ga4_report з dimensions=["sessionSource","sessionMedium"], metrics=["sessions","conversions","engagementRate"].

**КРОК 4 — ПЕРЕХРЕСНИЙ АНАЛІЗ:**
🔴 ДУБЛЮВАННЯ (позиція 1-3 + є реклама → вимкнути/знизити PPC)
🟡 ПІДТРИМКА (позиція 4-10 + реклама → залишити тимчасово)
🟢 МОЖЛИВІСТЬ (позиція 11-30 → запустити PPC)
🔵 SEO-GAP (є в Ads, немає в органіці → пріоритет для SEO)

**КРОК 5:** Звіт з фінансовим підсумком. Запитай підтвердження.`);
    }
  );
}
