/**
 * Скіл: Точки Зростання та Масштабування
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerGrowthOpportunitiesSkill(server: McpServer): void {
  server.tool(
    'skill_growth_opportunities',
    `🚀 СКІЛ: Знаходження точок зростання та масштабування.
Запити де SEO майже топ, кампанії що окупаються і потребують більше бюджету, нові ніші.

КОЛИ ВИКОРИСТОВУВАТИ:
- Клієнт каже "хочу зростання", "як збільшити продажі", "куди масштабуватись"
- Коли акаунт стабільний і потрібно шукати нові можливості
- Для стратегічного планування

РЕЗУЛЬТАТ: Покрокова інструкція пошуку можливостей зростання.`,
    {
      siteUrl: z.string().describe(
        'URL сайту в GSC. Отримай через get_gsc_sites.'
      ),
      campaignId: z.string().optional().describe(
        'ID кампанії. Отримай через get_campaigns.'
      ),
      monthlyBudget: z.string().optional().describe(
        'Поточний місячний бюджет у валюті акаунту (наприклад "50000")'
      ),
    },
    async ({ siteUrl, campaignId, monthlyBudget }) => {
      const budgetNote = monthlyBudget ? `Місячний бюджет: ${monthlyBudget}.` : '';
      const campaignFilter = campaignId ? ` з campaignId="${campaignId}"` : '';

      const instructions = `Ти — Senior PPC Growth стратег. Знайди точки зростання.
Сайт: ${siteUrl}
${budgetNote}

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ:

**КРОК 1 — "Майже-топ" запити (GSC):**
Виклич get_gsc_search_analytics для "${siteUrl}" з dimensions=["query"], rowLimit=1000.
Відфільтруй: позиція 4-15, impressions > 100.

**КРОК 2 — Найкращі кампанії (Ads):**
Виклич get_campaigns. Знайди кампанії з конверсіями та прийнятним CPA.

**КРОК 3 — Budget limited кампанії:**
Виклич get_budget_utilization.

**КРОК 4 — Ключові слова з потенціалом:**
Виклич get_keywords${campaignFilter}. QS ≥ 7 + конверсії.

**КРОК 5 — Нові ніші:**
Виклич generate_keyword_ideas на основі топ keywords.

**КРОК 6 — GA4 джерела:**
Виклич get_ga4_report: dimensions=["sessionCampaignName","sessionSource"], metrics=["sessions","conversions"].

**КРОК 7 — МОЖЛИВОСТІ:**
🚀 ШВИДКЕ ЗРОСТАННЯ (цього тижня): збільшити бюджети, підняти ставки
📈 СЕРЕДНЬОСТРОКОВІ (місяць): нові keyword групи
🔭 ДОВГОСТРОКОВІ: SEO пріоритети

Покажи план з конкретними числами та запитай підтвердження.`;

      return {
        content: [{ type: 'text', text: instructions }],
      };
    }
  );
}
