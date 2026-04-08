/**
 * Скіл: Аудит Релевантності Ключових Слів
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { modeSchema, previewResult, executeResult, SkillPreview } from './helpers';

export function registerKeywordRelevanceSkill(server: McpServer): void {
  server.tool(
    'skill_keyword_relevance_audit',
    `🔑 СКІЛ: Аудит релевантності ключових слів.
Виявляє нерелевантні BROAD-запити, пропонує зниження ставок або зміну match type.

КОЛИ ВИКОРИСТОВУВАТИ:
- "перевір ключові слова", "чому дорогі кліки", "нерелевантний трафік"

⚡ ПОРЯДОК: спочатку mode="preview", після підтвердження — mode="execute".`,
    {
      mode: modeSchema,
      campaignId: z.string().optional().describe('ID кампанії. Отримай через get_campaigns.'),
      minSpend: z.string().optional().describe('Мін. витрати на keyword для аналізу (за замовч. 5)'),
    },
    async ({ mode, campaignId, minSpend }) => {
      const spendThreshold = minSpend ? Number(minSpend) : 5;
      const campaignFilter = campaignId ? ` з campaignId="${campaignId}"` : '';

      if (mode === 'preview') {
        const preview: SkillPreview = {
          title: '🔑 Аудит Релевантності Ключових Слів',
          summary: `Аналіз keywords з витратами > ${spendThreshold}. Класифікація та план дій.`,
          skillName: 'skill_keyword_relevance_audit',
          estimatedTime: '2-3 хвилини',
          params: { campaignId, minSpend: String(spendThreshold) },
          steps: [
            { title: 'Інформація акаунту', tools: ['get_account_info'], description: 'Базові дані' },
            { title: 'Ключові слова', tools: ['get_keywords'], description: 'Всі keywords' },
            { title: 'Пошукові запити', tools: ['get_search_terms'], description: 'Топ-500 search terms' },
            { title: 'Quality Score', tools: ['get_quality_score_report'], description: 'QS по keywords' },
            { title: 'Класифікація', tools: [], description: '🔴 критичні → 🟠 проблемні → 🟡 увага' },
            { title: 'Звіт + мінус-слова', tools: ['update_keyword_cpc', 'add_negative_keywords'], description: 'Конкретні дії' },
          ],
        };
        return previewResult(preview);
      }

      return executeResult(`Ти — Senior PPC-спеціаліст. АУДИТ РЕЛЕВАНТНОСТІ keywords.
Поріг витрат: ${spendThreshold}.

**КРОК 1:** Виклич get_account_info.
**КРОК 2:** Виклич get_keywords${campaignFilter}.
**КРОК 3:** Виклич get_search_terms${campaignFilter} з limit=500.
**КРОК 4:** Виклич get_quality_score_report${campaignFilter}.

**КРОК 5 — КЛАСИФІКАЦІЯ:**
🔴 КРИТИЧНО — BROAD + нерелевантні запити → знизити CPC 30-50%
🟠 ПРОБЛЕМНЕ — cost > CPA і 0 конверсій за 14+ днів → знизити CPC 50%
🟡 УВАГА — сміттєві search terms → add_negative_keywords

**КРОК 6 — ЗВІТ:**
| Keyword | Match Type | Витрати | Конверсії | QS | Дія |
|---------|-----------|---------|-----------|-----|-----|

### Мінус-слова для додавання
[готовий список]

### Потенційна економія: X/міс

Запроси підтвердження.`);
    }
  );
}
