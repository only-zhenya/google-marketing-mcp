/**
 * Скіл: Точки Зростання та Масштабування
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { modeSchema, previewResult, executeResult, SkillPreview } from './helpers';

export function registerGrowthOpportunitiesSkill(server: McpServer): void {
  server.tool(
    'skill_growth_opportunities',
    `🚀 СКІЛ: Точки зростання та масштабування.
Де SEO майже топ, які кампанії окупаються, нові ніші.

КОЛИ ВИКОРИСТОВУВАТИ:
- "хочу зростання", "збільшити продажі", "куди масштабуватись"

⚡ ПОРЯДОК: спочатку mode="preview", після підтвердження — mode="execute".`,
    {
      mode: modeSchema,
      siteUrl: z.string().describe('URL сайту в GSC. Отримай через get_gsc_sites.'),
      campaignId: z.string().optional().describe('ID кампанії. Отримай через get_campaigns.'),
      monthlyBudget: z.string().optional().describe('Місячний бюджет у валюті акаунту'),
    },
    async ({ mode, siteUrl, campaignId, monthlyBudget }) => {
      const budgetNote = monthlyBudget ? `Бюджет: ${monthlyBudget}/міс.` : '';
      const campaignFilter = campaignId ? ` з campaignId="${campaignId}"` : '';

      if (mode === 'preview') {
        const preview: SkillPreview = {
          title: '🚀 Точки Зростання',
          summary: `Пошук можливостей масштабування для ${siteUrl}. ${budgetNote}`,
          skillName: 'skill_growth_opportunities',
          estimatedTime: '3-5 хвилин',
          params: { siteUrl, campaignId, monthlyBudget },
          steps: [
            { title: '"Майже-топ" запити', tools: ['get_gsc_search_analytics'], description: 'Позиції 4-15, impressions > 100' },
            { title: 'Найкращі кампанії', tools: ['get_campaigns'], description: 'З конверсіями та прийнятним CPA' },
            { title: 'Budget limited', tools: ['get_budget_utilization'], description: 'Кампанії з обмеженим бюджетом' },
            { title: 'Keywords з потенціалом', tools: ['get_keywords'], description: 'QS ≥ 7 + конверсії' },
            { title: 'Нові ніші', tools: ['generate_keyword_ideas'], description: 'На основі топ keywords' },
            { title: 'GA4 джерела', tools: ['get_ga4_report'], description: 'Конверсії по каналах' },
            { title: 'Стратегія', tools: [], description: '🚀 швидко → 📈 середньостроково → 🔭 довгостроково' },
          ],
        };
        return previewResult(preview);
      }

      return executeResult(`Ти — Senior PPC Growth стратег. Знайди точки зростання.
Сайт: ${siteUrl}. ${budgetNote}

**КРОК 1:** Виклич get_gsc_search_analytics для "${siteUrl}" з dimensions=["query"], rowLimit=1000. Відфільтруй: позиція 4-15, impressions > 100.
**КРОК 2:** Виклич get_campaigns. Знайди кампанії з конверсіями та прийнятним CPA.
**КРОК 3:** Виклич get_budget_utilization.
**КРОК 4:** Виклич get_keywords${campaignFilter}. QS ≥ 7 + конверсії.
**КРОК 5:** Виклич generate_keyword_ideas на основі топ keywords.
**КРОК 6:** Виклич get_ga4_report: dimensions=["sessionCampaignName","sessionSource"], metrics=["sessions","conversions"].

**КРОК 7 — МОЖЛИВОСТІ:**
🚀 ШВИДКЕ ЗРОСТАННЯ (цього тижня): збільшити бюджети, підняти ставки
📈 СЕРЕДНЬОСТРОКОВІ (місяць): нові keyword групи
🔭 ДОВГОСТРОКОВІ: SEO пріоритети

План з конкретними числами. Запитай підтвердження.`);
    }
  );
}
