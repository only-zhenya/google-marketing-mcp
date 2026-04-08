/**
 * Скіл: Створення Повної Кампанії з нуля
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { modeSchema, previewResult, executeResult, SkillPreview } from './helpers';

export function registerCreateCampaignFullSkill(server: McpServer): void {
  server.tool(
    'skill_create_campaign_full',
    `🚀 СКІЛ: Створення повної рекламної кампанії з нуля.
Кампанія → групи оголошень → ключові слова → RSA оголошення.

КОЛИ ВИКОРИСТОВУВАТИ:
- Клієнт каже "створи кампанію", "запусти рекламу", "потрібна нова кампанія"

⚠️ ОБОВ'ЯЗКОВО потрібен URL сайту та бюджет!
⚡ ПОРЯДОК: спочатку mode="preview", після підтвердження — mode="execute".`,
    {
      mode: modeSchema,
      businessName: z.string().describe('Назва бізнесу'),
      product: z.string().describe('Продукт/послуга'),
      websiteUrl: z.string().url().describe('⚠️ РЕАЛЬНИЙ URL сайту клієнта'),
      dailyBudget: z.string().describe('Денний бюджет у валюті акаунту'),
      targetLocation: z.string().optional().describe('Географія (напр. "Київ")'),
      language: z.string().optional().describe('Мова: "uk", "ru", "en"'),
    },
    async ({ mode, businessName, product, websiteUrl, dailyBudget, targetLocation, language }) => {
      const lang = language || 'uk';
      const locationNote = targetLocation || 'не вказано';

      if (mode === 'preview') {
        const preview: SkillPreview = {
          title: '🚀 Створення Повної Кампанії',
          summary: `Кампанія для "${businessName}" — ${product}. Бюджет: ${dailyBudget}/день. Сайт: ${websiteUrl}`,
          skillName: 'skill_create_campaign_full',
          estimatedTime: '5-8 хвилин',
          params: { businessName, product, websiteUrl, dailyBudget, targetLocation: locationNote, language: lang },
          steps: [
            { title: 'Інформація акаунту', tools: ['get_account_info'], description: 'Валюта, часовий пояс' },
            { title: 'Дослідження keywords', tools: ['generate_keyword_ideas'], description: 'Seed keywords → кластери' },
            { title: 'Показ плану структури', tools: [], description: 'Кампанія → групи → keywords' },
            { title: 'Підтвердження плану', tools: [], description: '⚡ Запит підтвердження' },
            { title: 'Створення кампанії', tools: ['create_search_campaign'], description: `Бюджет ${dailyBudget}/день` },
            { title: 'Створення груп + keywords', tools: ['create_ad_group', 'add_keywords'], description: '2-4 тематичні групи' },
            { title: 'Створення RSA', tools: ['create_rsa_ad'], description: `finalUrl = ${websiteUrl}` },
            { title: 'Мінус-слова', tools: ['add_negative_keywords'], description: 'Базові стоп-слова' },
          ],
        };
        return previewResult(preview);
      }

      return executeResult(`Ти — Senior PPC-спеціаліст. Створи ПОВНУ СТРУКТУРУ кампанії.

📋 ДАНІ:
- Бізнес: ${businessName}
- Продукт: ${product}
- Сайт: ${websiteUrl}
- Бюджет: ${dailyBudget}/день
- Мова: ${lang}
${targetLocation ? `- Географія: ${targetLocation}` : ''}

⚠️ URL = "${websiteUrl}" — ЗАВЖДИ використовуй ТІЛЬКИ цей URL!

**КРОК 1:** Виклич get_account_info.

**КРОК 2:** Виклич generate_keyword_ideas для "${product}". Розбий на 2-4 кластери.

**КРОК 3 — ПОКАЖИ ПЛАН:**
| Елемент | Деталі |
|---------|--------|
| Кампанія | [назва] |
| Бюджет | ${dailyBudget}/день |
| Стратегія | [рекомендація] |
| Група 1 | [назва] → [keywords] |
| Група 2 | [назва] → [keywords] |

**КРОК 4:** Запитай підтвердження плану.

**КРОК 5 — Після підтвердження:**
5.1. create_search_campaign з бюджетом ${dailyBudget}.
5.2. Для кожної групи:
  - create_ad_group
  - add_keywords
  - create_rsa_ad з finalUrl="${websiteUrl}"
5.3. add_negative_keywords: "безкоштовно", "своїми руками", "відгуки", "реферат", "скачати"

**КРОК 6 — ФІНАЛЬНИЙ ЗВІТ:**
- Кампанія: [назва] (ID) — статус PAUSED
- Групи: ...
- Запитай: "Активувати кампанію?"`);
    }
  );
}
