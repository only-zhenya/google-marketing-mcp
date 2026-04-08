/**
 * Скіл: Генерація RSA Оголошень
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { modeSchema, previewResult, executeResult, SkillPreview } from './helpers';

export function registerAdCreationSkill(server: McpServer): void {
  server.tool(
    'skill_ad_creation',
    `📝 СКІЛ: Генерація та запуск Responsive Search Ads (RSA).
Створює оголошення за формулами AIDA та CTR-магнітів.

КОЛИ ВИКОРИСТОВУВАТИ:
- Клієнт каже "створи оголошення", "напиши рекламу", "потрібна нова реклама"

⚠️ ОБОВ'ЯЗКОВО потрібен реальний URL сайту клієнта!
⚡ ПОРЯДОК: спочатку mode="preview", після підтвердження — mode="execute".`,
    {
      mode: modeSchema,
      adGroupId: z.string().describe('ID групи оголошень. Отримай через get_ad_groups.'),
      product: z.string().describe('Продукт або послуга (наприклад: "юридичні послуги Київ")'),
      finalUrl: z.string().url().describe('⚠️ РЕАЛЬНИЙ URL посадкової сторінки!'),
      usp: z.string().optional().describe('Унікальна торгова пропозиція'),
      targetAudience: z.string().optional().describe('Цільова аудиторія'),
      language: z.string().optional().describe('Мова: "uk" (за замовч.), "ru", "en"'),
    },
    async ({ mode, adGroupId, product, finalUrl, usp, targetAudience, language }) => {
      const lang = language || 'uk';

      if (mode === 'preview') {
        const preview: SkillPreview = {
          title: '📝 Генерація RSA Оголошень',
          summary: `Створення RSA для "${product}" → ${finalUrl}. Мова: ${lang}.`,
          skillName: 'skill_ad_creation',
          estimatedTime: '2-3 хвилини',
          params: { adGroupId, product, finalUrl, usp, targetAudience, language: lang },
          steps: [
            { title: 'Дослідження ключових слів', tools: ['generate_keyword_ideas'], description: 'Топ-10 за обсягом пошуку' },
            { title: 'Аналіз поточних оголошень', tools: ['get_ads'], description: 'Перевірка існуючих ads' },
            { title: 'Генерація 7+ заголовків', tools: [], description: 'AIDA, Pain+Benefit, Proof формули' },
            { title: 'Генерація 4+ описів', tools: [], description: 'CTA + конкурентні переваги' },
            { title: 'Показ результату', tools: [], description: 'Таблиця headlines + descriptions' },
            { title: 'Підтвердження → публікація', tools: ['create_rsa_ad'], description: `finalUrl = ${finalUrl}` },
          ],
        };
        return previewResult(preview);
      }

      const uspNote = usp ? `\nКонкурентні переваги: ${usp}` : '';
      const audienceNote = targetAudience ? `\nЦільова аудиторія: ${targetAudience}` : '';

      return executeResult(`Ти — Senior PPC-копірайтер. Створи RSA-оголошення для групи ${adGroupId}.
Продукт: ${product}
Посадкова: ${finalUrl}
Мова: ${lang}${uspNote}${audienceNote}

⚠️ finalUrl ПОВИНЕН бути "${finalUrl}" — НІКОЛИ не змінюй!

**КРОК 1 — Ключові слова:**
Виклич generate_keyword_ideas з seed keywords для "${product}". Топ-10 за обсягом.

**КРОК 2 — Поточні оголошення:**
Виклич get_ads з adGroupId="${adGroupId}".

**КРОК 3 — Headlines (7+ шт, до 30 символів):**
- 3+ з ключовими словами
- 2+ з числами/цифрами
- 1+ з CTA
- Формули: AIDA, Pain+Benefit, Proof

**КРОК 4 — Descriptions (4+ шт, до 90 символів):**
- Кожен з CTA
- Різні кути: вигода, гарантія, термін, доказ

**КРОК 5 — Покажи таблицю і поясни ефективність кожного.**

**КРОК 6 — Запитай:** "Підтверджуєте публікацію? (так/ні/змінити)"

**КРОК 7 — Після "так":** create_rsa_ad з adGroupId="${adGroupId}", finalUrl="${finalUrl}".`);
    }
  );
}
