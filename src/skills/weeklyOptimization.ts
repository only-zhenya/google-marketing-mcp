/**
 * Скіл: Щотижнева Оптимізація
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { modeSchema, previewResult, executeResult, SkillPreview } from './helpers';

export function registerWeeklyOptimizationSkill(server: McpServer): void {
  server.tool(
    'skill_weekly_optimization',
    `📅 СКІЛ: Щотижнева оптимізація акаунту.
Бюджети, мінус-слова, ставки, QS, оголошення — стандартний чекліст.

КОЛИ ВИКОРИСТОВУВАТИ:
- "зроби оптимізацію", "тижнева перевірка", "щотижнева оптимізація"

⚡ ПОРЯДОК: спочатку mode="preview", після підтвердження — mode="execute".`,
    {
      mode: modeSchema,
      siteUrl: z.string().optional().describe('URL сайту в GSC (опціонально). Отримай через get_gsc_sites.'),
    },
    async ({ mode, siteUrl }) => {
      if (mode === 'preview') {
        const steps = [
          { title: '1️⃣ Огляд акаунту', tools: ['get_account_info', 'get_account_overview', 'get_budget_utilization'], description: 'KPI + budget limited' },
          { title: '2️⃣ Harvest мінус-слів', tools: ['get_search_terms', 'get_negative_keywords', 'add_negative_keywords'], description: 'Сміттєві запити → блок' },
          { title: '3️⃣ Quality Score', tools: ['get_quality_score_report'], description: 'QS ≤ 3 → видалити, 4-6 → покращити, ≥ 7 → підвищити' },
          { title: '4️⃣ Ставки', tools: ['get_keywords', 'update_keyword_cpc'], description: 'CPC корекція за перфомансом' },
          { title: '5️⃣ Бюджети', tools: ['update_campaign_budget'], description: 'Перерозподіл бюджетів' },
          { title: '6️⃣ Оголошення', tools: ['get_ads'], description: 'Паузувати слабкі (CTR < 50% від середнього)' },
        ];
        if (siteUrl) {
          steps.push({ title: '7️⃣ SEO контекст', tools: ['get_gsc_search_analytics'], description: 'Нові можливості з GSC' });
        }

        const preview: SkillPreview = {
          title: '📅 Щотижнева Оптимізація',
          summary: `Стандартний чекліст: бюджети, мінус-слова, ставки, QS, ads.`,
          skillName: 'skill_weekly_optimization',
          estimatedTime: '5-8 хвилин',
          params: { siteUrl },
          steps,
        };
        return previewResult(preview);
      }

      return executeResult(`Ти — Senior PPC-менеджер. ЩОТИЖНЕВА ОПТИМІЗАЦІЯ.

**1️⃣ ОГЛЯД (5 хв):**
- get_account_info → валюта
- get_account_overview → KPI
- get_budget_utilization → budget limited?

**2️⃣ HARVEST МІНУС-СЛІВ (10 хв):**
- get_search_terms з limit=500
- get_negative_keywords
- Сміттєві: cost > 0, conversions = 0
- → add_negative_keywords

**3️⃣ QUALITY SCORE (5 хв):**
- get_quality_score_report
- QS ≤ 3 → знизити CPC або видалити
- QS 4-6 → план покращення
- QS ≥ 7 → підвищити ставку

**4️⃣ СТАВКИ (10 хв):**
- get_keywords
- Конверсії > 0 і CPA < target → підвищити
- Cost > target × 2 і 0 conversions → знизити
- → update_keyword_cpc

**5️⃣ БЮДЖЕТИ (5 хв):**
- Budget limited + хороший CPA → ↑
- No conversions → ↓

**6️⃣ ОГОЛОШЕННЯ (5 хв):**
- get_ads
- CTR < 50% від середнього → пауза

${siteUrl ? `**7️⃣ SEO:**\n- get_gsc_search_analytics для "${siteUrl}" за 7 днів\n- Нові можливості?` : ''}

**ЗВІТ:**
| Дія | До | Після | Інструмент |
|-----|----|-------|-----------|

Запроси підтвердження для кожного блоку.`);
    }
  );
}
