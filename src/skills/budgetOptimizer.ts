/**
 * Скіл: Оптимізація Бюджетів та Ставок
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerBudgetOptimizerSkill(server: McpServer): void {
  server.tool(
    'skill_budget_optimizer',
    `💰 СКІЛ: Оптимізація бюджетів кампаній та ставок CPC.
Аналізує ефективність та конверсії з GA4, пропонує конкретні зміни бюджетів та ставок.

КОЛИ ВИКОРИСТОВУВАТИ:
- Клієнт каже "оптимізуй бюджет", "знизити CPA", "зменшити витрати", "підвищити ефективність"
- При високому CPA або низьких конверсіях
- Коли є budget limited кампанії

РЕЗУЛЬТАТ: Покрокова інструкція аналізу та оптимізації бюджетів/ставок.`,
    {
      campaignId: z.string().optional().describe(
        'ID кампанії (якщо не вказано — аналіз всіх активних кампаній). Отримай ID через get_campaigns.'
      ),
      targetCpa: z.string().optional().describe(
        'Цільова вартість конверсії (CPA) у валюті акаунту, наприклад "100"'
      ),
    },
    async ({ campaignId, targetCpa }) => {
      const cpaNote = targetCpa ? `Цільовий CPA: ${targetCpa} (валюта акаунту).` : 'Цільовий CPA не вказано — орієнтуйся на середній по акаунту.';
      const campaignFilter = campaignId ? ` з campaignId="${campaignId}"` : '';

      const instructions = `Ти — Senior PPC-спеціаліст з оптимізації ставок. Проведи аналіз і оптимізуй бюджети та ставки.
${cpaNote}

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ:

**КРОК 1 — Інформація про акаунт:**
Виклич get_account_info. Запиши валюту.

**КРОК 2 — Завантаж ключові слова:**
Виклич get_keywords${campaignFilter}. Для кожного запиши: текст, matchType, CPC, витрати, конверсії, Quality Score.

**КРОК 3 — Дані конверсій з GA4:**
Виклич get_ga4_report з метриками ["conversions", "sessions", "engagementRate"] та вимірами ["sessionCampaignName"]. Це дасть реальний зв'язок витрати→результат.

**КРОК 4 — Дані кампаній та бюджетів:**
Виклич get_campaigns та get_budget_utilization. Знайди budget limited кампанії.

**КРОК 5 — АНАЛІЗ КЛЮЧОВИХ СЛІВ (правила рішень):**

Категоризуй кожне ключове слово:

🔴 ЗНИЗИТИ СТАВКУ (update_keyword_cpc):
  - Quality Score ≤ 4 І CPC вище середнього
  - Витрати > [середній CPA × 2] і 0 конверсій

🟡 ПРИЗУПИНИТИ:
  - Витрати > [середній CPA × 3] і 0 конверсій за 30+ днів

🟢 ПІДВИЩИТИ СТАВКУ (update_keyword_cpc):
  - Quality Score ≥ 7 І CTR вище середнього І є конверсії

**КРОК 6 — АНАЛІЗ БЮДЖЕТІВ:**

🟢 ПІДВИЩИТИ БЮДЖЕТ (update_campaign_budget):
  - Кампанія budget limited І є конверсії і CPA ≤ цільового

🔴 ЗНИЗИТИ БЮДЖЕТ (update_campaign_budget):
  - Конверсій 0 або CPA >> цільового

**КРОК 7 — ПЛАН ДІЙ:**
| Keyword/Campaign | Поточне | Рекомендація | Зміна | Очікуваний ефект |
|-----------------|---------|-------------|-------|-----------------|

**КРОК 8 — ЗАПРОСИ ПІДТВЕРДЖЕННЯ:**
Тільки після "так" — виклич відповідні інструменти.`;

      return {
        content: [{ type: 'text', text: instructions }],
      };
    }
  );
}
