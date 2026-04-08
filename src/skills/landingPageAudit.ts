/**
 * Скіл: Аудит Посадкових Сторінок
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { modeSchema, previewResult, executeResult, SkillPreview } from './helpers';

export function registerLandingPageAuditSkill(server: McpServer): void {
  server.tool(
    'skill_landing_page_audit',
    `🌐 СКІЛ: Аудит посадкових сторінок.
QS та CPC з Ads + bounce rate та конверсії з GA4.

КОЛИ ВИКОРИСТОВУВАТИ:
- "перевір лендинг", "висока ціна кліку", "низький Quality Score"

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
          title: '🌐 Аудит Посадкових Сторінок',
          summary: `Діагностика landing pages: QS, bounce rate, конверсії для ${siteUrl}.`,
          skillName: 'skill_landing_page_audit',
          estimatedTime: '2-3 хвилини',
          params: { siteUrl, campaignId },
          steps: [
            { title: 'Quality Score', tools: ['get_quality_score_report'], description: 'landingPageQuality' },
            { title: 'GA4 поведінка', tools: ['get_ga4_report'], description: 'bounceRate, engagement, conversions' },
            { title: 'GSC органіка', tools: ['get_gsc_search_analytics'], description: 'Органічні дані сторінок' },
            { title: 'Ads ефективність', tools: ['get_ads', 'get_keywords'], description: 'finalUrls, QS' },
            { title: 'Діагностика', tools: [], description: '🔴 критична → 🟠 відповідність → 🟡 дорога → 🟢 ефективна' },
          ],
        };
        return previewResult(preview);
      }

      return executeResult(`Ти — Senior PPC + CRO-аналітик. Аудит посадкових сторінок.
Сайт: ${siteUrl}

**КРОК 1:** Виклич get_quality_score_report${campaignFilter}. Шукай landingPageQuality = "BELOW_AVERAGE".
**КРОК 2:** Виклич get_ga4_report з dimensions=["landingPagePlusQueryString","sessionSource"], metrics=["sessions","bounceRate","engagementRate","conversions","averageSessionDuration"].
**КРОК 3:** Виклич get_gsc_search_analytics для "${siteUrl}" з dimensions=["page"] за 30 днів.
**КРОК 4:** Виклич get_ads${campaignFilter}. Збери finalUrls. Виклич get_keywords${campaignFilter} для QS.

**КРОК 5 — ДІАГНОСТИКА:**
🔴 КРИТИЧНА: bounceRate > 70% І QS ≤ 5
🟠 ВІДПОВІДНІСТЬ: keyword не відповідає лендингу
🟡 ДОРОГА: CPC вище середнього І 0 conversions
🟢 ЕФЕКТИВНА: engagementRate > 60%, є конверсії

**КРОК 6:** Звіт та рекомендації.`);
    }
  );
}
