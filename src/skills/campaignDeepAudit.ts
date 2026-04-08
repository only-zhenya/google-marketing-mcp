/**
 * Скіл: Глибокий Аудит Кампанії
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { modeSchema, previewResult, executeResult, SkillPreview } from './helpers';

export function registerCampaignDeepAuditSkill(server: McpServer): void {
  server.tool(
    'skill_campaign_deep_audit',
    `🔬 СКІЛ: Глибокий аудит конкретної кампанії.
Структура, keywords, QS, ставки, девайси, GA4 — з оцінкою 1-10.

КОЛИ ВИКОРИСТОВУВАТИ:
- "проаудитуй кампанію X", "що не так з кампанією"

⚡ ПОРЯДОК: спочатку mode="preview", після підтвердження — mode="execute".`,
    {
      mode: modeSchema,
      campaignId: z.string().describe('ID кампанії. Отримай через get_campaigns.'),
      siteUrl: z.string().optional().describe('URL сайту в GSC для крос-аналізу.'),
    },
    async ({ mode, campaignId, siteUrl }) => {
      if (mode === 'preview') {
        const steps = [
          { title: 'Інформація акаунту', tools: ['get_account_info'], description: 'Базові дані' },
          { title: 'Структура кампанії', tools: ['get_campaign_details'], description: 'Налаштування кампанії' },
          { title: 'Групи оголошень', tools: ['get_ad_groups'], description: 'Структура груп' },
          { title: 'Keywords + QS', tools: ['get_keywords', 'get_quality_score_report'], description: 'Ключові слова та якість' },
          { title: 'Пошукові запити', tools: ['get_search_terms'], description: 'Топ-300 search terms' },
          { title: 'Мінус-слова', tools: ['get_negative_keywords'], description: 'Поточні мінус-слова' },
          { title: 'Оголошення', tools: ['get_ads'], description: 'RSA аналіз' },
          { title: 'Девайси', tools: ['get_device_report'], description: 'Desktop vs Mobile' },
          { title: 'GA4 дані', tools: ['get_ga4_report'], description: 'Конверсії, engagement, bounce' },
        ];
        if (siteUrl) {
          steps.push({ title: 'GSC дані', tools: ['get_gsc_search_analytics'], description: 'Органічні дані' });
        }
        steps.push({ title: 'Оцінка 1-10', tools: [], description: 'Рейтинг по кожному блоку' });

        const preview: SkillPreview = {
          title: '🔬 Глибокий Аудит Кампанії',
          summary: `Комплексний аудит кампанії ID: ${campaignId} з оцінкою по 10-бальній шкалі.`,
          skillName: 'skill_campaign_deep_audit',
          estimatedTime: '4-6 хвилин',
          params: { campaignId, siteUrl },
          steps,
        };
        return previewResult(preview);
      }

      const gscStep = siteUrl
        ? `\n**КРОК 7 — GSC:**\nВиклич get_gsc_search_analytics для "${siteUrl}" з dimensions=["query"] за 30 днів.`
        : '';

      return executeResult(`Ти — Senior PPC-аудитор. ГЛИБОКИЙ АУДИТ кампанії ID: ${campaignId}.

**КРОК 1:** Виклич get_account_info.
**КРОК 2:** Виклич get_campaign_details з campaignId="${campaignId}".
**КРОК 3:** Виклич get_ad_groups з campaignId="${campaignId}".
**КРОК 4:** Виклич get_keywords з campaignId="${campaignId}". Виклич get_quality_score_report з campaignId="${campaignId}".
**КРОК 5:** Виклич get_search_terms з campaignId="${campaignId}" limit=300.
**КРОК 6:** Виклич get_negative_keywords з campaignId="${campaignId}".
${gscStep}
**КРОК 8:** Виклич get_ads з campaignId="${campaignId}".
**КРОК 9:** Виклич get_device_report за 30 днів.
**КРОК 10:** Виклич get_ga4_report з dimensions=["sessionCampaignName"], metrics=["sessions","conversions","engagementRate","bounceRate"].

**КРОК 11 — ОЦІНКА:**
| Блок | Оцінка | Головна проблема |
|------|--------|-----------------|
| Структура | X/10 | ... |
| Keywords | X/10 | ... |
| QS | X/10 | ... |
| Мінус-слова | X/10 | ... |
| Оголошення | X/10 | ... |
| Конверсії | X/10 | ... |
| **ЗАГАЛЬНА** | X/10 | ... |

**КРОК 12:** План оптимізації з інструментами. Запроси підтвердження.`);
    }
  );
}
