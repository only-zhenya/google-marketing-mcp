/**
 * Скіл: Комплексний Аудит Акаунту
 *
 * Повертає покрокову інструкцію для LLM, яку вона виконує автономно,
 * викликаючи потрібні tools крок за кроком.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerAccountAuditSkill(server: McpServer): void {
  server.tool(
    'skill_account_audit',
    `🔍 СКІЛ: Комплексний аудит Google Ads акаунту.
Виявляє причини падіння трафіку або зливу бюджету, порівнюючи дані Ads, GA4 та Search Console.

КОЛИ ВИКОРИСТОВУВАТИ:
- Клієнт каже "зроби аудит", "проаналізуй акаунт", "чому падає трафік", "куди зливається бюджет"
- На початку роботи з новим акаунтом
- Раз на місяць для моніторингу

РЕЗУЛЬТАТ: Покрокова інструкція яку ти ПОВИНЕН виконати — виклич всі зазначені інструменти по черзі.`,
    {
      campaignId: z.string().optional().describe(
        'ID конкретної кампанії для аудиту (якщо не вказано — аудит всього акаунту). Отримай ID через get_campaigns.'
      ),
      dateRange: z.string().optional().describe(
        'Кількість днів для аналізу (наприклад "30", "14"). За замовчуванням — 30 днів.'
      ),
      siteUrl: z.string().optional().describe(
        'URL сайту в GSC (наприклад "sc-domain:example.com"). Отримай через get_gsc_sites.'
      ),
    },
    async ({ campaignId, dateRange, siteUrl }) => {
      const days = dateRange ?? '30';
      const campaignNote = campaignId ? `Фокус на кампанії ID: ${campaignId}.` : 'Аналізуй весь акаунт.';
      const siteNote = siteUrl ? `GSC сайт: ${siteUrl}` : 'Спочатку виклич get_gsc_sites щоб знайти URL сайту.';

      const instructions = `Ти — Senior PPC-спеціаліст. Проведи КОМПЛЕКСНИЙ АУДИТ Google Ads акаунту за останні ${days} днів. ${campaignNote}
${siteNote}

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ (виконуй КРОК ЗА КРОКОМ, не пропускай жодного):

**КРОК 1 — Інформація про акаунт:**
Виклич get_account_info. Запиши: назву акаунту, валюту, часовий пояс.

**КРОК 2 — Огляд кампаній:**
Виклич get_account_overview. Запиши: кількість кампаній, загальні витрати, конверсії, CTR.

**КРОК 3 — Дані Google Analytics 4:**
Виклич get_ga4_report з метриками ["sessions", "conversions", "engagementRate", "bounceRate"] та вимірами ["sessionCampaignName", "sessionSource"]. Дати: startDate="${days}daysAgo", endDate="today".

**КРОК 4 — Пошукові запити (Search Terms):**
Виклич get_search_terms${campaignId ? ` з campaignId="${campaignId}"` : ''} з limit=500. Знайди запити з витратами > 0 та 0 конверсій — це кандидати в мінус-слова.

**КРОК 5 — Звіт ефективності:**
Виклич get_performance_report з датами останніх ${days} днів.

**КРОК 6 — Quality Score:**
Виклич get_quality_score_report${campaignId ? ` з campaignId="${campaignId}"` : ''}. Знайди keywords з QS ≤ 5.

**КРОК 7 — Утилізація бюджетів:**
Виклич get_budget_utilization. Знайди "budget limited" кампанії.

**КРОК 8 — Конверсійні дії:**
Виклич get_conversion_actions. Перевір чи є активні конверсії.

**КРОК 9 — Органіка (Google Search Console):**
${siteUrl ? `Виклич get_gsc_search_analytics для "${siteUrl}" з dimensions=["query","page"], startDate за ${days} днів.` : 'Виклич get_gsc_sites, потім get_gsc_search_analytics для основного сайту.'}

**КРОК 10 — Девайси:**
Виклич get_device_report за останні ${days} днів. Порівняй desktop vs mobile.

**КРОК 11 — АНАЛІЗ ТА ЗВІТ:**
Після отримання ВСІХ даних сформуй звіт:

---
## 🔍 Аудит акаунту — [назва акаунту] — [дата]

### Загальний стан
[Валюта, загальні цифри: витрати, конверсії, CPA, CTR]

### Знайдені проблеми
| # | Проблема | Доказ (цифри) | Рекомендована дія | Інструмент для виправлення |
|---|----------|--------------|-------------------|---------------------------|

### Сміттєві пошукові запити
[Список топ-20 запитів що зливають бюджет + готовий виклик add_negative_keywords]

### Quality Score проблеми
[Keywords з QS ≤ 5 та рекомендації]

### Budget Limited кампанії
[Які кампанії обмежені бюджетом]

### Девайси
[Порівняння desktop vs mobile]

### Топ-5 термінових дій
1. [найважливіше + інструмент]
2. ...
---

ВАЖЛИВО: Вказуй конкретні цифри та НАЗВИ кампаній/ключових слів, а не загальні слова.`;

      return {
        content: [{ type: 'text', text: instructions }],
      };
    }
  );
}
