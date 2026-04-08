/**
 * Скіл: Оптимізація Бюджетів та Ставок
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { modeSchema, previewResult, executeResult, SkillPreview } from './helpers';

export function registerBudgetOptimizerSkill(server: McpServer): void {
  server.tool(
    'skill_budget_optimizer',
    `💰 СКІЛ: Оптимізація бюджетів та ставок CPC.
Аналізує ефективність, пропонує зміни бюджетів/ставок.

КОЛИ ВИКОРИСТОВУВАТИ:
- "оптимізуй бюджет", "знизити CPA", "зменшити витрати"

⚡ ПОРЯДОК: спочатку mode="preview", після підтвердження — mode="execute".`,
    {
      mode: modeSchema,
      campaignId: z.string().optional().describe('ID кампанії. Отримай через get_campaigns.'),
      targetCpa: z.string().optional().describe('Цільовий CPA у валюті акаунту'),
    },
    async ({ mode, campaignId, targetCpa }) => {
      const cpaNote = targetCpa ? `Цільовий CPA: ${targetCpa}` : 'Орієнтуватись на середній';
      const campaignFilter = campaignId ? ` з campaignId="${campaignId}"` : '';

      if (mode === 'preview') {
        const preview: SkillPreview = {
          title: '💰 Оптимізація Бюджетів та Ставок',
          summary: `Аналіз ефективності keywords та кампаній. ${cpaNote}.`,
          skillName: 'skill_budget_optimizer',
          estimatedTime: '3-4 хвилини',
          params: { campaignId, targetCpa },
          steps: [
            { title: 'Інформація акаунту', tools: ['get_account_info'], description: 'Валюта' },
            { title: 'Ключові слова', tools: ['get_keywords'], description: 'CPC, витрати, конверсії, QS' },
            { title: 'GA4 конверсії', tools: ['get_ga4_report'], description: 'Реальний зв\'язок витрати→результат' },
            { title: 'Бюджети', tools: ['get_campaigns', 'get_budget_utilization'], description: 'Budget limited?' },
            { title: 'Аналіз keywords', tools: [], description: 'Класифікація: знизити/призупинити/підвищити' },
            { title: 'Аналіз бюджетів', tools: [], description: 'Перерозподіл бюджетів' },
            { title: 'План дій', tools: ['update_keyword_cpc', 'update_campaign_budget'], description: 'Конкретні зміни' },
          ],
        };
        return previewResult(preview);
      }

      return executeResult(`Ти — Senior PPC-спеціаліст. Оптимізуй бюджети та ставки.
${cpaNote}.

**КРОК 1:** Виклич get_account_info. Валюта.

**КРОК 2:** Виклич get_keywords${campaignFilter}. CPC, витрати, конверсії, QS.

**КРОК 3:** Виклич get_ga4_report з metrics=["conversions","sessions","engagementRate"], dimensions=["sessionCampaignName"].

**КРОК 4:** Виклич get_campaigns та get_budget_utilization.

**КРОК 5 — КЛАСИФІКАЦІЯ keywords:**

🔴 ЗНИЗИТИ CPC: QS ≤ 4 І CPC вище середнього
🟡 ПРИЗУПИНИТИ: витрати > CPA × 3 і 0 конверсій 30+ днів
🟢 ПІДВИЩИТИ CPC: QS ≥ 7 І CTR вище середнього І є конверсії

**КРОК 6 — БЮДЖЕТИ:**
🟢 ПІДВИЩИТИ: budget limited + конверсії + CPA ≤ цільового
🔴 ЗНИЗИТИ: 0 конверсій або CPA >> цільового

**КРОК 7 — ПЛАН:**
| Keyword/Campaign | Поточне | Рекомендація | Зміна | Ефект |
|-----------------|---------|-------------|-------|-------|

**КРОК 8:** Запроси підтвердження → update_keyword_cpc / update_campaign_budget.`);
    }
  );
}
