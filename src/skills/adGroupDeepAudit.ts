/**
 * Скіл: Глибокий Аудит Групи Оголошень
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerAdGroupDeepAuditSkill(server: McpServer): void {
  server.tool(
    'skill_ad_group_deep_audit',
    `🔎 СКІЛ: Глибокий аудит групи оголошень.
Аналіз заголовків/описів за психологічними формулами, відповідність ключовим словам, A/B порівняння.

КОЛИ ВИКОРИСТОВУВАТИ:
- Клієнт каже "перевір групу X", "покращ рекламу в групі"
- Для A/B аналізу оголошень всередині групи
- Коли група має низький CTR або QS

РЕЗУЛЬТАТ: Покрокова інструкція глибокого аудиту групи з генерацією нових оголошень.`,
    {
      adGroupId: z.string().describe(
        'ID групи оголошень для аудиту. Отримай через get_ad_groups.'
      ),
      niche: z.string().optional().describe(
        'Ніша бізнесу (наприклад: "юридичні послуги", "інтернет-магазин меблів")'
      ),
    },
    async ({ adGroupId, niche }) => {
      const nicheNote = niche ? `Ніша: "${niche}".` : 'Визнач нішу з контексту keywords.';

      const instructions = `Ти — Senior PPC-копірайтер. ГЛИБОКИЙ АУДИТ групи оголошень ID: ${adGroupId}.
${nicheNote}

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ:

**КРОК 1 — Оголошення:**
Виклич get_ads з adGroupId="${adGroupId}".

**КРОК 2 — Keywords:**
Виклич get_keywords та відфільтруй по adGroupId="${adGroupId}".

**КРОК 3 — Search terms:**
Виклич get_search_terms та відфільтруй по adGroupId="${adGroupId}".

**КРОК 4 — АНАЛІЗ ЗАГОЛОВКІВ (10 критеріїв):**
1. Входження ключового слова
2. Конкретність (цифри/факти)
3. USP
4. Емоційний тригер
5. CTA
6. Довжина (25-30 символів)
7. Різноманіття типів
8. Локальний сигнал
9. Числа та дані
10. Відповідність landing page

**КРОК 5 — АНАЛІЗ ОПИСІВ (7 критеріїв)**
**КРОК 6 — Покриття психологічних сегментів** (ціна, якість, швидкість, проблема)
**КРОК 7 — A/B порівняння** якщо > 1 оголошення
**КРОК 8 — ЗВІТ + нові headlines/descriptions + підтвердження create_rsa_ad.**`;

      return {
        content: [{ type: 'text', text: instructions }],
      };
    }
  );
}
