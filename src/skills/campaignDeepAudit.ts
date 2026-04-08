/**
 * Скіл: Глибокий Аудит Кампанії
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerCampaignDeepAuditSkill(server: McpServer): void {
  server.tool(
    'skill_campaign_deep_audit',
    `🔬 СКІЛ: Глибокий аудит конкретної кампанії.
Комплексна перевірка: структура, ключові слова, оголошення, QS, ставки, девайси, GA4 — з оцінкою 1-10.

КОЛИ ВИКОРИСТОВУВАТИ:
- Клієнт каже "проаудитуй кампанію X", "що не так з кампанією"
- Коли конкретна кампанія показує погані результати
- Для детальної оптимізації однієї кампанії

РЕЗУЛЬТАТ: Покрокова інструкція глибокого аудиту з оцінкою по 10-бальній шкалі.`,
    {
      campaignId: z.string().describe(
        'ID кампанії для глибокого аудиту. Отримай через get_campaigns.'
      ),
      siteUrl: z.string().optional().describe(
        'URL сайту в GSC для крос-аналізу. Отримай через get_gsc_sites.'
      ),
    },
    async ({ campaignId, siteUrl }) => {
      const gscStep = siteUrl
        ? `\n**КРОК 7 — GSC:**\nВиклич get_gsc_search_analytics для "${siteUrl}" з dimensions=["query"] за 30 днів.`
        : '';

      const instructions = `Ти — Senior PPC-аудитор. ГЛИБОКИЙ АУДИТ кампанії ID: ${campaignId}.

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ:

**КРОК 1 — Інформація про акаунт:**
Виклич get_account_info.

**КРОК 2 — Структура кампанії:**
Виклич get_campaign_details з campaignId="${campaignId}".

**КРОК 3 — Групи оголошень:**
Виклич get_ad_groups з campaignId="${campaignId}".

**КРОК 4 — Ключові слова та Quality Score:**
Виклич get_keywords з campaignId="${campaignId}".
Виклич get_quality_score_report з campaignId="${campaignId}".

**КРОК 5 — Пошукові запити:**
Виклич get_search_terms з campaignId="${campaignId}" limit=300.

**КРОК 6 — Мінус-слова:**
Виклич get_negative_keywords з campaignId="${campaignId}".
${gscStep}
**КРОК 8 — Оголошення:**
Виклич get_ads з campaignId="${campaignId}".

**КРОК 9 — Девайси:**
Виклич get_device_report за 30 днів з campaignId="${campaignId}".

**КРОК 10 — GA4:**
Виклич get_ga4_report з dimensions=["sessionCampaignName"], metrics=["sessions","conversions","engagementRate","bounceRate"].

**КРОК 11 — ОЦІНКА (1-10):**
| Блок | Оцінка | Головна проблема |
|------|--------|-----------------|
| Структура | X/10 | ... |
| Keywords | X/10 | ... |
| QS | X/10 | ... |
| Мінус-слова | X/10 | ... |
| Оголошення | X/10 | ... |
| Конверсії | X/10 | ... |
| **ЗАГАЛЬНА** | X/10 | ... |

**КРОК 12 — ПЛАН ОПТИМІЗАЦІЇ з конкретними інструментами.**
Запроси підтвердження.`;

      return {
        content: [{ type: 'text', text: instructions }],
      };
    }
  );
}
