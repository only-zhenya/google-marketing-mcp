import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { GoogleAdsService } from './services/googleAds.service';
import { GoogleAnalyticsService } from './services/googleAnalytics.service';
import { GoogleSearchConsoleService } from './services/googleSearchConsole.service';
import {
  CampaignStatusEnum,
  KeywordMatchTypeEnum,
  NegativeKeywordLevel,
  AdGroupStatusEnum,
  AdStatusEnum,
} from './types';

// Load env specific to execution context (works even if triggered from Claude Desktop)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`CRITICAL: Missing required environment variable: ${name}`);
  }
  return value;
}

const credentials = {
  developerToken: getRequiredEnvVar('GOOGLE_ADS_DEVELOPER_TOKEN'),
  clientId: getRequiredEnvVar('GOOGLE_ADS_CLIENT_ID'),
  clientSecret: getRequiredEnvVar('GOOGLE_ADS_CLIENT_SECRET'),
  refreshToken: getRequiredEnvVar('GOOGLE_ADS_REFRESH_TOKEN'),
  customerId: getRequiredEnvVar('GOOGLE_ADS_CUSTOMER_ID'),
};

const adsService = new GoogleAdsService(credentials);
const gaService = new GoogleAnalyticsService();
const gscService = new GoogleSearchConsoleService();

const server = new McpServer({
  name: 'google-marketing-specialist',
  version: '1.0.0',
});

// ─────────────────────────────────────────────
// Кампанії (Campaigns)
// ─────────────────────────────────────────────

server.tool(
  'get_campaigns',
  'Retrieve a list of all Google Ads campaigns with their current configuration and performance metrics over the last 30 days.',
  {},
  async () => {
    const campaigns = await adsService.listAllCampaigns();
    return {
      content: [{ type: 'text', text: JSON.stringify(campaigns, null, 2) }],
    };
  }
);

server.tool(
  'update_campaign_status',
  'Pause or enable a specific Google Ads campaign.',
  {
    campaignId: z.string().describe('The ID of the campaign to update'),
    status: z.enum(['ENABLED', 'PAUSED']).describe('New status for the campaign'),
  },
  async ({ campaignId, status }) => {
    const result = await adsService.updateStatus(campaignId, status as CampaignStatusEnum);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  'update_campaign_budget',
  'Update the daily budget for a campaign. The amount should be specified in normal currency (e.g., 50.00).',
  {
    campaignId: z.string().describe('The ID of the campaign'),
    amount: z.number().positive().describe('The new daily budget amount'),
  },
  async ({ campaignId, amount }) => {
    const result = await adsService.updateDailyBudget(campaignId, amount);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  'get_performance_report',
  'Generate an account-level performance report for a specific date range, broken down by date and campaign.',
  {
    startDate: z.string().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().describe('End date in YYYY-MM-DD format'),
  },
  async ({ startDate, endDate }) => {
    const report = await adsService.getPerformanceReport(startDate, endDate);
    return {
      content: [{ type: 'text', text: JSON.stringify(report, null, 2) }],
    };
  }
);

// ─────────────────────────────────────────────
// Ключові слова (Keywords)
// ─────────────────────────────────────────────

server.tool(
  'get_keywords',
  'Retrieve a list of keywords with metrics. Can optionally filter by campaign ID.',
  {
    campaignId: z.string().optional().describe('Optional campaign ID to filter by'),
  },
  async ({ campaignId }) => {
    const keywords = await adsService.getKeywords(campaignId);
    return {
      content: [{ type: 'text', text: JSON.stringify(keywords, null, 2) }],
    };
  }
);

server.tool(
  'add_keywords',
  'Add multiple new keywords to a specific ad group.',
  {
    adGroupId: z.string().describe('The ID of the ad group'),
    keywords: z.array(
      z.object({
        text: z.string().describe('The keyword text'),
        matchType: z.enum(['BROAD', 'PHRASE', 'EXACT']).describe('Keyword match type'),
        cpcBidAmount: z.number().optional().describe('Optional CPC bid amount in normal currency'),
      })
    ).describe('List of keywords to add'),
  },
  async ({ adGroupId, keywords }) => {
    const result = await adsService.addKeywords(adGroupId, keywords as any[]);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  'remove_keyword',
  'Remove a specific keyword from an ad group using its criterion ID.',
  {
    adGroupId: z.string().describe('The ID of the ad group'),
    criterionId: z.string().describe('The criterion ID of the keyword to remove'),
  },
  async ({ adGroupId, criterionId }) => {
    const result = await adsService.removeKeyword(adGroupId, criterionId);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  'update_keyword_cpc',
  'Change the CPC bid for an individual keyword.',
  {
    adGroupId: z.string().describe('The ID of the ad group'),
    criterionId: z.string().describe('The criterion ID of the keyword'),
    cpcAmount: z.number().positive().describe('New CPC amount in normal currency'),
  },
  async ({ adGroupId, criterionId, cpcAmount }) => {
    const result = await adsService.updateKeywordCpc(adGroupId, criterionId, cpcAmount);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ─────────────────────────────────────────────
// Пошукові запити (Search Terms)
// ─────────────────────────────────────────────

server.tool(
  'get_search_terms',
  'Retrieve actual search queries (search terms) that triggered ads, along with their performance metrics.',
  {
    campaignId: z.string().optional().describe('Optional campaign ID filter'),
    limit: z.number().optional().describe('Maximum number of results to fetch (default 100)'),
  },
  async ({ campaignId, limit }) => {
    const terms = await adsService.getSearchTerms(campaignId, limit);
    return {
      content: [{ type: 'text', text: JSON.stringify(terms, null, 2) }],
    };
  }
);

// ─────────────────────────────────────────────
// Мінус-слова (Negative Keywords)
// ─────────────────────────────────────────────

server.tool(
  'get_negative_keywords',
  'Retrieve existing negative keywords, optionally filtered by campaign.',
  {
    campaignId: z.string().optional().describe('Optional campaign ID filter'),
  },
  async ({ campaignId }) => {
    const negatives = await adsService.getNegativeKeywords(campaignId);
    return {
      content: [{ type: 'text', text: JSON.stringify(negatives, null, 2) }],
    };
  }
);

server.tool(
  'add_negative_keywords',
  'Add negative keywords at the campaign or ad group level.',
  {
    level: z.enum(['campaign', 'ad_group']).describe('Target level for the negative keywords'),
    resourceId: z.string().describe('The ID of the campaign or ad group'),
    keywords: z.array(
      z.object({
        text: z.string().describe('Negative keyword text'),
        matchType: z.enum(['BROAD', 'PHRASE', 'EXACT']).describe('Match type'),
      })
    ).describe('List of negative keywords'),
  },
  async ({ level, resourceId, keywords }) => {
    const result = await adsService.addNegativeKeywords(level as NegativeKeywordLevel, resourceId, keywords as any[]);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ─────────────────────────────────────────────
// Групи оголошень (Ad Groups)
// ─────────────────────────────────────────────

server.tool(
  'get_ad_groups',
  'Retrieve a list of ad groups with performance metrics.',
  {
    campaignId: z.string().optional().describe('Optional campaign ID filter'),
  },
  async ({ campaignId }) => {
    const groups = await adsService.getAdGroups(campaignId);
    return {
      content: [{ type: 'text', text: JSON.stringify(groups, null, 2) }],
    };
  }
);

server.tool(
  'create_ad_group',
  'Create a new ad group within a campaign.',
  {
    campaignId: z.string().describe('The ID of the parent campaign'),
    name: z.string().describe('Name for the new ad group'),
    cpcBidAmount: z.number().positive().describe('Default CPC bid amount for the ad group'),
  },
  async ({ campaignId, name, cpcBidAmount }) => {
    const result = await adsService.createAdGroup(campaignId, name, cpcBidAmount);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  'update_ad_group',
  'Update an ad group details (name, status, or standard CPC bid).',
  {
    adGroupId: z.string().describe('The ID of the ad group'),
    name: z.string().optional().describe('New name'),
    cpcBidAmount: z.number().optional().describe('New default CPC amount'),
    status: z.enum(['ENABLED', 'PAUSED']).optional().describe('New status'),
  },
  async ({ adGroupId, name, cpcBidAmount, status }) => {
    const result = await adsService.updateAdGroup(adGroupId, { name, cpcBidAmount, status: status as AdGroupStatusEnum });
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  'remove_ad_group',
  'Remove (delete) an ad group. Warning: also deletes all keywords and ads inside it!',
  {
    adGroupId: z.string().describe('The ID of the ad group'),
  },
  async ({ adGroupId }) => {
    const result = await adsService.removeAdGroup(adGroupId);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ─────────────────────────────────────────────
// Оголошення (Ads)
// ─────────────────────────────────────────────

server.tool(
  'get_ads',
  'Retrieve ads and their metrics, optionally filtered by ad group.',
  {
    adGroupId: z.string().optional().describe('Optional ad group ID filter'),
  },
  async ({ adGroupId }) => {
    const ads = await adsService.getAds(adGroupId);
    return {
      content: [{ type: 'text', text: JSON.stringify(ads, null, 2) }],
    };
  }
);

server.tool(
  'create_rsa_ad',
  'Create a new Responsive Search Ad (RSA). Requires at least 3 headlines and 2 descriptions.',
  {
    adGroupId: z.string().describe('The ID of the ad group'),
    headlines: z.array(z.string().max(30)).min(3).describe('Array of headlines (up to 30 chars each)'),
    descriptions: z.array(z.string().max(90)).min(2).describe('Array of descriptions (up to 90 chars each)'),
    finalUrl: z.string().url().describe('The landing page URL'),
  },
  async ({ adGroupId, headlines, descriptions, finalUrl }) => {
    const result = await adsService.createResponsiveSearchAd(adGroupId, headlines, descriptions, finalUrl);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  'update_ad_status',
  'Pause or enable a specific ad.',
  {
    adGroupId: z.string().describe('The ID of the ad group'),
    adId: z.string().describe('The ID of the ad to update'),
    status: z.enum(['ENABLED', 'PAUSED']).describe('New status for the ad'),
  },
  async ({ adGroupId, adId, status }) => {
    const result = await adsService.updateAdStatus(adGroupId, adId, status as AdStatusEnum);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ─────────────────────────────────────────────
// Планувальник ключових слів (Keyword Planner)
// ─────────────────────────────────────────────

server.tool(
  'generate_keyword_ideas',
  'Generate keyword ideas, search volumes, and competition metrics based on seed keywords. Note: Requires Basic or Standard API access level.',
  {
    keywords: z.array(z.string()).min(1).describe('Array of seed keywords (e.g., ["plumber near me"])'),
    languageId: z.number().optional().describe('Optional Language ID (e.g., 1000 for English, 1033 for Ukrainian)'),
    geoTargetId: z.number().optional().describe('Optional Geo Target ID (e.g., 2804 for Ukraine, 2840 for US)'),
  },
  async ({ keywords, languageId, geoTargetId }) => {
    const result = await adsService.generateKeywordIdeas({ keywords, languageId, geoTargetId });
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ─────────────────────────────────────────────
// Універсальна Аналітика (Google Analytics 4)
// ─────────────────────────────────────────────

server.tool(
  'get_ga4_report',
  'Run a custom Google Analytics 4 report to get traffic, conversions, and metrics.',
  {
    propertyId: z.string().optional().describe('Optional GA4 Property ID. If empty, uses the default from .env'),
    dimensions: z.array(z.string()).describe('List of GA4 dimensions (e.g., ["sessionSource", "landingPagePlusQueryString"])'),
    metrics: z.array(z.string()).describe('List of GA4 metrics (e.g., ["sessions", "conversions", "totalUsers"])'),
    startDate: z.string().optional().describe('Start date (default "30daysAgo")'),
    endDate: z.string().optional().describe('End date (default "today")'),
  },
  async ({ propertyId, dimensions, metrics, startDate, endDate }) => {
    const report = await gaService.getReport({ propertyId, dimensions, metrics, startDate, endDate });
    return {
      content: [{ type: 'text', text: JSON.stringify(report, null, 2) }],
    };
  }
);

// ─────────────────────────────────────────────
// Пошукова Консоль (Google Search Console)
// ─────────────────────────────────────────────

server.tool(
  'get_gsc_sites',
  'Retrieve a list of all verified websites in Google Search Console.',
  {},
  async () => {
    const sites = await gscService.listSites();
    return {
      content: [{ type: 'text', text: JSON.stringify(sites, null, 2) }],
    };
  }
);

server.tool(
  'get_gsc_search_analytics',
  'Query Search Analytics in GSC to see organic clicks, impressions, CTR, and position.',
  {
    siteUrl: z.string().describe('The verified site URL (e.g. "sc-domain:docservice.pro" or "https://example.com/")'),
    startDate: z.string().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().describe('End date in YYYY-MM-DD format'),
    dimensions: z.array(z.string()).optional().describe('Optional list of dimensions (e.g., ["query", "page", "device", "country"])'),
    rowLimit: z.number().optional().describe('Optional row limit (default is 100 max)'),
  },
  async ({ siteUrl, startDate, endDate, dimensions, rowLimit }) => {
    const data = await gscService.querySearchAnalytics(siteUrl, startDate, endDate, dimensions, rowLimit);
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ─────────────────────────────────────────────
// MCP Prompts — Маркетингові Скіли
// ─────────────────────────────────────────────

server.registerPrompt(
  'skill_account_audit',
  {
    title: 'Комплексний Аудит Акаунту',
    description: 'Комплексний аудит акаунту: виявляє причини падіння трафіку або зливу бюджету, порівнюючи дані Ads, GA4 та Search Console.',
    argsSchema: {
      campaignId: z.string().optional().describe('ID конкретної кампанії для аудиту (якщо не вказано — аудит всього акаунту)'),
      dateRange: z.string().optional().describe('Кількість днів для аналізу (наприклад "30", "14"). За замовчуванням — 30 днів.'),
    },
  },
  async ({ campaignId, dateRange }) => {
    const days = dateRange ?? '30';
    const campaignNote = campaignId ? `Фокус на кампанії ID: ${campaignId}.` : 'Аналізуй весь акаунт.';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Ти — Senior PPC-спеціаліст. Проведи КОМПЛЕКСНИЙ АУДИТ Google Ads акаунту за останні ${days} днів. ${campaignNote}

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ (виконуй КРОК ЗА КРОКОМ, не пропускай жодного):

**КРОК 1 — Завантаж дані кампаній:**
Виклич get_campaigns. Запиши: назви, статуси, бюджети, CTR, витрати, конверсії.

**КРОК 2 — Дані Google Analytics 4:**
Виклич get_ga4_report з метриками ["sessions", "conversions", "engagementRate", "bounceRate"] та вимірами ["sessionCampaignName", "sessionSource"]. Дати: startDate="${days}daysAgo", endDate="today".

**КРОК 3 — Пошукові запити (Search Terms):**
Виклич get_search_terms${campaignId ? ` з campaignId="${campaignId}"` : ''} з limit=200. Знайди запити з витратами > 0 та 0 конверсій — це кандидати в мінус-слова.

**КРОК 4 — Звіт ефективності:**
Виклич get_performance_report з датами останніх ${days} днів.

**КРОК 5 — Органіка (Google Search Console):**
Виклич get_gsc_sites, потім get_gsc_search_analytics для основного сайту.

**КРОК 6 — АНАЛІЗ ТА ЗВІТ:**
Після отримання ВСІХ даних сформуй звіт за ЦІЄЮ СТРУКТУРОЮ:

---
## Аудит акаунту — [дата]

### Загальний стан
[Загальні цифри: витрати, конверсії, CPA, CTR]

### Знайдені проблеми
Для кожної проблеми:
| Проблема | Доказ (цифри) | Рекомендована дія | Інструмент для виправлення |
|----------|--------------|-------------------|---------------------------|
| [опис]   | [метрика]    | [що зробити]      | [який tool викликати]     |

### Сміттєві пошукові запити
[Список запитів що зливають бюджет + готовий виклик add_negative_keywords]

### Топ-3 термінові дії
1. [найважливіше]
2. ...
3. ...
---

ВАЖЛИВО: Вказуй конкретні цифри, а не загальні слова. Кожна рекомендація повинна мати відповідний інструмент для виправлення.`,
          },
        },
      ],
    };
  }
);

server.registerPrompt(
  'skill_ad_creation',
  {
    title: 'Генерація RSA Оголошень',
    description: 'Генерація та запуск Responsive Search Ads (RSA) за формулами AIDA та CTR-магнітів. Обов\'язкове підтвердження перед публікацією.',
    argsSchema: {
      adGroupId: z.string().describe('ID групи оголошень куди додавати рекламу'),
      product: z.string().describe('Продукт або послуга (наприклад: "юридичні послуги Київ", "натяжні стелі")'),
      finalUrl: z.string().describe('URL посадкової сторінки'),
      usp: z.string().optional().describe('Унікальна торгова пропозиція / конкурентні переваги (опціонально)'),
    },
  },
  async ({ adGroupId, product, finalUrl, usp }) => {
    const uspNote = usp ? `\nКонкурентні переваги клієнта: ${usp}` : '';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Ти — Senior PPC-копірайтер. Створи та запусти RSA-оголошення для групи ${adGroupId}.
Продукт/послуга: ${product}
Посадкова сторінка: ${finalUrl}${uspNote}

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ:

**КРОК 1 — Дослідження ключових слів:**
Виклич generate_keyword_ideas з seed keywords пов'язаними з "${product}". Запиши топ-10 за обсягом пошуку — вони мають бути в заголовках.

**КРОК 2 — Аналіз поточних оголошень:**
Виклич get_ads з adGroupId="${adGroupId}". Вивчи що вже є, щоб не дублювати.

**КРОК 3 — Генерація заголовків (Headlines):**
Напиши МІНІМУМ 7 унікальних заголовків до 30 символів кожен.
Правила:
- Мінімум 3 заголовки з входженням ключових слів
- Мінімум 2 заголовки з числами або цифрами (ціни, терміни, гарантії)
- Мінімум 1 заголовок з CTA ("Замовте зараз", "Безкоштовна консультація")
- Формули: AIDA (Увага→Інтерес→Бажання→Дія), Pain+Benefit, Proof

**КРОК 4 — Генерація описів (Descriptions):**
Напиши МІНІМУМ 4 унікальних описи до 90 символів кожен.
Правила:
- Кожен опис закінчується CTA
- Включай конкретні переваги та факти
- Різні кути: вигода, гарантія, термін, соціальний доказ

**КРОК 5 — ПОКАЖИ РЕЗУЛЬТАТ КОРИСТУВАЧЕВІ:**
Відобрази всі заголовки та описи у форматі таблиці. Поясни чому кожен ефективний.

**КРОК 6 — ОБОВ'ЯЗКОВО ЗАПРОСИ ПІДТВЕРДЖЕННЯ:**
Запитай: "Чи підтверджуєте публікацію цих оголошень? (так/ні/змінити [що саме])"

**КРОК 7 — Тільки після підтвердження "так":**
Виклич create_rsa_ad з adGroupId="${adGroupId}", затвердженими headlines, descriptions та finalUrl="${finalUrl}".
Повідом про результат.`,
          },
        },
      ],
    };
  }
);

server.registerPrompt(
  'skill_budget_optimizer',
  {
    title: 'Оптимізація Бюджетів та Ставок',
    description: 'Оптимізація бюджетів кампаній та ставок CPC на основі даних ефективності та конверсій з GA4.',
    argsSchema: {
      campaignId: z.string().optional().describe('ID кампанії (якщо не вказано — аналіз всіх активних кампаній)'),
      targetCpa: z.number().optional().describe('Цільова вартість конверсії (CPA) у валюті акаунту'),
    },
  },
  async ({ campaignId, targetCpa }) => {
    const cpaNote = targetCpa ? `Цільовий CPA: ${targetCpa} (валюта акаунту).` : 'Цільовий CPA не вказано — орієнтуйся на середній по акаунту.';
    const campaignFilter = campaignId ? ` з campaignId="${campaignId}"` : '';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Ти — Senior PPC-спеціаліст з оптимізації ставок. Проведи аналіз і оптимізуй бюджети та ставки.
${cpaNote}

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ:

**КРОК 1 — Завантаж ключові слова:**
Виклич get_keywords${campaignFilter}. Для кожного запиши: текст, matchType, CPC, витрати, конверсії, Quality Score.

**КРОК 2 — Дані конверсій з GA4:**
Виклич get_ga4_report з метриками ["conversions", "sessions", "engagementRate"] та вимірами ["sessionCampaignName"]. Це дасть реальний зв'язок витрати→результат.

**КРОК 3 — Дані кампаній:**
Виклич get_campaigns. Запиши бюджети, CTR, конверсії, витрати.

**КРОК 4 — АНАЛІЗ КЛЮЧОВИХ СЛІВ (правила рішень):**

Категоризуй кожне ключове слово:

🔴 ЗНИЗИТИ СТАВКУ (виклик update_keyword_cpc):
  - Quality Score ≤ 4 І CPC вище середнього
  - Витрати > [середній CPA × 2] і 0 конверсій
  - BROAD match з низькою релевантністю

🟡 ПРИЗУПИНИТИ (виклик update_ad_status або зміна статусу):
  - Витрати > [середній CPA × 3] і 0 конверсій за 30+ днів
  - CTR < 0.5% протягом 30 днів

🟢 ПІДВИЩИТИ СТАВКУ (виклик update_keyword_cpc):
  - Quality Score ≥ 7 І CTR вище середнього І є конверсії
  - CPA нижче цільового і є ресурс для масштабування

**КРОК 5 — АНАЛІЗ БЮДЖЕТІВ КАМПАНІЙ:**

🟢 ПІДВИЩИТИ БЮДЖЕТ (виклик update_campaign_budget):
  - CTR > середнього по акаунту
  - Є конверсії і CPA ≤ цільового
  - Кампанія обмежена бюджетом (budget limited)

🔴 ЗНИЗИТИ БЮДЖЕТ (виклик update_campaign_budget):
  - Конверсій 0 або CPA >> цільового
  - CTR < 1% і якість трафіку низька за GA4

**КРОК 6 — ПЛАН ДІЙ:**
Сформуй таблицю:
| Keyword/Campaign | Поточне | Рекомендація | Зміна | Очікуваний ефект |
|-----------------|---------|-------------|-------|-----------------|

**КРОК 7 — ЗАПРОСИ ПІДТВЕРДЖЕННЯ:**
Покажи план і запитай: "Підтверджуєте застосування цих змін?"
Тільки після "так" — виклич відповідні інструменти для КОЖНОЇ рекомендації.`,
          },
        },
      ],
    };
  }
);

server.registerPrompt(
  'skill_keyword_relevance_audit',
  {
    title: 'Аудит Релевантності Ключових Слів',
    description: 'Аудит релевантності ключових слів: виявляє нерелевантні BROAD-запити що зливають бюджет, пропонує зниження ставок або зміну типу відповідності.',
    argsSchema: {
      campaignId: z.string().optional().describe('ID кампанії для аналізу (якщо не вказано — весь акаунт)'),
      minSpend: z.number().optional().describe('Мінімальні витрати на ключове слово для включення в аналіз (за замовчуванням 5)'),
    },
  },
  async ({ campaignId, minSpend }) => {
    const spendThreshold = minSpend ?? 5;
    const campaignFilter = campaignId ? ` з campaignId="${campaignId}"` : '';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Ти — Senior PPC-спеціаліст. Проведи ДЕТАЛЬНИЙ АУДИТ РЕЛЕВАНТНОСТІ ключових слів.
Мінімальний поріг витрат для аналізу: ${spendThreshold} (валюта акаунту).

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ:

**КРОК 1 — Завантаж всі ключові слова:**
Виклич get_keywords${campaignFilter}.
Для кожного слова зафіксуй: id, adGroupId, text, matchType, CPC, cost, clicks, conversions, qualityScore.

**КРОК 2 — Завантаж пошукові запити:**
Виклич get_search_terms${campaignFilter} з limit=500.
Кожен запит зв'яжи з відповідним ключовим словом (поле triggeringKeyword якщо є, або вручну за схожістю).

**КРОК 3 — КЛАСИФІКАЦІЯ КЛЮЧОВИХ СЛІВ:**

Для кожного keyword з витратами > ${spendThreshold}:

🔴 КРИТИЧНО — BROAD match + нерелевантні запити:
  - matchType = BROAD
  - Є search terms що НЕ пов'язані семантично з keyword
  - Або CTR < 1% на цьому keyword
  → ДІЯ: знизити CPC на 30-50% (update_keyword_cpc) АБО змінити matchType на PHRASE

🟠 ПРОБЛЕМНЕ — будь-який match type:
  - cost > [середній CPA] і conversions = 0 за 14+ днів
  - Quality Score ≤ 3
  → ДІЯ: знизити CPC на 50% або призупинити

🟡 УВАГА — search terms що не стосуються бізнесу:
  - Запити зі словами: безкоштовно, своїми руками, DIY, відео, як зробити, форум, відгук (де не потрібні)
  → ДІЯ: додати в мінус-слова (add_negative_keywords)

🟢 ОК — залишити без змін

**КРОК 4 — ЗВІТ:**
Виведи у форматі:

---
## Аудит релевантності ключових слів

### Критичні проблеми (потребують негайних дій)
| Keyword | Match Type | Витрати | Конверсії | QS | Нерелевантні запити | Рекомендована дія |
|---------|-----------|---------|-----------|-----|---------------------|-------------------|

### Нерелевантні пошукові запити для мінусування
\`\`\`
[список запитів для add_negative_keywords]
\`\`\`

### Summary
- Загальні витрати на нерелевантні кліки: X
- Потенційна економія після оптимізації: X
---

**КРОК 5 — ЗАПРОСИ ПІДТВЕРДЖЕННЯ:**
"Чи підтверджуєте виконання цих змін? Можете вибрати: (1) всі зміни, (2) тільки мінус-слова, (3) тільки зниження ставок"

**КРОК 6 — Після підтвердження** виклич відповідні інструменти для кожної рекомендації зі звіту.`,
          },
        },
      ],
    };
  }
);

server.registerPrompt(
  'skill_ad_copy_review',
  {
    title: 'Аналіз Якості Оголошень',
    description: 'Аналіз якості текстів оголошень: порівнює CTR та конверсії між оголошеннями в групах, виявляє слабкі тексти, пропонує паузу або переписування.',
    argsSchema: {
      adGroupId: z.string().optional().describe('ID групи оголошень (якщо не вказано — аналіз всіх груп)'),
    },
  },
  async ({ adGroupId }) => {
    const adGroupFilter = adGroupId ? ` з adGroupId="${adGroupId}"` : '';
    const adGroupNote = adGroupId ? `Фокус на групі оголошень ID: ${adGroupId}.` : 'Аналізуй всі активні групи оголошень.';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Ти — Senior PPC-копірайтер та аналітик. Проведи АУДИТ ЯКОСТІ ОГОЛОШЕНЬ.
${adGroupNote}

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ:

**КРОК 1 — Завантаж оголошення:**
Виклич get_ads${adGroupFilter}.
Для кожного оголошення: adId, adGroupId, headlines, descriptions, status, CTR, clicks, conversions, impressions.

**КРОК 2 — Завантаж групи оголошень для контексту:**
Виклич get_ad_groups${adGroupId ? ` з adGroupId передай campaignId якщо відомо` : ''}.
Це потрібно щоб порівняти оголошення в рамках ОДНІЄЇ групи.

**КРОК 3 — АНАЛІЗ КОЖНОГО ОГОЛОШЕННЯ:**

Перевір кожне оголошення за чеклістом:

📝 ЯКІСТЬ ТЕКСТУ:
  □ Є входження ключового слова в заголовку?
  □ Є конкретна цифра/факт (ціна, термін, гарантія)?
  □ Є чіткий CTA в описі?
  □ Заголовки не повторюють один одного?
  □ Довжина оптимальна (не обрізається)?

📊 ПЕРФОМАНС (порівнюй всередині групи оголошень):
  □ CTR вище або нижче середнього по групі?
  □ Є конверсії чи 0 за останні 30 днів?
  □ Impression share достатній для висновків?

**КРОК 4 — КЛАСИФІКАЦІЯ:**

🔴 ПАУЗУВАТИ (update_ad_status → PAUSED):
  - CTR < 50% від середнього по групі І є мінімум 2 інші активні оголошення
  - 0 конверсій при витратах > [середній CPA × 2]
  - Дублює інше оголошення по тексту

🟠 ПЕРЕПИСАТИ (надай конкретні рекомендації):
  - Відсутній CTA
  - Немає ключових слів у заголовках
  - Всі заголовки схожі за структурою (немає різноманіття)

🟡 ПОКРАЩИТИ (дрібні правки):
  - Є потенціал але не повністю реалізований
  - Можна посилити конкретикою або цифрами

🟢 ЗАЛИШИТИ — топ-перфомер групи

**КРОК 5 — ЗВІТ:**
---
## Аудит якостіоголошень — [дата]

### По кожній групі оголошень:
**[Назва групи]**
| Ad ID | CTR | Конверсії | Статус | Оцінка | Дія |
|-------|-----|----------|--------|--------|-----|

### Конкретні рекомендації по рерайту
Для кожного оголошення що потребує переписування:
- Поточний заголовок 1: "..."
- Проблема: ...
- Запропонований заголовок 1: "..."

### Summary
- Оголошень до паузи: X
- Оголошень до рерайту: X
- Топ-перфомери: X
---

**КРОК 6 — ЗАПРОСИ ПІДТВЕРДЖЕННЯ:**
"Підтверджуєте паузу слабких оголошень? (так/вибрати конкретні/ні)"
Після підтвердження — виклич update_ad_status для кожного.`,
          },
        },
      ],
    };
  }
);

server.registerPrompt(
  'skill_search_terms_harvest',
  {
    title: 'Harvest Сміттєвих Запитів',
    description: 'Швидке очищення акаунту від сміттєвих пошукових запитів що зливають бюджет без конверсій. Формує і додає мінус-слова.',
    argsSchema: {
      campaignId: z.string().optional().describe('ID кампанії (якщо не вказано — весь акаунт)'),
      spendThreshold: z.number().optional().describe('Мінімальні витрати на запит щоб потрапити до аналізу (за замовчуванням 3)'),
      days: z.number().optional().describe('Кількість днів для аналізу (за замовчуванням 14)'),
    },
  },
  async ({ campaignId, spendThreshold, days }) => {
    const threshold = spendThreshold ?? 3;
    const period = days ?? 14;
    const campaignFilter = campaignId ? ` з campaignId="${campaignId}"` : '';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Ти — Senior PPC-спеціаліст. Проведи HARVEST (збір і очищення) пошукових запитів за останні ${period} днів.
Поріг витрат для аналізу: ${threshold} (валюта акаунту).

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ:

**КРОК 1 — Завантаж пошукові запити:**
Виклич get_search_terms${campaignFilter} з limit=500.
Зафіксуй для кожного: query, campaignId, adGroupId, cost, clicks, conversions, CTR, impressions.

**КРОК 2 — Завантаж поточні мінус-слова (щоб не дублювати):**
Виклич get_negative_keywords${campaignFilter}.

**КРОК 3 — ФІЛЬТРАЦІЯ СМІТТЄВИХ ЗАПИТІВ:**

Знайди запити де ОДНОЧАСНО:
  ✓ Витрати > ${threshold}
  ✓ Конверсій = 0
  ✓ Запит ще НЕ є мінус-словом

Додатково перевір на категорії сміттєвих запитів:
  - Інформаційні: "як", "що таке", "своїми руками", "DIY", "безкоштовно", "відео урок"
  - Нерелевантні: запити що не стосуються продукту/послуги
  - Брендові конкуренти (якщо не потрібні)
  - Гео нерелевантні (інші міста/країни якщо геотаргет обмежений)

**КРОК 4 — ПРІОРИТИЗАЦІЯ:**

Відсортуй за сумою витрат (спочатку найдорожчі) і розбий на групи:
  🔴 КРИТИЧНО (витрати > ${threshold * 5}): негайно в мінус
  🟠 ВАЖЛИВО (витрати ${threshold * 2}-${threshold * 5}): рекомендовано в мінус
  🟡 УВАГА (витрати ${threshold}-${threshold * 2}): розглянути

**КРОК 5 — ЗВІТ:**
---
## Harvest пошукових запитів — [дата]

### Топ-20 запитів що зливають бюджет
| Запит | Витрати | Кліки | CTR | Категорія | Рекомендація |
|-------|---------|-------|-----|-----------|-------------|

### Загальна статистика
- Знайдено сміттєвих запитів: X
- Загальні витрати на них: X грн
- Потенційна місячна економія: ~X грн

### Готові до додавання мінус-слова
**Рівень кампанії:**
\`\`\`
[список слів]
\`\`\`
**Рівень групи оголошень:**
\`\`\`
[список слів]
\`\`\`
---

**КРОК 6 — ЗАПРОСИ ПІДТВЕРДЖЕННЯ:**
Запитай: "Додати всі ці мінус-слова? Вибери варіант:
(1) Додати всі критичні та важливі
(2) Додати тільки критичні
(3) Вибрати вручну
(4) Скасувати"

**КРОК 7 — Після підтвердження:**
Виклич add_negative_keywords для кожного кластеру запитів.
Використовуй matchType PHRASE для загальних запитів і EXACT для специфічних.
Звітуй: "Додано X мінус-слів. Очікувана економія: ~X грн/місяць."`,
          },
        },
      ],
    };
  }
);

// ─────────────────────────────────────────────
// MCP Prompts — Крос-платформні Скіли
// ─────────────────────────────────────────────

server.registerPrompt(
  'skill_seo_ppc_overlap',
  {
    title: 'SEO vs PPC — Аналіз Перетину',
    description: 'Знаходить де реклама дублює органіку (зекономити бюджет) і де SEO слабке та потрібно підсилити PPC (зростання).',
    argsSchema: {
      siteUrl: z.string().describe('URL сайту в Google Search Console (наприклад "sc-domain:example.com")'),
      campaignId: z.string().optional().describe('ID кампанії для аналізу (якщо не вказано — весь акаунт)'),
    },
  },
  async ({ siteUrl, campaignId }) => {
    const campaignFilter = campaignId ? ` з campaignId="${campaignId}"` : '';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Ти — Senior PPC + SEO стратег. Проведи аналіз перетину між платним та органічним трафіком.
Сайт: ${siteUrl}

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ:

**КРОК 1 — Органічний трафік (GSC):**
Виклич get_gsc_search_analytics для сайту "${siteUrl}" з dimensions=["query","page"], startDate за останні 30 днів.
Розбий запити на групи:
  - Топ-органіка: позиція 1–3 (ми вже там)
  - Майже-топ: позиція 4–10 (потенціал)
  - Слабко: позиція 11–30 (потрібна підтримка PPC)
  - Відсутні: немає органічного трафіку взагалі

**КРОК 2 — Платний трафік (Ads):**
Виклич get_search_terms${campaignFilter} з limit=500.
Виклич get_keywords${campaignFilter}.
Зафіксуй: за якими запитами платимо, скільки коштує кожен клік.

**КРОК 3 — Дані конверсій (GA4):**
Виклич get_ga4_report з метриками ["sessions","conversions","engagementRate"] та вимірами ["sessionSource","sessionMedium"].
Порівняй конверсії з organic vs paid.

**КРОК 4 — ПЕРЕХРЕСНИЙ АНАЛІЗ:**

Знайди перетини між GSC-запитами та Ads search terms:

🔴 ДУБЛЮВАННЯ (можна вимкнути рекламу або знизити ставку):
  - Органічна позиція 1–3 І є активна реклама на той самий запит
  - → Пропозиція: знизити CPC на 70% або зупинити keyword
  - → Розрахунок потенційної економії: [CPC × кліки/місяць]

🟡 ПІДТРИМКА (залишити рекламу тимчасово):
  - Органічна позиція 4–10 І реклама є
  - → Запит конкурентний, PPC підтримує поки SEO росте

🟢 МОЖЛИВІСТЬ (запустити або збільшити рекламу):
  - Органічна позиція 11–30 або відсутня
  - Запит має обсяг пошуку (перевір через generate_keyword_ideas)
  - → Пропозиція: запустити або збільшити бюджет на PPC

🔵 SEO-GAP (є в рекламі, немає в органіці):
  - Запити що конвертують в Ads але органіки немає взагалі
  - → Пріоритет для SEO-команди

**КРОК 5 — ЗВІТ:**
---
## SEO vs PPC Аналіз — [дата]

### Дублювання (витрачаємо гроші даремно)
| Запит | Органічна позиція | Ads CPC | Місячна витрата | Рекомендація |
|-------|------------------|---------|-----------------|-------------|

### Можливості для зростання PPC
| Запит | Органічна позиція | Обсяг пошуку | Конкуренція | Рекомендація |
|-------|------------------|-------------|-------------|-------------|

### SEO-прогалини (для SEO-команди)
| Запит | Ads конверсії | Organic позиція | Пріоритет |
|-------|--------------|----------------|----------|

### Фінансовий підсумок
- Потенційна місячна економія (прибрати дублювання): X грн
- Потенційне зростання (посилити PPC в слабких позиціях): X кліків/міс
---

**КРОК 6 — ПЛАН ДІЙ:**
Сформуй топ-5 конкретних дій з інструментами (update_keyword_cpc, update_campaign_budget, тощо).
Запитай підтвердження перед виконанням.`,
          },
        },
      ],
    };
  }
);

server.registerPrompt(
  'skill_landing_page_audit',
  {
    title: 'Аудит Посадкових Сторінок',
    description: 'Аналізує якість лендингів: зіставляє Quality Score та CPC з Ads з bounce rate та конверсіями з GA4, виявляє де проблема в лендингу, а не в рекламі.',
    argsSchema: {
      siteUrl: z.string().describe('URL сайту в GSC (наприклад "sc-domain:example.com")'),
      campaignId: z.string().optional().describe('ID кампанії (якщо не вказано — весь акаунт)'),
    },
  },
  async ({ siteUrl, campaignId }) => {
    const campaignFilter = campaignId ? ` з campaignId="${campaignId}"` : '';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Ти — Senior PPC-спеціаліст + CRO-аналітик. Проведи аудит посадкових сторінок.
Сайт: ${siteUrl}

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ:

**КРОК 1 — URL посадкових сторінок з Ads:**
Виклич get_keywords${campaignFilter}. Збери всі унікальні finalUrl (landing pages).
Виклич get_ads${campaignFilter ? campaignFilter.replace('campaignId', 'adGroupId') : ''}. Додай finalUrl з оголошень.
Отримай унікальний список landing pages.

**КРОК 2 — Поведінкові дані (GA4):**
Виклич get_ga4_report з:
  - dimensions: ["landingPagePlusQueryString", "sessionSource", "sessionMedium"]
  - metrics: ["sessions", "bounceRate", "engagementRate", "conversions", "averageSessionDuration", "screenPageViewsPerSession"]
  - startDate: "30daysAgo", endDate: "today"

**КРОК 3 — Органічні дані (GSC):**
Виклич get_gsc_search_analytics для "${siteUrl}" з dimensions=["page"] за 30 днів.
Отримай impressions, clicks, CTR, position для кожної сторінки.

**КРОК 4 — Ads якість:**
Виклич get_keywords${campaignFilter}. Для кожного keyword зафіксуй qualityScore та CPC.
Виклич get_performance_report за 30 днів. Розбий витрати по кампаніях.

**КРОК 5 — ДІАГНОСТИКА кожної landing page:**

Для кожної сторінки визнач патерн проблеми:

🔴 КРИТИЧНА ПРОБЛЕМА З ЛЕНДИНГОМ:
  - Умова: bounceRate > 70% АБО engagementRate < 30%
  - І: є платний трафік на цю сторінку
  - І: qualityScore ≤ 5 на keywords що ведуть сюди
  - Діагноз: реклама приводить трафік, але сторінка не конвертує
  - Рекомендація: аудит UX/контенту сторінки, перегляд відповідності ключових слів → лендинг

🟠 ПРОБЛЕМА ВІДПОВІДНОСТІ (Keyword ↔ Landing):
  - Умова: низький QS (≤ 5) на keyword
  - АБО: тематика keyword не відповідає контенту сторінки
  - Рекомендація: або змінити finalUrl на більш релевантну, або переписати лендинг

🟡 ВИСОКА ВАРТІСТЬ БЕЗ КОНВЕРСІЙ:
  - Умова: CPC вище середнього І conversions = 0 на GA4 з цієї сторінки
  - Рекомендація: A/B тест заголовку/офера, або перевір налаштування конверсій GA4

🟢 ЕФЕКТИВНА СТОРІНКА:
  - engagementRate > 60%, є конверсії, QS ≥ 7
  - Рекомендація: збільшити бюджет на кампанії що ведуть сюди

**КРОК 6 — ЗВІТ:**
---
## Аудит Посадкових Сторінок — [дата]

### Діагностика по сторінках
| URL | Bounce Rate | Conv Rate | QS keyword | CPC | Organic pos | Діагноз | Дія |
|-----|------------|----------|------------|-----|------------|---------|-----|

### Топ-3 проблемних сторінки (найбільше втрат бюджету)
[Детальний опис кожної з конкретними рекомендаціями]

### Топ-3 ефективних сторінки (масштабувати)
[Список з пропозицією збільшення бюджету]

### Фінансовий підсумок
- Бюджет що зливається через слабкі лендинги: ~X грн/міс
- Потенціал зростання при оптимізації: ~X конверсій/міс
---

Після звіту запропонуй конкретні дії і виклич update_campaign_budget або update_keyword_cpc де доцільно після підтвердження.`,
          },
        },
      ],
    };
  }
);

server.registerPrompt(
  'skill_conversion_funnel_audit',
  {
    title: 'Аудит Воронки Конверсій',
    description: 'Знаходить де саме зламана воронка: в рекламі (низький CTR), на лендингу (bounce rate), чи в офері (немає конверсій при хорошому трафіку).',
    argsSchema: {
      siteUrl: z.string().describe('URL сайту в GSC'),
      campaignId: z.string().optional().describe('ID кампанії (якщо не вказано — весь акаунт)'),
      conversionGoal: z.string().optional().describe('Назва цілі конверсії в GA4 (наприклад "purchase", "lead_form_submit")'),
    },
  },
  async ({ siteUrl, campaignId, conversionGoal }) => {
    const goalNote = conversionGoal ? `Ціль конверсії: "${conversionGoal}".` : 'Використовуй загальну метрику conversions.';
    const campaignNote = campaignId ? `Фокус на кампанії ID: ${campaignId} — фільтруй дані по ній.` : 'Аналізуй весь акаунт.';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Ти — Senior PPC-аналітик. Проведи ДІАГНОСТИКУ ВОРОНКИ КОНВЕРСІЙ. ${goalNote} ${campaignNote}

Воронка складається з 4 рівнів:
[Показ реклами] → [Клік] → [Взаємодія з сайтом] → [Конверсія]

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ:

**КРОК 1 — Рівень 1: ПОКАЗ → КЛІК (Ads CTR):**
Виклич get_campaigns. Виклич get_performance_report за 30 днів.
Метрики: impressions, clicks, CTR, cost.
Benchmark: CTR < 2% для пошуку = проблема з оголошеннями або ставками.

**КРОК 2 — Рівень 2: КЛІК → ВЗАЄМОДІЯ (Landing Page):**
Виклич get_ga4_report з:
  - dimensions: ["sessionCampaignName", "landingPagePlusQueryString"]
  - metrics: ["sessions", "engagementRate", "bounceRate", "averageSessionDuration"]
Benchmark: engagementRate < 40% = проблема з лендингом.

**КРОК 3 — Рівень 3: ВЗАЄМОДІЯ → КОНВЕРСІЯ (Offer/UX):**
Виклич get_ga4_report з:
  - dimensions: ["sessionCampaignName", "sessionSource"]
  - metrics: ["sessions", "conversions", "engagementRate"]
Розрахуй conversion rate = conversions / sessions × 100%.
Benchmark: conv rate < 1% при хорошому engagement = проблема з офером або формою.

**КРОК 4 — Органічний контекст (GSC):**
Виклич get_gsc_search_analytics для "${siteUrl}" з dimensions=["query"] за 30 днів.
Порівняй organic CTR з paid CTR — якщо органічний значно нижчий, проблема в заголовку сторінки/description.

**КРОК 5 — ДІАГНОСТИКА ЗЛАМАНОГО РІВНЯ:**

Визнач де найбільший "drop":

📉 ЗЛАМАНИЙ РІВЕНЬ 1 (Показ → Клік):
  - CTR < 2% при достатніх показах (> 1000 impressions)
  - Причини: слабкі заголовки, нерелевантні ключові слова, низькі ставки
  - Рішення: skill_ad_copy_review, підвищити ставки на топ-keywords

📉 ЗЛАМАНИЙ РІВЕНЬ 2 (Клік → Взаємодія):
  - bounceRate > 65% або engagementRate < 35%
  - Причини: невідповідність реклама/лендинг, повільне завантаження, mobile UX
  - Рішення: skill_landing_page_audit, перевірити відповідність ключових слів

📉 ЗЛАМАНИЙ РІВЕНЬ 3 (Взаємодія → Конверсія):
  - engagementRate > 60% АЛЕ conv rate < 1%
  - Причини: слабкий офер, складна форма, немає CTA, ціна, довіра
  - Рішення: A/B тест офера, спрощення форми (не в рамках Google Ads)

📉 ЗЛАМАНИЙ РІВЕНЬ 4 (все ок але немає продажів):
  - Є конверсії в GA4, але немає реальних продажів
  - Причини: налаштування цілей GA4 не відповідають реальним конверсіям
  - Рішення: аудит налаштувань GA4 (перевір які події рахуються як конверсія)

**КРОК 6 — ЗВІТ:**
---
## Аудит Воронки Конверсій — [дата]

### Воронка по кампаніях
| Кампанія | Покази | CTR | Sessions | Engagement | Conv Rate | Стан |
|----------|--------|-----|----------|-----------|-----------|------|

### Діагноз
**Зламаний рівень:** [1/2/3/4]
**Головна причина:** [опис]
**Втрати:** ~X грн/місяць через цю проблему

### Топ-3 рекомендації
1. [конкретна дія + інструмент]
2. ...
3. ...
---

Після звіту запропонуй виклик відповідного скілу (skill_ad_copy_review або skill_landing_page_audit) залежно від знайденої проблеми.`,
          },
        },
      ],
    };
  }
);

server.registerPrompt(
  'skill_growth_opportunities',
  {
    title: 'Точки Зростання та Масштабування',
    description: 'Знаходить конкретні можливості для зростання: запити де SEO майже топ (підсилити PPC), кампанії що окупаються (збільшити бюджет), нові ніші.',
    argsSchema: {
      siteUrl: z.string().describe('URL сайту в GSC'),
      campaignId: z.string().optional().describe('ID кампанії (якщо не вказано — весь акаунт)'),
      monthlyBudget: z.number().optional().describe('Поточний місячний бюджет в гривнях (для розрахунку потенціалу)'),
    },
  },
  async ({ siteUrl, campaignId, monthlyBudget }) => {
    const budgetNote = monthlyBudget ? `Поточний місячний бюджет: ${monthlyBudget} грн.` : '';
    const campaignFilter = campaignId ? ` з campaignId="${campaignId}"` : '';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Ти — Senior PPC Growth стратег. Знайди конкретні точки зростання та масштабування.
Сайт: ${siteUrl}${monthlyBudget ? `\n${budgetNote}` : ''}

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ:

**КРОК 1 — "Майже-топ" запити (GSC):**
Виклич get_gsc_search_analytics для "${siteUrl}" з dimensions=["query"], startDate="60daysAgo".
Відфільтруй: позиція 4–15, impressions > 100.
Це запити де ми близько до топу органічно — PPC може доповнити і дати одразу трафік.

**КРОК 2 — Найкращі кампанії (Ads):**
Виклич get_campaigns. Виклич get_performance_report за 30 днів.
Знайди кампанії де: CTR > 3%, є конверсії, CPA прийнятний.
Це кандидати для збільшення бюджету.

**КРОК 3 — Ключові слова з потенціалом (Ads):**
Виклич get_keywords${campaignFilter}.
Знайди keywords: qualityScore ≥ 7, є конверсії, CPC не надто високий.
Це кандидати для підвищення ставок.

**КРОК 4 — Нові ніші (Keyword Planner):**
На основі топ-конвертуючих keywords (крок 3) виклич generate_keyword_ideas.
Знайди споріднені запити з обсягом пошуку > 100/міс які ще не в акаунті.

**КРОК 5 — GA4 — найкращі джерела:**
Виклич get_ga4_report з:
  - dimensions: ["sessionCampaignName", "sessionSource"]
  - metrics: ["sessions", "conversions", "engagementRate"]
Знайди комбінації campaign+source що конвертують найкраще.

**КРОК 6 — АНАЛІЗ МОЖЛИВОСТЕЙ:**

Категоризуй знахідки:

🚀 ШВИДКЕ ЗРОСТАННЯ (зробити цього тижня):
  - Збільшити бюджет кампаніям що окупаються (update_campaign_budget)
  - Підняти ставки на keywords з QS ≥ 7 та конверсіями (update_keyword_cpc)
  - Запустити PPC на "майже-топ" GSC запити

📈 СЕРЕДНЬОСТРОКОВІ (наступний місяць):
  - Нові keyword групи на основі keyword ideas
  - Нові ad groups для нових ніш

🔭 ДОВГОСТРОКОВІ (стратегія):
  - SEO-пріоритети на основі gap-аналізу
  - Нові гео або аудиторії

**КРОК 7 — ЗВІТ:**
---
## Точки Зростання — [дата]

### Швидкі перемоги (цього тижня)
| Дія | Поточний стан | Рекомендована зміна | Очікуваний ефект | Інструмент |
|-----|--------------|---------------------|-----------------|-----------|

### Нові ніші для запуску
| Запит | Обсяг/міс | Конкуренція | Рекомендований CPC | Пріоритет |
|-------|----------|------------|-------------------|----------|

### "Майже-топ" запити для PPC підсилення
| GSC Запит | Поточна позиція | Impressions | Рекомендація |
|-----------|----------------|------------|-------------|

${monthlyBudget ? `### Розподіл бюджету
Поточний бюджет: ${monthlyBudget} грн/міс
Рекомендований перерозподіл: [таблиця campaign → новий бюджет]` : ''}
---

Після звіту запитай підтвердження і виклич update_campaign_budget та update_keyword_cpc для швидких перемог.`,
          },
        },
      ],
    };
  }
);

// ─────────────────────────────────────────────
// MCP Prompts — Комплексні Аудити
// ─────────────────────────────────────────────

server.registerPrompt(
  'skill_campaign_deep_audit',
  {
    title: 'Глибокий Аудит Кампанії',
    description: 'Комплексний аудит окремої кампанії: структура, ключові слова, оголошення, ставки, відповідність цілям. Видає actionable план оптимізації.',
    argsSchema: {
      campaignId: z.string().describe('ID кампанії для глибокого аудиту'),
      siteUrl: z.string().optional().describe('URL сайту в GSC для крос-аналізу з органікою'),
    },
  },
  async ({ campaignId, siteUrl }) => {
    const gscStep = siteUrl
      ? `\n**КРОК 6 — Органічний контекст (GSC):**\nВиклич get_gsc_search_analytics для "${siteUrl}" з dimensions=["query"] за 30 днів.\nПорівняй топ-запити кампанії з органічними позиціями.`
      : '';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Ти — Senior PPC-аудитор. Проведи ГЛИБОКИЙ АУДИТ кампанії ID: ${campaignId}.

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ:

**КРОК 1 — Загальні показники кампанії:**
Виклич get_campaigns. Знайди кампанію ${campaignId} та зафіксуй:
  - Назва, статус, тип кампанії, бюджет, стратегія ставок
  - CTR, CPC, CPA, ROAS за останні 30 днів
  - Кількість конверсій, загальні витрати

**КРОК 2 — Структура (Ad Groups):**
Виклич get_ad_groups з campaignId="${campaignId}".
Оціни:
  - Кількість груп оголошень (оптимально 3–10)
  - Чи групи мають логічну тематичну структуру?
  - Статус кожної групи, CTR, ставки

**КРОК 3 — Ключові слова:**
Виклич get_keywords з campaignId="${campaignId}".
Для кожного keyword:
  - matchType (BROAD/PHRASE/EXACT) — розподіл
  - Quality Score (критично якщо < 5)
  - CPC vs середній по кампанії
  - Конверсії та вартість конверсії

**КРОК 4 — Пошукові запити:**
Виклич get_search_terms з campaignId="${campaignId}" limit=300.
Знайди:
  - Нерелевантні запити (сміттєві)
  - Запити з конверсіями (потенційні нові keywords)
  - BROAD keywords що тригерять нерелевантне
${gscStep}
**КРОК 5 — Мінус-слова:**
Виклич get_negative_keywords з campaignId="${campaignId}".
Оціни покриття: чи є базові стоп-слова (безкоштовно, своїми руками тощо)?

**КРОК 7 — GA4 конверсії:**
Виклич get_ga4_report з dimension ["sessionCampaignName"] та метриками ["sessions","conversions","engagementRate","bounceRate"].
Знайди дані саме для цієї кампанії.

**КРОК 8 — КОМПЛЕКСНА ОЦІНКА:**

Постав оцінку кожному блоку (1–10):

| Блок | Оцінка | Головна проблема |
|------|--------|-----------------|
| Структура кампанії | X/10 | ... |
| Якість ключових слів | X/10 | ... |
| Мінус-слова | X/10 | ... |
| CTR та оголошення | X/10 | ... |
| Конверсії та CPA | X/10 | ... |
| Загальна оцінка | X/10 | ... |

**КРОК 9 — ПЛАН ОПТИМІЗАЦІЇ:**
---
## Глибокий Аудит Кампанії ${campaignId} — [дата]

### Загальний стан
[Резюме: сильні та слабкі сторони, загальна оцінка]

### Критичні проблеми (вирішити цього тижня)
| # | Проблема | Доказ | Дія | Інструмент |
|---|---------|-------|-----|-----------|

### Структурні рекомендації (наступний місяць)
[Що перебудувати в структурі кампанії]

### Нові можливості
[Нові keywords, нові ad groups, нові типи відповідності]

### Дорожня карта оптимізації
1. Тиждень 1: [список дій]
2. Тиждень 2: [список дій]
3. Тиждень 3–4: [список дій]
---

Запитай підтвердження і виклич відповідні інструменти для критичних змін.`,
          },
        },
      ],
    };
  }
);

server.registerPrompt(
  'skill_ad_group_deep_audit',
  {
    title: 'Глибокий Аудит Групи Оголошень',
    description: 'Детальний аудит групи оголошень: аналіз привабливості заголовків і описів за психологічними формулами, відповідність ключовим словам, A/B порівняння оголошень.',
    argsSchema: {
      adGroupId: z.string().describe('ID групи оголошень для аудиту'),
      niche: z.string().optional().describe('Ніша або тематика бізнесу (наприклад: "юридичні послуги", "інтернет-магазин меблів") — для контекстної оцінки текстів'),
    },
  },
  async ({ adGroupId, niche }) => {
    const nicheNote = niche ? `Ніша бізнесу: "${niche}".` : 'Визнач нішу самостійно з контексту ключових слів.';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Ти — Senior PPC-копірайтер та аналітик оголошень. Проведи ГЛИБОКИЙ АУДИТ групи оголошень ID: ${adGroupId}.
${nicheNote}

ОБОВ'ЯЗКОВИЙ АЛГОРИТМ:

**КРОК 1 — Завантаж оголошення:**
Виклич get_ads з adGroupId="${adGroupId}".
Для кожного оголошення зафіксуй: всі headlines, всі descriptions, finalUrl, status, CTR, clicks, conversions, impressions.

**КРОК 2 — Завантаж ключові слова групи:**
Виклич get_keywords з campaignId (якщо відомо) і знайди keywords для adGroup "${adGroupId}".
Зафіксуй: тексти ключових слів, matchType, QS, CPC.

**КРОК 3 — Пошукові запити цієї групи:**
Виклич get_search_terms і відфільтруй по adGroupId "${adGroupId}".
Зафіксуй: топ-10 запитів за кліками.

**КРОК 4 — АНАЛІЗ ЗАГОЛОВКІВ (Headlines):**

Для кожного headline оціни по 10 критеріях:

1. **Входження ключового слова** (є/немає — дуже важливо для QS)
2. **Конкретність** (цифри, факти vs загальні слова)
   - Слабко: "Якісні послуги" → Сильно: "Від 500 грн • За 1 день"
3. **Унікальна торгова пропозиція** (чим відрізняємось?)
4. **Емоційний тригер** (страх втрати, терміновість, бажання)
5. **CTA в заголовку** (є "Замовте", "Отримайте" тощо?)
6. **Довжина** (оптимально 25–30 символів, не обрізається)
7. **Різноманіття** (чи є різні типи: benefit, proof, CTA, feature?)
8. **Локальний сигнал** (якщо потрібно — місто, регіон)
9. **Числа та дані** (ціни, терміни, гарантії, роки досвіду)
10. **Відповідність landing page** (headline обіцяє те що є на сторінці?)

**КРОК 5 — АНАЛІЗ ОПИСІВ (Descriptions):**

Для кожного description оціни:

1. **CTA** (є чіткий заклик до дії?)
2. **Benefit-орієнтованість** (говоримо про вигоду клієнта, а не про себе?)
3. **Proof-елементи** (соціальний доказ, гарантії, сертифікати)
4. **Довжина** (до 90 символів, не обрізається)
5. **Унікальність** (кожен опис унікальний за структурою та акцентом?)
6. **Urgency/Scarcity** (терміновість, обмеженість)
7. **Розширення смислу** (доповнює заголовки, а не повторює)

**КРОК 6 — ПСИХОЛОГІЧНИЙ АНАЛІЗ КОМБІНАЦІЙ:**

Google тестує комбінації заголовків автоматично. Перевір:
- Чи є coverage для різних сегментів аудиторії?
  - "Ціна-центрований" клієнт (є headline з ціною/економією?)
  - "Якість-центрований" клієнт (є headline з якістю/гарантією?)
  - "Термін-центрований" клієнт (є headline з швидкістю?)
  - "Проблема-центрований" клієнт (є headline що звертається до болю?)

**КРОК 7 — A/B ПОРІВНЯННЯ ОГОЛОШЕНЬ:**
Якщо в групі > 1 оголошення:
- Порівняй CTR між оголошеннями
- Визнач "переможця" і проаналізуй ЧОМ він кращий
- Визнач "аутсайдера" і що конкретно слабко

**КРОК 8 — ЗВІТ:**
---
## Аудит Групи Оголошень ${adGroupId} — [дата]

### Загальна статистика групи
[CTR, conversions, impressions, середній CPC]

### Аналіз заголовків
| # | Headline | Оцінка | Сильні сторони | Слабкі сторони |
|---|---------|--------|---------------|---------------|

### Аналіз описів
| # | Description | Оцінка | Що добре | Що покращити |
|---|------------|--------|----------|-------------|

### Покриття психологічних сегментів
| Сегмент | Покрито? | Заголовок що покриває |
|---------|---------|----------------------|

### Конкретні рекомендації по переписуванню
Для кожного слабкого елементу:
- **Поточний:** "..."
- **Проблема:** [конкретна]
- **Запропонований:** "..."
- **Чому кращий:** [пояснення]

### Нові заголовки для тестування (A/B)
[5–7 нових headlines що закривають знайдені прогалини]

### Нові описи для тестування
[2–3 нових descriptions]

### Пріоритетні дії
1. [найважливіше — із вказівкою інструменту]
2. ...
---

**КРОК 9 — ЗАПРОСИ ПІДТВЕРДЖЕННЯ:**
Запитай: "Хочете застосувати ці зміни? Можна:
(1) Створити нове оголошення з рекомендованими текстами (create_rsa_ad)
(2) Призупинити слабкі оголошення (update_ad_status)
(3) Обидва варіанти
(4) Тільки переглянути звіт"

Після підтвердження — виклич відповідні інструменти.`,
          },
        },
      ],
    };
  }
);

// ─────────────────────────────────────────────
// Запуск серверу
// ─────────────────────────────────────────────

async function main() {
  console.error('Starting Google Ads MCP Server...');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Google Ads MCP Server connected via stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
