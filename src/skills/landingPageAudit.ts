/**
 * Скіл: Аудит Посадкових Сторінок
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerLandingPageAuditSkill(server: McpServer): void {
  server.tool(
    'skill_landing_page_audit',
    `🌐 СКІЛ: Аудит посадкових сторінок (лендингів).
Зіставляє Quality Score та CPC з Ads з bounce rate та конверсіями з GA4.

КОЛИ ВИКОРИСТОВУВАТИ:
- Клієнт каже "перевір лендинг", "чому висока ціна кліку", "низький Quality Score"
- При landingPageQuality = BELOW_AVERAGE
- Коли bounce rate > 60%

РЕЗУЛЬТАТ: Покрокова інструкція діагностики кожної landing page.`,
    {
      siteUrl: z.string().describe(
        'URL сайту в GSC. Отримай через get_gsc_sites.'
      ),
      campaignId: z.string().optional().describe(
        'ID кампанії. Отримай через get_campaigns.'
      ),
    },
    async ({ siteUrl, campaignId }) => {
      const campaignFilter = campaignId ? ` з campaignId="${campaignId}"` : '';

      const instructions = `Ти — Senior PPC + CRO-аналітик. Аудит посадкових сторінок.
Сайт: ${siteUrl}

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ:

**КРОК 1 — Quality Score:**
Виклич get_quality_score_report${campaignFilter}. Шукай landingPageQuality = "BELOW_AVERAGE".

**КРОК 2 — GA4 поведінка на лендингах:**
Виклич get_ga4_report з dimensions=["landingPagePlusQueryString","sessionSource"], metrics=["sessions","bounceRate","engagementRate","conversions","averageSessionDuration"].

**КРОК 3 — GSC органічні дані:**
Виклич get_gsc_search_analytics для "${siteUrl}" з dimensions=["page"] за 30 днів.

**КРОК 4 — Ads ефективність:**
Виклич get_ads${campaignFilter}. Збери finalUrls з оголошень.
Виклич get_keywords${campaignFilter} для QS.

**КРОК 5 — ДІАГНОСТИКА кожної landing page:**

🔴 КРИТИЧНА ПРОБЛЕМА: bounceRate > 70% І qualityScore ≤ 5
🟠 ПРОБЛЕМА ВІДПОВІДНОСТІ: keyword не відповідає лендингу
🟡 ДОРОГЕ БЕЗ КОНВЕРСІЙ: CPC вище середнього І 0 conversions
🟢 ЕФЕКТИВНА: engagementRate > 60%, є конверсії

**КРОК 6 — ЗВІТ та рекомендації.**`;

      return {
        content: [{ type: 'text', text: instructions }],
      };
    }
  );
}
