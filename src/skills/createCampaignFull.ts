/**
 * Скіл: Створення Повної Кампанії з нуля
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerCreateCampaignFullSkill(server: McpServer): void {
  server.tool(
    'skill_create_campaign_full',
    `🚀 СКІЛ: Створення повної структури рекламної кампанії з нуля.
Кампанія → групи оголошень → ключові слова → RSA оголошення. Покроковий процес з підтвердженнями.

КОЛИ ВИКОРИСТОВУВАТИ:
- Клієнт каже "створи кампанію", "запусти рекламу", "потрібна нова кампанія"
- Коли потрібно створити кампанію від початку до кінця

⚠️ ОБОВ'ЯЗКОВО потрібен реальний URL сайту клієнта та бюджет!

РЕЗУЛЬТАТ: Покрокова інструкція створення повної структури кампанії.`,
    {
      businessName: z.string().describe(
        'Назва бізнесу або бренду (наприклад: "DocService", "МайстерСтеля")'
      ),
      product: z.string().describe(
        'Що рекламуємо — продукт або послуга (наприклад: "юридичні послуги", "натяжні стелі", "доставка піци")'
      ),
      websiteUrl: z.string().url().describe(
        '⚠️ РЕАЛЬНИЙ URL сайту клієнта (наприклад: "https://docservice.pro", "https://myshop.ua")'
      ),
      dailyBudget: z.string().describe(
        'Денний бюджет у валюті акаунту (наприклад: "500" для 500 грн/день)'
      ),
      targetLocation: z.string().optional().describe(
        'Географія таргетингу (наприклад: "Київ", "Вся Україна", "Львів та область")'
      ),
      language: z.string().optional().describe(
        'Мова оголошень: "uk", "ru", "en". За замовчуванням "uk".'
      ),
    },
    async ({ businessName, product, websiteUrl, dailyBudget, targetLocation, language }) => {
      const locationNote = targetLocation ? `\nГеографія: ${targetLocation}` : '';
      const lang = language || 'uk';

      const instructions = `Ти — Senior PPC-спеціаліст. Створи ПОВНУ СТРУКТУРУ рекламної кампанії з нуля.

📋 ДАНІ КЛІЄНТА:
- Бізнес: ${businessName}
- Продукт/послуга: ${product}
- Сайт: ${websiteUrl}
- Бюджет: ${dailyBudget}/день
- Мова: ${lang}${locationNote}

⚠️ КРИТИЧНО: URL сайту клієнта = "${websiteUrl}". ЗАВЖДИ використовуй ТІЛЬКИ цей URL для finalUrl оголошень!

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ:

**КРОК 1 — Інформація про акаунт:**
Виклич get_account_info. Запиши валюту та часовий пояс.

**КРОК 2 — Дослідження ключових слів:**
Виклич generate_keyword_ideas з seed keywords для "${product}".
Розбий ідеї на 2-4 тематичні групи (кластери).

**КРОК 3 — ПЛАН СТРУКТУРИ:**
Покажи користувачу план:

📊 **Структура кампанії:**
| Елемент | Деталі |
|---------|--------|
| Назва кампанії | [запропонуй] |
| Бюджет | ${dailyBudget}/день |
| Стратегія ставок | [рекомендація з поясненням] |
| Група 1 | [назва] → [5-10 keywords] |
| Група 2 | [назва] → [5-10 keywords] |
| ... | ... |

**КРОК 4 — ЗАПРОСИ ПІДТВЕРДЖЕННЯ ПЛАНУ:**
"Підтверджуєте цю структуру? (так/ні/змінити)"

**КРОК 5 — Після підтвердження — СТВОРЕННЯ:**
5.1. Виклич create_search_campaign з назвою та бюджетом ${dailyBudget}.
5.2. Для кожної групи:
  - Виклич create_ad_group з campaignId
  - Виклич add_keywords з ключовими словами
  - Виклич create_rsa_ad з headlines, descriptions та finalUrl="${websiteUrl}" (або відповідна підсторінка)

⚠️ ВАЖЛИВО: при create_rsa_ad ЗАВЖДИ використовуй "${websiteUrl}" або його підсторінки як finalUrl!

5.3. Додай базові мінус-слова (add_negative_keywords): "безкоштовно", "своїми руками", "відгуки", "реферат", "скачати".

**КРОК 6 — ФІНАЛЬНИЙ ЗВІТ:**
Покажи що створено:
- Кампанія: [назва] (ID: [id]) — статус PAUSED
- Група 1: [назва] — [N] keywords, [N] ads
- Група 2: [назва] — [N] keywords, [N] ads
- Мінус-слова: [N] додано

Запитай: "Активувати кампанію? (update_campaign_status → ENABLED)"`;

      return {
        content: [{ type: 'text', text: instructions }],
      };
    }
  );
}
