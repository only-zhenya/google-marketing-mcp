/**
 * Скіл: Щотижнева Оптимізація
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerWeeklyOptimizationSkill(server: McpServer): void {
  server.tool(
    'skill_weekly_optimization',
    `📅 СКІЛ: Щотижнева оптимізація акаунту.
Стандартна процедура: перевірка бюджетів, harvest мінус-слів, коригування ставок, перевірка QS.

КОЛИ ВИКОРИСТОВУВАТИ:
- Клієнт каже "зроби оптимізацію", "тижнева перевірка", "щотижнева оптимізація"
- Раз на тиждень як стандартна процедура
- Коли потрібен загальний чекап

РЕЗУЛЬТАТ: Чекліст з 6-7 кроків для стандартної щотижневої оптимізації.`,
    {
      siteUrl: z.string().optional().describe(
        'URL сайту в GSC (опціонально). Отримай через get_gsc_sites.'
      ),
    },
    async ({ siteUrl }) => {
      const instructions = `Ти — Senior PPC-менеджер. Проведи ЩОТИЖНЕВУ ОПТИМІЗАЦІЮ акаунту.

ОБОВ'ЯЗКОВИЙ ЧЕКЛІСТ (виконуй по порядку):

**1️⃣ ОГЛЯД АКАУНТУ (5 хв):**
- get_account_info → запиши валюту
- get_account_overview → загальні KPI
- get_budget_utilization → budget limited?

**2️⃣ HARVEST МІНУС-СЛІВ (10 хв):**
- get_search_terms з limit=500
- get_negative_keywords
- Знайди сміттєві запити (cost > 0, conversions = 0)
- → add_negative_keywords

**3️⃣ QUALITY SCORE ПЕРЕВІРКА (5 хв):**
- get_quality_score_report
- QS ≤ 3 → знизити CPC або видалити
- QS 4-6 → план покращення
- QS ≥ 7 → можливість збільшити ставку

**4️⃣ СТАВКИ (10 хв):**
- get_keywords
- Keywords з conversions > 0 і CPA < target → підвищити CPC
- Keywords з cost > target CPA × 2 і 0 conversions → знизити CPC
- → update_keyword_cpc

**5️⃣ БЮДЖЕТИ (5 хв):**
- Budget limited + хороший CPA → update_campaign_budget ↑
- No conversions → update_campaign_budget ↓

**6️⃣ ОГОЛОШЕННЯ (5 хв):**
- get_ads
- Паузувати ads з CTR < 50% від середнього (якщо є альтернативи)

${siteUrl ? `**7️⃣ SEO КОНТЕКСТ:**\n- get_gsc_search_analytics для "${siteUrl}" за 7 днів\n- Нові можливості?` : ''}

**ФІНАЛЬНИЙ ЗВІТ:**
| Дія | До | Після | Інструмент |
|-----|----|-------|-----------|

Запроси підтвердження для кожного блоку змін.`;

      return {
        content: [{ type: 'text', text: instructions }],
      };
    }
  );
}
