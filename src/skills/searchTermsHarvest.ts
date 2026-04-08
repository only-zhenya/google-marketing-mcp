/**
 * Скіл: Harvest Сміттєвих Запитів
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { modeSchema, previewResult, executeResult, SkillPreview } from './helpers';

export function registerSearchTermsHarvestSkill(server: McpServer): void {
  server.tool(
    'skill_search_terms_harvest',
    `🧹 СКІЛ: Очищення від сміттєвих пошукових запитів.
Знаходить запити без конверсій, формує мінус-слова.

КОЛИ ВИКОРИСТОВУВАТИ:
- "почисти запити", "багато сміття", "додай мінус-слова"

⚡ ПОРЯДОК: спочатку mode="preview", після підтвердження — mode="execute".`,
    {
      mode: modeSchema,
      campaignId: z.string().optional().describe('ID кампанії. Отримай через get_campaigns.'),
      spendThreshold: z.string().optional().describe('Мін. витрати на запит (за замовч. 3)'),
      days: z.string().optional().describe('Кількість днів (за замовч. 14)'),
    },
    async ({ mode, campaignId, spendThreshold, days }) => {
      const threshold = spendThreshold ? Number(spendThreshold) : 3;
      const period = days ? Number(days) : 14;
      const campaignFilter = campaignId ? ` з campaignId="${campaignId}"` : '';

      if (mode === 'preview') {
        const preview: SkillPreview = {
          title: '🧹 Harvest Сміттєвих Запитів',
          summary: `Аналіз search terms за ${period} днів. Поріг: ${threshold}.`,
          skillName: 'skill_search_terms_harvest',
          estimatedTime: '2-3 хвилини',
          params: { campaignId, spendThreshold: String(threshold), days: String(period) },
          steps: [
            { title: 'Інформація акаунту', tools: ['get_account_info'], description: 'Валюта' },
            { title: 'Пошукові запити', tools: ['get_search_terms'], description: 'Топ-500' },
            { title: 'Поточні мінус-слова', tools: ['get_negative_keywords'], description: 'Щоб не дублювати' },
            { title: 'Фільтрація сміття', tools: [], description: `Витрати > ${threshold}, 0 конверсій` },
            { title: 'Пріоритизація', tools: [], description: '🔴 критично → 🟠 важливо → 🟡 увага' },
            { title: 'Додавання мінус-слів', tools: ['add_negative_keywords'], description: 'Блокування сміття' },
          ],
        };
        return previewResult(preview);
      }

      return executeResult(`Ти — Senior PPC-спеціаліст. HARVEST пошукових запитів за ${period} днів.
Поріг: ${threshold}.

**КРОК 1:** Виклич get_account_info.
**КРОК 2:** Виклич get_search_terms${campaignFilter} з limit=500.
**КРОК 3:** Виклич get_negative_keywords${campaignFilter}.

**КРОК 4 — ФІЛЬТРАЦІЯ:**
Запити де витрати > ${threshold} та конверсій = 0 та НЕ є мінус-словом.
Категорії: "як", "що таке", "безкоштовно", "своїми руками", "відео", "реферат", "скачати"

**КРОК 5 — ПРІОРИТИЗАЦІЯ:**
🔴 КРИТИЧНО (витрати > ${threshold * 5}): негайно
🟠 ВАЖЛИВО (${threshold * 2}-${threshold * 5})
🟡 УВАГА (${threshold}-${threshold * 2})

**КРОК 6 — ЗВІТ:**
| Запит | Витрати | Кліки | Категорія | Рекомендація |
Потенційна економія: ~X/міс

**КРОК 7:** Підтвердження → add_negative_keywords`);
    }
  );
}
