/**
 * Скіл: Аудит Релевантності Ключових Слів
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerKeywordRelevanceSkill(server: McpServer): void {
  server.tool(
    'skill_keyword_relevance_audit',
    `🔑 СКІЛ: Аудит релевантності ключових слів.
Виявляє нерелевантні BROAD-запити що зливають бюджет, пропонує зниження ставок або зміну типу відповідності.

КОЛИ ВИКОРИСТОВУВАТИ:
- Клієнт каже "перевір ключові слова", "чому дорогі кліки", "нерелевантний трафік"
- При високому bounce rate або низькому Quality Score
- Коли багато витрат без конверсій

РЕЗУЛЬТАТ: Покрокова інструкція аудиту keywords з класифікацією та планом дій.`,
    {
      campaignId: z.string().optional().describe(
        'ID кампанії для аналізу (якщо не вказано — весь акаунт). Отримай ID через get_campaigns.'
      ),
      minSpend: z.string().optional().describe(
        'Мінімальні витрати на ключове слово для включення в аналіз (за замовчуванням 5)'
      ),
    },
    async ({ campaignId, minSpend }) => {
      const spendThreshold = minSpend ? Number(minSpend) : 5;
      const campaignFilter = campaignId ? ` з campaignId="${campaignId}"` : '';

      const instructions = `Ти — Senior PPC-спеціаліст. Проведи ДЕТАЛЬНИЙ АУДИТ РЕЛЕВАНТНОСТІ ключових слів.
Мінімальний поріг витрат для аналізу: ${spendThreshold} (валюта акаунту).

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ:

**КРОК 1 — Інформація про акаунт:**
Виклич get_account_info.

**КРОК 2 — Завантаж всі ключові слова:**
Виклич get_keywords${campaignFilter}.

**КРОК 3 — Завантаж пошукові запити:**
Виклич get_search_terms${campaignFilter} з limit=500.

**КРОК 4 — Quality Score:**
Виклич get_quality_score_report${campaignFilter}.

**КРОК 5 — КЛАСИФІКАЦІЯ:**

🔴 КРИТИЧНО — BROAD match + нерелевантні запити:
  → ДІЯ: знизити CPC на 30-50% (update_keyword_cpc) АБО видалити

🟠 ПРОБЛЕМНЕ:
  - cost > [середній CPA] і conversions = 0 за 14+ днів
  → ДІЯ: знизити CPC на 50%

🟡 УВАГА — сміттєві search terms:
  → ДІЯ: додати в мінус-слова (add_negative_keywords)

**КРОК 6 — ЗВІТ:**
---
## Аудит релевантності — [назва акаунту]

### Критичні проблеми
| Keyword | Match Type | Витрати | Конверсії | QS | Дія |
|---------|-----------|---------|-----------|-----|-----|

### Мінус-слова для додавання
[готовий список]

### Потенційна економія: X грн/міс
---

Запроси підтвердження і виклич інструменти.`;

      return {
        content: [{ type: 'text', text: instructions }],
      };
    }
  );
}
