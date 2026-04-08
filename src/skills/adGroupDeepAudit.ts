/**
 * Скіл: Глибокий Аудит Групи Оголошень
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { modeSchema, previewResult, executeResult, SkillPreview } from './helpers';

export function registerAdGroupDeepAuditSkill(server: McpServer): void {
  server.tool(
    'skill_ad_group_deep_audit',
    `🔎 СКІЛ: Глибокий аудит групи оголошень.
Заголовки/описи за психологічними формулами, відповідність keywords, A/B порівняння.

КОЛИ ВИКОРИСТОВУВАТИ:
- "перевір групу X", "покращ рекламу в групі"

⚡ ПОРЯДОК: спочатку mode="preview", після підтвердження — mode="execute".`,
    {
      mode: modeSchema,
      adGroupId: z.string().describe('ID групи оголошень. Отримай через get_ad_groups.'),
      niche: z.string().optional().describe('Ніша бізнесу (напр. "юридичні послуги")'),
    },
    async ({ mode, adGroupId, niche }) => {
      const nicheNote = niche ? `Ніша: "${niche}".` : 'Визнач нішу з контексту.';

      if (mode === 'preview') {
        const preview: SkillPreview = {
          title: '🔎 Глибокий Аудит Групи Оголошень',
          summary: `Аудит групи ${adGroupId}: headlines/descriptions, keyword входження, A/B. ${nicheNote}`,
          skillName: 'skill_ad_group_deep_audit',
          estimatedTime: '3-4 хвилини',
          params: { adGroupId, niche },
          steps: [
            { title: 'Оголошення', tools: ['get_ads'], description: 'Всі RSA в групі' },
            { title: 'Keywords', tools: ['get_keywords'], description: 'Ключові слова групи' },
            { title: 'Search terms', tools: ['get_search_terms'], description: 'Пошукові запити' },
            { title: 'Аналіз заголовків', tools: [], description: '10 критеріїв якості' },
            { title: 'Аналіз описів', tools: [], description: '7 критеріїв' },
            { title: 'Психо-сегменти', tools: [], description: 'Ціна, якість, швидкість, проблема' },
            { title: 'A/B порівняння', tools: [], description: 'Якщо > 1 оголошення' },
            { title: 'Нові headlines', tools: ['create_rsa_ad'], description: 'Генерація + публікація' },
          ],
        };
        return previewResult(preview);
      }

      return executeResult(`Ти — Senior PPC-копірайтер. ГЛИБОКИЙ АУДИТ групи ${adGroupId}.
${nicheNote}

**КРОК 1:** Виклич get_ads з adGroupId="${adGroupId}".
**КРОК 2:** Виклич get_keywords, відфільтруй по adGroupId="${adGroupId}".
**КРОК 3:** Виклич get_search_terms, відфільтруй по adGroupId="${adGroupId}".

**КРОК 4 — ЗАГОЛОВКИ (10 критеріїв):**
1. Входження keyword 2. Конкретність (цифри) 3. USP
4. Емоційний тригер 5. CTA 6. Довжина (25-30)
7. Різноманіття 8. Локальний сигнал 9. Числа 10. Відповідність LP

**КРОК 5 — ОПИСИ (7 критеріїв)**
**КРОК 6 — Покриття сегментів:** ціна, якість, швидкість, проблема
**КРОК 7 — A/B порівняння** (якщо > 1 оголошення)
**КРОК 8:** Звіт + нові headlines/descriptions + підтвердження create_rsa_ad.`);
    }
  );
}
