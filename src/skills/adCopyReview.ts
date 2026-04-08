/**
 * Скіл: Аналіз Якості Оголошень
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { modeSchema, previewResult, executeResult, SkillPreview } from './helpers';

export function registerAdCopyReviewSkill(server: McpServer): void {
  server.tool(
    'skill_ad_copy_review',
    `📊 СКІЛ: Аналіз якості текстів оголошень.
Порівнює CTR та конверсії, виявляє слабкі тексти, пропонує паузу або переписування.

КОЛИ ВИКОРИСТОВУВАТИ:
- "перевір оголошення", "чому низький CTR", "покращ тексти"

⚡ ПОРЯДОК: спочатку mode="preview", після підтвердження — mode="execute".`,
    {
      mode: modeSchema,
      adGroupId: z.string().optional().describe('ID групи оголошень. Отримай через get_ad_groups.'),
      campaignId: z.string().optional().describe('ID кампанії. Отримай через get_campaigns.'),
    },
    async ({ mode, adGroupId, campaignId }) => {
      const adGroupFilter = adGroupId ? ` з adGroupId="${adGroupId}"` : '';

      if (mode === 'preview') {
        const preview: SkillPreview = {
          title: '📊 Аналіз Якості Оголошень',
          summary: `Аудит текстів RSA: входження keywords, CTA, числа, CTR порівняння.`,
          skillName: 'skill_ad_copy_review',
          estimatedTime: '2-3 хвилини',
          params: { adGroupId, campaignId },
          steps: [
            { title: 'Завантаж оголошення', tools: ['get_ads'], description: 'Всі RSA' },
            { title: 'Групи оголошень', tools: ['get_ad_groups'], description: 'Контекст груп' },
            { title: 'Keywords', tools: ['get_keywords'], description: 'Для перевірки входжень' },
            { title: 'Аналіз якості', tools: [], description: 'Keyword insertion, CTA, числа, CTR' },
            { title: 'Класифікація', tools: [], description: '🔴 паузувати → 🟠 переписати → 🟢 залишити' },
            { title: 'Рекомендації', tools: ['update_ad_status'], description: 'Пауза слабких ads' },
          ],
        };
        return previewResult(preview);
      }

      return executeResult(`Ти — Senior PPC-копірайтер. АУДИТ ЯКОСТІ ОГОЛОШЕНЬ.
${adGroupId ? `Фокус: група ${adGroupId}.` : 'Всі активні групи.'}

**КРОК 1:** Виклич get_ads${adGroupFilter}${campaignId ? ` або з campaignId="${campaignId}"` : ''}.
**КРОК 2:** Виклич get_ad_groups${campaignId ? ` з campaignId="${campaignId}"` : ''}.
**КРОК 3:** Виклич get_keywords${campaignId ? ` з campaignId="${campaignId}"` : ''}.

**КРОК 4 — ЯКІСТЬ ТЕКСТУ (для кожного):**
□ Входження ключового слова в заголовку?
□ Конкретна цифра/факт?
□ Чіткий CTA в описі?
□ Заголовки не повторюються?

📊 ПЕРФОМАНС:
□ CTR вище/нижче середнього?
□ Є конверсії?

**КРОК 5 — КЛАСИФІКАЦІЯ:**
🔴 ПАУЗУВАТИ: CTR < 50% від середнього / 0 конверсій
🟠 ПЕРЕПИСАТИ: відсутній CTA або keywords
🟢 ЗАЛИШИТИ: топ-перфомер

**КРОК 6:** Покажи звіт + запитай підтвердження.`);
    }
  );
}
