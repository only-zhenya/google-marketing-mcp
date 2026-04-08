/**
 * Скіл: Комплексний Аудит Акаунту
 * Режим preview → показує план | execute → покрокова інструкція
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { modeSchema, previewResult, executeResult, SkillPreview } from './helpers';

export function registerAccountAuditSkill(server: McpServer): void {
  server.tool(
    'skill_account_audit',
    `🔍 СКІЛ: Комплексний аудит Google Ads акаунту.
Виявляє причини падіння трафіку або зливу бюджету, порівнюючи дані Ads, GA4 та Search Console.

КОЛИ ВИКОРИСТОВУВАТИ:
- Клієнт каже "зроби аудит", "проаналізуй акаунт", "чому падає трафік", "куди зливається бюджет"

⚡ ПОРЯДОК: спочатку виклич з mode="preview", покажи план користувачу, після підтвердження — з mode="execute".`,
    {
      mode: modeSchema,
      campaignId: z.string().optional().describe('ID кампанії (опціонально). Отримай через get_campaigns.'),
      dateRange: z.string().optional().describe('Кількість днів для аналізу. За замовчуванням 30.'),
      siteUrl: z.string().optional().describe('URL сайту в GSC. Отримай через get_gsc_sites.'),
    },
    async ({ mode, campaignId, dateRange, siteUrl }) => {
      const days = dateRange ?? '30';

      if (mode === 'preview') {
        const preview: SkillPreview = {
          title: '🔍 Комплексний Аудит Акаунту',
          summary: `Повний аудит Google Ads за останні ${days} днів: дані акаунту, кампанії, GA4, search terms, QS, бюджети, конверсії, GSC, девайси.`,
          skillName: 'skill_account_audit',
          estimatedTime: '3-5 хвилин',
          params: { campaignId, dateRange: days, siteUrl },
          steps: [
            { title: 'Інформація про акаунт', tools: ['get_account_info'], description: 'Назва, валюта, часовий пояс' },
            { title: 'Огляд кампаній', tools: ['get_account_overview'], description: 'Витрати, конверсії, CTR' },
            { title: 'GA4 дані', tools: ['get_ga4_report'], description: 'sessions, conversions, engagementRate, bounceRate' },
            { title: 'Пошукові запити', tools: ['get_search_terms'], description: 'Топ-500, пошук сміття' },
            { title: 'Звіт ефективності', tools: ['get_performance_report'], description: `Перфоманс за ${days} днів` },
            { title: 'Quality Score', tools: ['get_quality_score_report'], description: 'Keywords з QS ≤ 5' },
            { title: 'Бюджети', tools: ['get_budget_utilization'], description: 'Budget limited кампанії' },
            { title: 'Конверсії', tools: ['get_conversion_actions'], description: 'Активні конверсійні дії' },
            { title: 'GSC органіка', tools: ['get_gsc_search_analytics'], description: 'Органічні запити та сторінки' },
            { title: 'Девайси', tools: ['get_device_report'], description: 'Desktop vs Mobile' },
            { title: 'Аналіз та звіт', tools: [], description: 'Проблеми, рекомендації, топ-5 дій' },
          ],
        };
        return previewResult(preview);
      }

      const campaignNote = campaignId ? `Фокус на кампанії ID: ${campaignId}.` : 'Аналізуй весь акаунт.';
      const siteNote = siteUrl ? `GSC сайт: ${siteUrl}` : 'Спочатку виклич get_gsc_sites щоб знайти URL сайту.';

      return executeResult(`Ти — Senior PPC-спеціаліст. Проведи КОМПЛЕКСНИЙ АУДИТ Google Ads акаунту за останні ${days} днів. ${campaignNote}
${siteNote}

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ (виконуй КРОК ЗА КРОКОМ):

**КРОК 1 — Інформація про акаунт:**
Виклич get_account_info. Запиши: назву акаунту, валюту, часовий пояс.

**КРОК 2 — Огляд кампаній:**
Виклич get_account_overview. Запиши: кількість кампаній, загальні витрати, конверсії, CTR.

**КРОК 3 — Дані Google Analytics 4:**
Виклич get_ga4_report з метриками ["sessions", "conversions", "engagementRate", "bounceRate"] та вимірами ["sessionCampaignName", "sessionSource"]. Дати: startDate="${days}daysAgo", endDate="today".

**КРОК 4 — Пошукові запити:**
Виклич get_search_terms${campaignId ? ` з campaignId="${campaignId}"` : ''} з limit=500. Знайди запити з витратами > 0 та 0 конверсій.

**КРОК 5 — Звіт ефективності:**
Виклич get_performance_report з датами останніх ${days} днів.

**КРОК 6 — Quality Score:**
Виклич get_quality_score_report${campaignId ? ` з campaignId="${campaignId}"` : ''}. Знайди keywords з QS ≤ 5.

**КРОК 7 — Утилізація бюджетів:**
Виклич get_budget_utilization. Знайди "budget limited" кампанії.

**КРОК 8 — Конверсійні дії:**
Виклич get_conversion_actions. Перевір чи є активні конверсії.

**КРОК 9 — Органіка (GSC):**
${siteUrl ? `Виклич get_gsc_search_analytics для "${siteUrl}" з dimensions=["query","page"], startDate за ${days} днів.` : 'Виклич get_gsc_sites, потім get_gsc_search_analytics для основного сайту.'}

**КРОК 10 — Девайси:**
Виклич get_device_report за останні ${days} днів.

**КРОК 11 — ЗВІТ:**
---
## 🔍 Аудит акаунту — [назва] — [дата]

### Загальний стан
[Валюта, витрати, конверсії, CPA, CTR]

### Знайдені проблеми
| # | Проблема | Доказ (цифри) | Рекомендована дія | Інструмент |
|---|----------|--------------|-------------------|------------|

### Сміттєві пошукові запити
[Топ-20 + виклик add_negative_keywords]

### Quality Score проблеми
[Keywords з QS ≤ 5]

### Budget Limited кампанії

### Девайси
[Desktop vs Mobile]

### Топ-5 термінових дій
1. [найважливіше + інструмент]
---

ВАЖЛИВО: Конкретні цифри та НАЗВИ, а не загальні слова.`);
    }
  );
}
