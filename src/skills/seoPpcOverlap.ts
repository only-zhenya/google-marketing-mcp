/**
 * Скіл: SEO vs PPC — Аналіз Перетину
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerSeoPpcOverlapSkill(server: McpServer): void {
  server.tool(
    'skill_seo_ppc_overlap',
    `🔄 СКІЛ: SEO vs PPC — аналіз перетину.
Знаходить де реклама дублює органіку (зекономити бюджет) і де SEO слабке та потрібно підсилити PPC.

КОЛИ ВИКОРИСТОВУВАТИ:
- Клієнт каже "порівняй органіку з рекламою", "де можна зекономити", "SEO vs PPC"
- При оптимізації бюджету — вимкнути рекламу де вже є топ органіки
- Для пошуку зон зростання

РЕЗУЛЬТАТ: Покрокова інструкція крос-аналізу Search Console + Google Ads.`,
    {
      siteUrl: z.string().describe(
        'URL сайту в Google Search Console (наприклад "sc-domain:example.com"). Отримай через get_gsc_sites.'
      ),
      campaignId: z.string().optional().describe(
        'ID кампанії для аналізу (якщо не вказано — весь акаунт). Отримай через get_campaigns.'
      ),
    },
    async ({ siteUrl, campaignId }) => {
      const campaignFilter = campaignId ? ` з campaignId="${campaignId}"` : '';

      const instructions = `Ти — Senior PPC + SEO стратег. Проведи аналіз перетину між платним та органічним трафіком.
Сайт: ${siteUrl}

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ:

**КРОК 1 — Органічний трафік (GSC):**
Виклич get_gsc_search_analytics для "${siteUrl}" з dimensions=["query","page"], startDate за 30 днів, rowLimit=1000.

**КРОК 2 — Платний трафік (Ads):**
Виклич get_search_terms${campaignFilter} з limit=500.
Виклич get_keywords${campaignFilter}.

**КРОК 3 — GA4 конверсії:**
Виклич get_ga4_report з dimensions=["sessionSource","sessionMedium"], metrics=["sessions","conversions","engagementRate"].

**КРОК 4 — ПЕРЕХРЕСНИЙ АНАЛІЗ:**

🔴 ДУБЛЮВАННЯ (органічна позиція 1-3 + є реклама → можна вимкнути/знизити PPC):
🟡 ПІДТРИМКА (позиція 4-10 + реклама → залишити тимчасово)
🟢 МОЖЛИВІСТЬ (позиція 11-30 → запустити PPC)
🔵 SEO-GAP (є в Ads, немає в органіці → пріоритет для SEO)

**КРОК 5 — ЗВІТ з фінансовим підсумком та план дій.**
Запитай підтвердження.`;

      return {
        content: [{ type: 'text', text: instructions }],
      };
    }
  );
}
