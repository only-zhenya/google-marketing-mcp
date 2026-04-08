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
import { registerAllSkills } from './skills';

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
  version: '2.0.0',
});

// ╔═══════════════════════════════════════════════════════════════╗
// ║                 АКАУНТ (Account Management)                  ║
// ╚═══════════════════════════════════════════════════════════════╝

server.tool(
  'get_account_info',
  `Отримати базову інформацію про Google Ads акаунт: назву акаунту, валюту, часовий пояс, статус автотегування.

КОЛИ ВИКОРИСТОВУВАТИ:
- На початку роботи — щоб зрозуміти з яким акаунтом працюєш
- Щоб дізнатись валюту акаунту (UAH, USD, EUR тощо) перед роботою з бюджетами
- Щоб перевірити назву акаунту

ПОВЕРТАЄ: назву акаунту, ID, валюту, часовий пояс, статус автотегування.`,
  {},
  async () => {
    const info = await adsService.getAccountInfo();
    return {
      content: [{ type: 'text', text: JSON.stringify(info, null, 2) }],
    };
  }
);

server.tool(
  'get_account_overview',
  `Отримати загальний огляд акаунту: всі кампанії з їхніми назвами, статусами, бюджетами та метриками за останні 30 днів.

КОЛИ ВИКОРИСТОВУВАТИ:
- ЗАВЖДИ ПЕРШИМ — коли починаєш аудит або будь-яку роботу з акаунтом
- Щоб побачити які кампанії є, їхні назви та ID
- Щоб зрозуміти загальну картину витрат та конверсій
- Перед тим як запитувати ID кампанії у користувача — покажи список існуючих

ПОВЕРТАЄ: масив кампаній з полями: id, name, status, type, budget, clicks, impressions, cost, conversions, CTR, CPC.`,
  {
    statusFilter: z.enum(['ALL', 'ENABLED', 'PAUSED']).optional().describe(
      'Фільтр по статусу кампаній. "ALL" — всі (за замовчуванням), "ENABLED" — тільки активні, "PAUSED" — тільки призупинені.'
    ),
  },
  async ({ statusFilter }) => {
    const campaigns = await adsService.listAllCampaigns();
    let filtered = campaigns;
    if (statusFilter && statusFilter !== 'ALL') {
      filtered = campaigns.filter(c => c.status === statusFilter);
    }
    const summary = {
      accountCampaignsTotal: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === 'ENABLED').length,
      pausedCampaigns: campaigns.filter(c => c.status === 'PAUSED').length,
      totalDailyBudget: campaigns.filter(c => c.status === 'ENABLED').reduce((sum, c) => sum + c.budgetAmount, 0),
      totalCost30d: campaigns.reduce((sum, c) => sum + c.metrics.cost, 0),
      totalConversions30d: campaigns.reduce((sum, c) => sum + c.metrics.conversions, 0),
      totalClicks30d: campaigns.reduce((sum, c) => sum + c.metrics.clicks, 0),
      campaigns: filtered,
    };
    return {
      content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
    };
  }
);

// ╔═══════════════════════════════════════════════════════════════╗
// ║                   КАМПАНІЇ (Campaigns)                       ║
// ╚═══════════════════════════════════════════════════════════════╝

server.tool(
  'get_campaigns',
  `Отримати список усіх кампаній Google Ads з їхніми назвами, статусами, бюджетами та метриками за останні 30 днів.

КОЛИ ВИКОРИСТОВУВАТИ:
- Щоб побачити які кампанії є в акаунті та їхні ID
- Для порівняння метрик між кампаніями
- Перед будь-якою операцією з кампанією — отримай її ID і назву

ПОВЕРТАЄ: id, name, status, advertisingChannelType, biddingStrategyType, budgetAmount, metrics (clicks, impressions, cost, conversions, ctr, averageCpc).`,
  {
    statusFilter: z.enum(['ALL', 'ENABLED', 'PAUSED']).optional().describe(
      'Фільтр по статусу. "ALL" (за замовчуванням) — всі кампанії, "ENABLED" — тільки активні, "PAUSED" — тільки призупинені.'
    ),
  },
  async ({ statusFilter }) => {
    const campaigns = await adsService.listAllCampaigns();
    let filtered = campaigns;
    if (statusFilter && statusFilter !== 'ALL') {
      filtered = campaigns.filter(c => c.status === statusFilter);
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }],
    };
  }
);

server.tool(
  'get_campaign_details',
  `Отримати повну структуру конкретної кампанії: скільки груп оголошень, ключових слів та оголошень у кожній групі, бюджет, статус.

КОЛИ ВИКОРИСТОВУВАТИ:
- Перед глибоким аудитом конкретної кампанії
- Щоб зрозуміти ієрархію: кампанія → групи → keywords/ads
- Щоб дізнатись скільки елементів у кампанії

ОБОВ'ЯЗКОВІ ПАРАМЕТРИ: campaignId — отримай його через get_campaigns.

ПОВЕРТАЄ: campaignId, campaignName, status, budget, adGroups (з кількістю keywords та ads у кожній).`,
  {
    campaignId: z.string().describe(
      'ID кампанії (числовий рядок, наприклад "21130232396"). Отримай його через get_campaigns або get_account_overview.'
    ),
  },
  async ({ campaignId }) => {
    const structure = await adsService.getCampaignStructure(campaignId);
    return {
      content: [{ type: 'text', text: JSON.stringify(structure, null, 2) }],
    };
  }
);

server.tool(
  'create_search_campaign',
  `Створити нову ПОШУКОВУ кампанію Google Ads з бюджетом та стратегією ставок.
⚠️ Кампанія створюється в статусі PAUSED для безпеки — потрібно вручну увімкнути через update_campaign_status.

КОЛИ ВИКОРИСТОВУВАТИ:
- Коли клієнт хоче запустити нову рекламну кампанію
- Після аналізу ключових слів та визначення стратегії

ПІСЛЯ СТВОРЕННЯ КАМПАНІЇ — потрібно:
1. Створити групу оголошень (create_ad_group)
2. Додати ключові слова (add_keywords)
3. Створити оголошення (create_rsa_ad) — ОБОВ'ЯЗКОВО з реальним URL сайту клієнта!
4. Увімкнути кампанію (update_campaign_status → ENABLED)

ОБОВ'ЯЗКОВІ ПАРАМЕТРИ: name, dailyBudget, biddingStrategy.`,
  {
    name: z.string().min(1).describe(
      'Назва кампанії. Має бути описовою, наприклад: "Пошук | Юридичні послуги | Київ", "Search | Натяжні стелі | UA".'
    ),
    dailyBudget: z.number().positive().describe(
      'Денний бюджет у валюті акаунту (наприклад 500 для 500 грн/день або 50 для 50 USD/день). Щоб дізнатись валюту — виклич get_account_info.'
    ),
    biddingStrategy: z.enum(['MANUAL_CPC', 'MAXIMIZE_CLICKS', 'MAXIMIZE_CONVERSIONS', 'TARGET_CPA']).describe(
      'Стратегія ставок:\n- MANUAL_CPC — ручне керування CPC (рекомендується для нових кампаній)\n- MAXIMIZE_CLICKS — максимізація кліків (автоматичні ставки)\n- MAXIMIZE_CONVERSIONS — максимізація конверсій (потрібні налаштовані конверсії)\n- TARGET_CPA — цільова вартість конверсії (потрібен targetCpa параметр)'
    ),
    targetCpa: z.number().positive().optional().describe(
      'Цільова вартість конверсії (CPA) у валюті акаунту. ОБОВ\'ЯЗКОВО для стратегії TARGET_CPA. Наприклад: 200 для 200 грн/конверсія.'
    ),
    startDate: z.string().optional().describe(
      'Дата початку кампанії у форматі YYYY-MM-DD (наприклад "2025-01-15"). Якщо не вказано — з моменту активації.'
    ),
    endDate: z.string().optional().describe(
      'Дата закінчення кампанії у форматі YYYY-MM-DD. Якщо не вказано — працює безстроково.'
    ),
    targetGoogleSearch: z.boolean().optional().describe('Показувати рекламу в Google Search (за замовчуванням true).'),
    targetSearchNetwork: z.boolean().optional().describe('Показувати в пошукових партнерах Google (за замовчуванням false).'),
    targetContentNetwork: z.boolean().optional().describe('Показувати в контекстно-медійній мережі (за замовчуванням false — для пошукової кампанії НЕ рекомендується).'),
  },
  async ({ name, dailyBudget, biddingStrategy, targetCpa, startDate, endDate, targetGoogleSearch, targetSearchNetwork, targetContentNetwork }) => {
    const result = await adsService.createSearchCampaign({
      name,
      dailyBudget,
      biddingStrategy,
      targetCpa,
      startDate,
      endDate,
      networkSettings: {
        targetGoogleSearch: targetGoogleSearch ?? true,
        targetSearchNetwork: targetSearchNetwork ?? false,
        targetContentNetwork: targetContentNetwork ?? false,
      },
    });
    return {
      content: [{ type: 'text', text: JSON.stringify({ ...result, note: 'Кампанію створено в статусі PAUSED. Для активації виклич update_campaign_status з status=ENABLED.' }, null, 2) }],
    };
  }
);

server.tool(
  'update_campaign_status',
  `Змінити статус кампанії: увімкнути (ENABLED) або призупинити (PAUSED).

КОЛИ ВИКОРИСТОВУВАТИ:
- Після створення кампанії — щоб активувати її
- Щоб призупинити кампанію що зливає бюджет
- Для сезонного керування (пауза/відновлення)

ОБОВ'ЯЗКОВІ ПАРАМЕТРИ: campaignId (отримай через get_campaigns), status.`,
  {
    campaignId: z.string().describe(
      'ID кампанії (числовий рядок). Отримай його спочатку через get_campaigns або get_account_overview.'
    ),
    status: z.enum(['ENABLED', 'PAUSED']).describe(
      'Новий статус: "ENABLED" — увімкнути кампанію, "PAUSED" — призупинити.'
    ),
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
  `Змінити денний бюджет кампанії. Сума задається у валюті акаунту (не в мікро-одиницях).

КОЛИ ВИКОРИСТОВУВАТИ:
- Після аудиту — щоб збільшити бюджет ефективних кампаній
- Щоб зменшити бюджет кампаній що не конвертують
- Коли кампанія обмежена бюджетом (budget limited) — збільшити

Щоб дізнатись поточний бюджет — виклич get_campaigns.
Щоб дізнатись валюту — виклич get_account_info.`,
  {
    campaignId: z.string().describe(
      'ID кампанії для зміни бюджету (числовий рядок). Отримай через get_campaigns.'
    ),
    amount: z.number().positive().describe(
      'Нова сума денного бюджету у валюті акаунту. Наприклад: 500 для 500 грн/день або 100 для 100 USD/день.'
    ),
  },
  async ({ campaignId, amount }) => {
    const result = await adsService.updateDailyBudget(campaignId, amount);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  'remove_campaign',
  `⚠️ ВИДАЛИТИ КАМПАНІЮ НАЗАВЖДИ. Ця дія НЕЗВОРОТНА — кампанія отримає статус REMOVED.

КОЛИ ВИКОРИСТОВУВАТИ:
- ТІЛЬКИ коли клієнт явно підтвердив видалення
- Для очищення тестових або непотрібних кампаній
- ЗАВЖДИ ЗАПИТАЙ ПІДТВЕРДЖЕННЯ перед видаленням!

Замість видалення можна призупинити кампанію через update_campaign_status → PAUSED.`,
  {
    campaignId: z.string().describe(
      'ID кампанії для видалення (числовий рядок). ОБОВ\'ЯЗКОВО підтверди з користувачем назву кампанії перед видаленням!'
    ),
    confirmName: z.string().describe(
      'Назва кампанії для підтвердження видалення. Спочатку отримай назву через get_campaigns, покажи користувачу, і введи її сюди для підтвердження.'
    ),
  },
  async ({ campaignId, confirmName }) => {
    const campaigns = await adsService.listAllCampaigns();
    const campaign = campaigns.find(c => String(c.id) === campaignId);
    if (!campaign) {
      return { content: [{ type: 'text', text: `❌ Кампанію з ID ${campaignId} не знайдено.` }] };
    }
    if (campaign.name !== confirmName) {
      return { content: [{ type: 'text', text: `❌ Назва не співпадає. Кампанія "${campaign.name}" ≠ "${confirmName}". Видалення скасовано.` }] };
    }
    const result = await adsService.removeCampaign(campaignId);
    return {
      content: [{ type: 'text', text: JSON.stringify({ ...result, deletedCampaign: campaign.name }, null, 2) }],
    };
  }
);

// ╔═══════════════════════════════════════════════════════════════╗
// ║              ГРУПИ ОГОЛОШЕНЬ (Ad Groups)                     ║
// ╚═══════════════════════════════════════════════════════════════╝

server.tool(
  'get_ad_groups',
  `Отримати список груп оголошень з їхніми назвами, статусами, ставками CPC та метриками.

КОЛИ ВИКОРИСТОВУВАТИ:
- Щоб побачити структуру кампанії (які групи в ній є)
- Перед додаванням ключових слів або оголошень — щоб отримати ID групи
- Для порівняння ефективності між групами

ПОВЕРТАЄ: id, name, status, type, campaignId, campaignName, cpcBid, metrics.`,
  {
    campaignId: z.string().optional().describe(
      'ID кампанії для фільтрації (числовий рядок). Якщо не вказано — повертає групи з УСІХ кампаній. Отримай ID через get_campaigns.'
    ),
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
  `Створити нову групу оголошень всередині кампанії.

КОЛИ ВИКОРИСТОВУВАТИ:
- Після створення кампанії — потрібно мінімум 1 група
- Для розділення ключових слів за тематикою (кожна тема = окрема група)
- Для A/B тестування різних підходів

ПІСЛЯ СТВОРЕННЯ ГРУПИ — потрібно:
1. Додати ключові слова (add_keywords) — мінімум 5-10 на групу
2. Створити оголошення (create_rsa_ad) — мінімум 1 RSA
   ⚠️ ОБОВ'ЯЗКОВО вкажи реальний URL сайту клієнта у finalUrl!`,
  {
    campaignId: z.string().describe(
      'ID батьківської кампанії (числовий рядок). Отримай через get_campaigns.'
    ),
    name: z.string().min(1).describe(
      'Назва групи оголошень. Має відображати тематику ключових слів, наприклад: "Юридичні послуги — загальні", "Натяжні стелі — ціни".'
    ),
    cpcBidAmount: z.number().positive().describe(
      'Ставка CPC за замовчуванням для групи у валюті акаунту. Наприклад: 15 для 15 грн/клік. Окремі ключові слова можуть мати свою ставку.'
    ),
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
  `Оновити параметри групи оголошень: назву, ставку CPC або статус.

КОЛИ ВИКОРИСТОВУВАТИ:
- Для зміни ставки CPC групи (впливає на всі keywords без індивідуальної ставки)
- Для призупинення/відновлення групи
- Для перейменування`,
  {
    adGroupId: z.string().describe(
      'ID групи оголошень (числовий рядок). Отримай через get_ad_groups.'
    ),
    name: z.string().optional().describe('Нова назва групи оголошень.'),
    cpcBidAmount: z.number().positive().optional().describe(
      'Нова ставка CPC за замовчуванням у валюті акаунту.'
    ),
    status: z.enum(['ENABLED', 'PAUSED']).optional().describe(
      'Новий статус: "ENABLED" — увімкнути, "PAUSED" — призупинити.'
    ),
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
  `⚠️ ВИДАЛИТИ ГРУПУ ОГОЛОШЕНЬ. Також видаляє ВСІ ключові слова та оголошення всередині!

КОЛИ ВИКОРИСТОВУВАТИ:
- Для очищення порожніх або неефективних груп
- ЗАВЖДИ ЗАПИТАЙ ПІДТВЕРДЖЕННЯ перед видаленням!`,
  {
    adGroupId: z.string().describe(
      'ID групи оголошень для видалення (числовий рядок). Отримай через get_ad_groups та покажи користувачу назву перед видаленням!'
    ),
  },
  async ({ adGroupId }) => {
    const result = await adsService.removeAdGroup(adGroupId);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ╔═══════════════════════════════════════════════════════════════╗
// ║                  ОГОЛОШЕННЯ (Ads)                            ║
// ╚═══════════════════════════════════════════════════════════════╝

server.tool(
  'get_ads',
  `Отримати список оголошень з їхніми текстами (headlines, descriptions), URL-ами та метриками.

КОЛИ ВИКОРИСТОВУВАТИ:
- Для аудиту якості оголошень (тексти, CTR)
- Перед створенням нового оголошення — щоб не дублювати
- Для A/B порівняння оголошень у групі

ПОВЕРТАЄ: adId, adGroupId, adGroupName, campaignName, status, type, headlines[], descriptions[], finalUrls[], metrics.`,
  {
    adGroupId: z.string().optional().describe(
      'ID групи оголошень для фільтрації (числовий рядок). Якщо не вказано — повертає оголошення з УСІХ груп. Отримай ID через get_ad_groups.'
    ),
    campaignId: z.string().optional().describe(
      'ID кампанії для фільтрації (числовий рядок). Використовуй для перегляду всіх оголошень кампанії.'
    ),
  },
  async ({ adGroupId, campaignId }) => {
    // Якщо передано campaignId, спочатку отримаємо всі ad groups цієї кампанії
    if (campaignId && !adGroupId) {
      const groups = await adsService.getAdGroups(campaignId);
      const allAds = [];
      for (const group of groups) {
        const ads = await adsService.getAds(String(group.id));
        allAds.push(...ads);
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(allAds, null, 2) }],
      };
    }
    const ads = await adsService.getAds(adGroupId);
    return {
      content: [{ type: 'text', text: JSON.stringify(ads, null, 2) }],
    };
  }
);

server.tool(
  'create_rsa_ad',
  `Створити нове Responsive Search Ad (RSA) оголошення. Google автоматично тестує комбінації заголовків та описів.

⚠️ КРИТИЧНО ВАЖЛИВО:
- finalUrl ПОВИНЕН бути РЕАЛЬНОЮ URL-адресою сайту/сторінки клієнта!
- НІКОЛИ не використовуй вигадані або рандомні URL
- ЗАВЖДИ ЗАПИТАЙ у користувача URL посадкової сторінки якщо він не вказаний!

ВИМОГИ Google Ads:
- Мінімум 3 заголовки (headlines), максимум 15
- Мінімум 2 описи (descriptions), максимум 4
- Заголовок: максимум 30 символів
- Опис: максимум 90 символів
- URL повинен бути валідним і працюючим

РЕКОМЕНДАЦІЇ для ефективних оголошень:
- Мінімум 1 заголовок з ключовим словом
- Мінімум 1 заголовок з CTA (Замовте, Отримайте)
- Мінімум 1 заголовок з числом (ціна, знижка, термін)
- Кожен опис має закінчуватись CTA`,
  {
    adGroupId: z.string().describe(
      'ID групи оголошень куди додати рекламу (числовий рядок). Отримай через get_ad_groups.'
    ),
    headlines: z.array(z.string().max(30)).min(3).max(15).describe(
      'Масив заголовків (від 3 до 15 штук, кожен до 30 символів). Приклад: ["Юридичні Послуги Київ", "Консультація від 500 грн", "Замовте Зараз — Знижка 20%", "10+ Років Досвіду"].'
    ),
    descriptions: z.array(z.string().max(90)).min(2).max(4).describe(
      'Масив описів (від 2 до 4 штук, кожен до 90 символів). Приклад: ["Професійна юридична допомога з 2010 року. Перша консультація безкоштовно. Зателефонуйте!", "Вирішуємо складні справи швидко та ефективно. Гарантія конфіденційності. Замовте зараз!"].'
    ),
    finalUrl: z.string().url().describe(
      '⚠️ URL посадкової сторінки — РЕАЛЬНА адреса сайту клієнта! Наприклад: "https://example.com/services/legal" або "https://myshop.ua/category/ceiling". НІКОЛИ не використовуй вигадані URL! Якщо URL невідомий — ЗАПИТАЙ у користувача!'
    ),
    path1: z.string().max(15).optional().describe(
      'Перша частина відображуваного шляху URL (до 15 символів). Наприклад: "Послуги" → URL буде показаний як example.com/Послуги.'
    ),
    path2: z.string().max(15).optional().describe(
      'Друга частина відображуваного шляху URL (до 15 символів). Наприклад: "Київ" → URL буде показаний як example.com/Послуги/Київ.'
    ),
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
  `Змінити статус оголошення: увімкнути (ENABLED) або призупинити (PAUSED).

КОЛИ ВИКОРИСТОВУВАТИ:
- Після аудиту якості — призупинити слабкі оголошення
- Для A/B тестування — залишити тільки переможця
- Для відновлення раніше призупиненого оголошення`,
  {
    adGroupId: z.string().describe(
      'ID групи оголошень (числовий рядок). Отримай через get_ad_groups або get_ads.'
    ),
    adId: z.string().describe(
      'ID оголошення (числовий рядок). Отримай через get_ads.'
    ),
    status: z.enum(['ENABLED', 'PAUSED']).describe(
      'Новий статус: "ENABLED" — увімкнути, "PAUSED" — призупинити.'
    ),
  },
  async ({ adGroupId, adId, status }) => {
    const result = await adsService.updateAdStatus(adGroupId, adId, status as AdStatusEnum);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ╔═══════════════════════════════════════════════════════════════╗
// ║              КЛЮЧОВІ СЛОВА (Keywords)                        ║
// ╚═══════════════════════════════════════════════════════════════╝

server.tool(
  'get_keywords',
  `Отримати список ключових слів з їхніми текстами, типами відповідності, Quality Score, ставками CPC та метриками.

КОЛИ ВИКОРИСТОВУВАТИ:
- Для аудиту ключових слів: знайти неефективні (високий cost, 0 конверсій)
- Для аналізу Quality Score (QS < 5 = проблема)
- Перед зміною ставок — побачити поточні CPC
- Для порівняння BROAD/PHRASE/EXACT розподілу

ПОВЕРТАЄ: criterionId, adGroupId, adGroupName, campaignId, campaignName, text, matchType, status, cpcBid, qualityScore, metrics.`,
  {
    campaignId: z.string().optional().describe(
      'ID кампанії для фільтрації (числовий рядок). Отримай через get_campaigns.'
    ),
    adGroupId: z.string().optional().describe(
      'ID групи оголошень для фільтрації (числовий рядок). Отримай через get_ad_groups.'
    ),
  },
  async ({ campaignId, adGroupId }) => {
    // Якщо є adGroupId, фільтруємо результат по ньому
    const keywords = await adsService.getKeywords(campaignId);
    if (adGroupId) {
      const filtered = keywords.filter(k => String(k.adGroupId) === adGroupId);
      return {
        content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }],
      };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(keywords, null, 2) }],
    };
  }
);

server.tool(
  'add_keywords',
  `Додати нові ключові слова до групи оголошень.

КОЛИ ВИКОРИСТОВУВАТИ:
- Після створення групи оголошень — додати релевантні ключові слова
- Після аналізу пошукових запитів — додати конвертуючі запити як ключові слова
- Після generate_keyword_ideas — додати знайдені ідеї

РЕКОМЕНДАЦІЇ:
- 5-20 ключових слів на групу оголошень
- Використовуй PHRASE або EXACT для контролю релевантності
- BROAD — тільки з розумним CPC та моніторингом search terms
- Ключові слова мають відповідати тематиці групи оголошень`,
  {
    adGroupId: z.string().describe(
      'ID групи оголошень куди додати ключові слова (числовий рядок). Отримай через get_ad_groups.'
    ),
    keywords: z.array(
      z.object({
        text: z.string().describe(
          'Текст ключового слова. Наприклад: "юридичні послуги київ", "натяжні стелі ціна".'
        ),
        matchType: z.enum(['BROAD', 'PHRASE', 'EXACT']).describe(
          'Тип відповідності:\n- BROAD — широка відповідність (Google показує по схожих запитах)\n- PHRASE — фразова відповідність (запит має містити цю фразу)\n- EXACT — точна відповідність (тільки цей запит та близькі варіанти)'
        ),
        cpcBidAmount: z.number().positive().optional().describe(
          'Індивідуальна ставка CPC у валюті акаунту. Якщо не вказано — використовується ставка групи оголошень.'
        ),
      })
    ).min(1).describe(
      'Масив ключових слів для додавання. Кожне слово: text + matchType + опціональний cpcBidAmount.'
    ),
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
  `Видалити ключове слово з групи оголошень.

КОЛИ ВИКОРИСТОВУВАТИ:
- Для видалення нерелевантних або неефективних ключових слів
- Після аудиту — прибрати слова з QS = 1-2 та 0 конверсій`,
  {
    adGroupId: z.string().describe(
      'ID групи оголошень (числовий рядок). Отримай через get_keywords — поле adGroupId.'
    ),
    criterionId: z.string().describe(
      'Criterion ID ключового слова (числовий рядок). Отримай через get_keywords — поле criterionId.'
    ),
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
  `Змінити ставку CPC для конкретного ключового слова.

КОЛИ ВИКОРИСТОВУВАТИ:
- Після аудиту — підвищити ставку для конвертуючих ключових слів з QS ≥ 7
- Знизити ставку для слів з QS ≤ 4 або без конверсій
- Для оптимізації CPA — збалансувати витрати між ключовими словами`,
  {
    adGroupId: z.string().describe(
      'ID групи оголошень (числовий рядок). Отримай через get_keywords.'
    ),
    criterionId: z.string().describe(
      'Criterion ID ключового слова (числовий рядок). Отримай через get_keywords.'
    ),
    cpcAmount: z.number().positive().describe(
      'Нова ставка CPC у валюті акаунту. Наприклад: 10 для 10 грн/клік. Поточну ставку можна побачити через get_keywords.'
    ),
  },
  async ({ adGroupId, criterionId, cpcAmount }) => {
    const result = await adsService.updateKeywordCpc(adGroupId, criterionId, cpcAmount);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  'get_quality_score_report',
  `Отримати детальний звіт Quality Score по ключових словах: загальний QS, якість оголошення, якість лендингу, очікуваний CTR.

КОЛИ ВИКОРИСТОВУВАТИ:
- Для аудиту якості ключових слів
- Для знаходження проблемних ключових слів (QS ≤ 5)
- Для розуміння ЧОМУ ключове слово має низький QS:
  - creativeQuality — якість тексту оголошення
  - landingPageQuality — якість посадкової сторінки
  - expectedCtr — очікуваний CTR

ПОВЕРТАЄ: keyword, matchType, qualityScore, creativeQuality, landingPageQuality, expectedCtr, metrics.`,
  {
    campaignId: z.string().optional().describe(
      'ID кампанії для фільтрації. Якщо не вказано — аналіз по всьому акаунту.'
    ),
  },
  async ({ campaignId }) => {
    const report = await adsService.getQualityScoreReport(campaignId);
    return {
      content: [{ type: 'text', text: JSON.stringify(report, null, 2) }],
    };
  }
);

// ╔═══════════════════════════════════════════════════════════════╗
// ║            МІНУС-СЛОВА (Negative Keywords)                   ║
// ╚═══════════════════════════════════════════════════════════════╝

server.tool(
  'get_negative_keywords',
  `Отримати список існуючих мінус-слів (негативних ключових слів) акаунту або кампанії.

КОЛИ ВИКОРИСТОВУВАТИ:
- Перед додаванням нових мінус-слів — щоб не дублювати
- Для аудиту покриття мінус-словами (чи є базові стоп-слова)
- Для перевірки чи сміттєві запити вже заблоковані`,
  {
    campaignId: z.string().optional().describe(
      'ID кампанії для фільтрації (числовий рядок). Якщо не вказано — повертає мінус-слова з УСІХ кампаній.'
    ),
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
  `Додати мінус-слова (негативні ключові слова) на рівні кампанії або групи оголошень.
Мінус-слова блокують показ реклами по нерелевантних запитах.

КОЛИ ВИКОРИСТОВУВАТИ:
- Після аналізу search terms — заблокувати сміттєві запити
- Для запобігання витратам на нерелевантні кліки
- Базові мінус-слова: "безкоштовно", "своїми руками", "DIY", "відео", "скачати", "реферат"

РЕКОМЕНДАЦІЇ:
- Рівень "campaign" — для мінус-слів що стосуються всієї кампанії
- Рівень "ad_group" — для мінус-слів специфічних для однієї групи
- PHRASE match — для загальних блокувань ("безкоштовно")
- EXACT match — для специфічних запитів ("послуги безкоштовно онлайн")`,
  {
    level: z.enum(['campaign', 'ad_group']).describe(
      'Рівень додавання: "campaign" — блокує для всієї кампанії, "ad_group" — тільки для конкретної групи.'
    ),
    resourceId: z.string().describe(
      'ID кампанії або групи оголошень (залежить від level). Отримай через get_campaigns або get_ad_groups.'
    ),
    keywords: z.array(
      z.object({
        text: z.string().describe(
          'Текст мінус-слова. Наприклад: "безкоштовно", "своїми руками", "відгуки".'
        ),
        matchType: z.enum(['BROAD', 'PHRASE', 'EXACT']).describe(
          'Тип відповідності мінус-слова:\n- BROAD — блокує будь-яке входження слів (у будь-якому порядку)\n- PHRASE — блокує точну фразу (порядок слів важливий)\n- EXACT — блокує тільки точний запит'
        ),
      })
    ).min(1).describe('Масив мінус-слів для додавання.'),
  },
  async ({ level, resourceId, keywords }) => {
    const result = await adsService.addNegativeKeywords(level as NegativeKeywordLevel, resourceId, keywords as any[]);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  'remove_negative_keyword',
  `Видалити конкретне мінус-слово з кампанії або групи оголошень.

КОЛИ ВИКОРИСТОВУВАТИ:
- Якщо мінус-слово блокує потрібні запити (помилково додане)
- Для коригування списку мінус-слів після аудиту`,
  {
    level: z.enum(['campaign', 'ad_group']).describe(
      'Рівень: "campaign" або "ad_group" — де знаходиться мінус-слово.'
    ),
    resourceId: z.string().describe(
      'ID кампанії або групи оголошень.'
    ),
    criterionId: z.string().describe(
      'Criterion ID мінус-слова. Отримай через get_negative_keywords.'
    ),
  },
  async ({ level, resourceId, criterionId }) => {
    const result = await adsService.removeNegativeKeyword(level as NegativeKeywordLevel, resourceId, criterionId);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ╔═══════════════════════════════════════════════════════════════╗
// ║            ПОШУКОВІ ЗАПИТИ (Search Terms)                    ║
// ╚═══════════════════════════════════════════════════════════════╝

server.tool(
  'get_search_terms',
  `Отримати РЕАЛЬНІ пошукові запити які вводили користувачі та які тригерили ваші оголошення, з метриками ефективності.

КОЛИ ВИКОРИСТОВУВАТИ:
- Для знаходження сміттєвих запитів (cost > 0, conversions = 0) — кандидати в мінус-слова
- Для знаходження нових ключових слів (запити з конверсіями які ще не є keywords)
- Для аудиту релевантності BROAD-ключових слів
- ОБОВ'ЯЗКОВО при аудиті акаунту — це головне джерело зливу бюджету

ПОВЕРТАЄ: searchTerm, status (ADDED/EXCLUDED/NONE), campaignId, campaignName, adGroupId, adGroupName, metrics.`,
  {
    campaignId: z.string().optional().describe(
      'ID кампанії для фільтрації (числовий рядок). Якщо не вказано — повертає запити з УСІХ кампаній.'
    ),
    limit: z.number().min(1).max(1000).optional().describe(
      'Максимальна кількість результатів (за замовчуванням 100, максимум 1000). Для повного аудиту рекомендується 500+.'
    ),
    minCost: z.number().optional().describe(
      'Мінімальна вартість запиту у валюті акаунту для фільтрації. Наприклад: 5 — покаже тільки запити з витратами > 5 грн.'
    ),
  },
  async ({ campaignId, limit, minCost }) => {
    const terms = await adsService.getSearchTerms(campaignId, limit);
    let filtered = terms;
    if (minCost !== undefined && minCost > 0) {
      filtered = terms.filter(t => t.metrics.cost >= minCost);
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }],
    };
  }
);

// ╔═══════════════════════════════════════════════════════════════╗
// ║              ЗВІТНІСТЬ (Reporting & Analytics)               ║
// ╚═══════════════════════════════════════════════════════════════╝

server.tool(
  'get_performance_report',
  `Згенерувати звіт продуктивності акаунту за обраний період: деталізація по датах та кампаніях + підсумки.

КОЛИ ВИКОРИСТОВУВАТИ:
- Для аналізу трендів (щоденна динаміка кліків/витрат/конверсій)
- Для порівняння періодів (цей місяць vs минулий)
- Для визначення дорогих днів та аномалій
- При аудиті акаунту — щоб побачити загальну картину

ПОВЕРТАЄ: rows (date, campaignId, campaignName, clicks, impressions, cost, conversions, ctr), totals.`,
  {
    startDate: z.string().describe(
      'Початок періоду у форматі YYYY-MM-DD. Наприклад: "2025-03-01".'
    ),
    endDate: z.string().describe(
      'Кінець періоду у форматі YYYY-MM-DD. Наприклад: "2025-03-31".'
    ),
    campaignId: z.string().optional().describe(
      'ID кампанії для фільтрації. Якщо не вказано — звіт по всьому акаунту.'
    ),
  },
  async ({ startDate, endDate, campaignId }) => {
    const report = await adsService.getPerformanceReport(startDate, endDate);
    if (campaignId) {
      report.rows = report.rows.filter(r => String(r.campaignId) === campaignId);
      // Перерахуємо totals
      const totals = report.rows.reduce(
        (acc, row) => ({
          clicks: acc.clicks + row.clicks,
          impressions: acc.impressions + row.impressions,
          cost: Number((acc.cost + row.cost).toFixed(2)),
          conversions: acc.conversions + row.conversions,
        }),
        { clicks: 0, impressions: 0, cost: 0, conversions: 0 }
      );
      report.totals = {
        ...totals,
        averageCtr: totals.impressions > 0 ? Number(((totals.clicks / totals.impressions) * 100).toFixed(2)) : 0,
        averageCostPerConversion: totals.conversions > 0 ? Number((totals.cost / totals.conversions).toFixed(2)) : 0,
      };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(report, null, 2) }],
    };
  }
);

server.tool(
  'get_geographic_report',
  `Отримати звіт ефективності реклами по ГЕОГРАФІЇ: з яких країн/регіонів приходять кліки та конверсії.

КОЛИ ВИКОРИСТОВУВАТИ:
- Для визначення які регіони конвертують найкраще
- Для знаходження регіонів що зливають бюджет (кліки без конверсій)
- Для оптимізації геотаргетингу кампаній
- При аудиті — щоб зрозуміти географічний розподіл трафіку`,
  {
    startDate: z.string().describe('Початок періоду у форматі YYYY-MM-DD.'),
    endDate: z.string().describe('Кінець періоду у форматі YYYY-MM-DD.'),
    campaignId: z.string().optional().describe('ID кампанії для фільтрації.'),
  },
  async ({ startDate, endDate, campaignId }) => {
    const report = await adsService.getGeographicReport(startDate, endDate, campaignId);
    return {
      content: [{ type: 'text', text: JSON.stringify(report, null, 2) }],
    };
  }
);

server.tool(
  'get_device_report',
  `Отримати звіт ефективності реклами по ДЕВАЙСАХ: Desktop, Mobile, Tablet.

КОЛИ ВИКОРИСТОВУВАТИ:
- Для визначення який девайс конвертує найкраще
- Для оптимізації ставок по девайсах (наприклад знизити на mobile якщо не конвертує)
- При аудиті — часто mobile має high bounce rate та low conversions
- Для розуміння розподілу бюджету між девайсами`,
  {
    startDate: z.string().describe('Початок періоду у форматі YYYY-MM-DD.'),
    endDate: z.string().describe('Кінець періоду у форматі YYYY-MM-DD.'),
    campaignId: z.string().optional().describe('ID кампанії для фільтрації.'),
  },
  async ({ startDate, endDate, campaignId }) => {
    const report = await adsService.getDeviceReport(startDate, endDate, campaignId);
    return {
      content: [{ type: 'text', text: JSON.stringify(report, null, 2) }],
    };
  }
);

server.tool(
  'get_hour_of_day_report',
  `Отримати звіт ефективності реклами по ГОДИНАХ ДНЯ (0-23): коли реклама працює найкраще/найгірше.

КОЛИ ВИКОРИСТОВУВАТИ:
- Для оптимізації розкладу показу оголошень (ad schedule)
- Для знаходження годин з дорогими кліками без конверсій
- Для визначення піків активності цільової аудиторії
- При оптимізації бюджету — вимкнути покази вночі якщо немає конверсій`,
  {
    startDate: z.string().describe('Початок періоду у форматі YYYY-MM-DD.'),
    endDate: z.string().describe('Кінець періоду у форматі YYYY-MM-DD.'),
    campaignId: z.string().optional().describe('ID кампанії для фільтрації.'),
  },
  async ({ startDate, endDate, campaignId }) => {
    const report = await adsService.getHourOfDayReport(startDate, endDate, campaignId);
    return {
      content: [{ type: 'text', text: JSON.stringify(report, null, 2) }],
    };
  }
);

server.tool(
  'get_age_gender_report',
  `Отримати демографічний звіт: розподіл кліків та конверсій по ВІ КУ та СТАТІ аудиторії.

КОЛИ ВИКОРИСТОВУВАТИ:
- Для визначення яка демографія конвертує найкраще
- Для оптимізації ставок по демографії (вимкнути вікові групи без конверсій)
- При аудиті — зрозуміти портрет цільової аудиторії`,
  {
    startDate: z.string().describe('Початок періоду у форматі YYYY-MM-DD.'),
    endDate: z.string().describe('Кінець періоду у форматі YYYY-MM-DD.'),
    campaignId: z.string().optional().describe('ID кампанії для фільтрації.'),
  },
  async ({ startDate, endDate, campaignId }) => {
    const report = await adsService.getAgeGenderReport(startDate, endDate, campaignId);
    return {
      content: [{ type: 'text', text: JSON.stringify(report, null, 2) }],
    };
  }
);

server.tool(
  'get_budget_utilization',
  `Аналіз утилізації бюджетів: які кампанії витрачають весь бюджет (budget limited) а які ні.

КОЛИ ВИКОРИСТОВУВАТИ:
- Для знаходження "budget limited" кампаній — їм потрібно збільшити бюджет
- Для оптимізації розподілу бюджету між кампаніями
- При аудиті — зрозуміти чи бюджет використовується ефективно
- utilizationPercent ≥ 90% = кампанія обмежена бюджетом

ПОВЕРТАЄ: campaignId, campaignName, dailyBudget, avgDailySpend, utilizationPercent, isLimited.`,
  {},
  async () => {
    const utilization = await adsService.getBudgetUtilization();
    return {
      content: [{ type: 'text', text: JSON.stringify(utilization, null, 2) }],
    };
  }
);

server.tool(
  'get_conversion_actions',
  `Отримати список всіх конверсійних дій (цілей) налаштованих в Google Ads акаунті.

КОЛИ ВИКОРИСТОВУВАТИ:
- На початку аудиту — щоб зрозуміти ЩО рахується як конверсія
- Для перевірки чи правильно налаштоване відстеження конверсій
- Якщо конверсій = 0 — перевірити чи є активні конверсійні дії

ПОВЕРТАЄ: id, name, category, type, status, countingType.`,
  {},
  async () => {
    const actions = await adsService.getConversionActions();
    return {
      content: [{ type: 'text', text: JSON.stringify(actions, null, 2) }],
    };
  }
);

// ╔═══════════════════════════════════════════════════════════════╗
// ║        ПЛАНУВАЛЬНИК КЛЮЧОВИХ СЛІВ (Keyword Planner)          ║
// ╚═══════════════════════════════════════════════════════════════╝

server.tool(
  'generate_keyword_ideas',
  `Згенерувати ідеї нових ключових слів на основі seed-слів: обсяг пошуку, конкуренція, рекомендований CPC.

⚠️ ВИМОГИ: потрібен Basic або Standard рівень доступу API (не Explorer).

КОЛИ ВИКОРИСТОВУВАТИ:
- Для пошуку нових ключових слів для кампанії
- Для розуміння обсягу пошуку перед створенням кампанії
- Для визначення конкурентності ніші
- Перед створенням RSA — щоб включити популярні запити в заголовки

ПОВЕРТАЄ: text, avgMonthlySearches, competition, lowTopOfPageBidMicros, highTopOfPageBidMicros.`,
  {
    keywords: z.array(z.string()).min(1).describe(
      'Масив seed-ключових слів для генерації ідей. Наприклад: ["юридичні послуги київ", "адвокат київ"]. Мінімум 1 слово.'
    ),
    languageId: z.number().optional().describe(
      'ID мови для таргетингу. Основні: 1000 = English, 1033 = Ukrainian, 1031 = German, 1027 = French, 1045 = Polish. За замовчуванням — Ukrainian (1033).'
    ),
    geoTargetId: z.number().optional().describe(
      'ID географічного таргету. Основні: 2804 = Україна, 2840 = США, 2826 = Великобританія, 2276 = Німеччина, 2616 = Польша, 9112242 = Київ.'
    ),
  },
  async ({ keywords, languageId, geoTargetId }) => {
    const result = await adsService.generateKeywordIdeas({ keywords, languageId, geoTargetId });
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ╔═══════════════════════════════════════════════════════════════╗
// ║              CUSTOM GAQL ЗАПИТ (Advanced)                    ║
// ╚═══════════════════════════════════════════════════════════════╝

server.tool(
  'run_gaql_query',
  `Виконати довільний GAQL (Google Ads Query Language) запит до Google Ads API. Для просунутих користувачів.

КОЛИ ВИКОРИСТОВУВАТИ:
- Коли стандартні інструменти не покривають потрібний звіт
- Для отримання специфічних метрик або вимірів
- Для складних фільтрацій

⚠️ УВАГА: використовуй тільки SELECT запити (тільки читання даних). Мутації через цей інструмент неможливі.

ПРИКЛАДИ GAQL:
- SELECT campaign.name, metrics.clicks FROM campaign WHERE metrics.clicks > 100
- SELECT ad_group.name, metrics.conversions FROM ad_group WHERE campaign.id = 12345
- SELECT search_term_view.search_term, metrics.cost_micros FROM search_term_view WHERE metrics.cost_micros > 5000000`,
  {
    query: z.string().min(10).describe(
      'GAQL запит. Синтаксис: SELECT [поля] FROM [ресурс] WHERE [умови] ORDER BY [поле] LIMIT [число]. Документація: https://developers.google.com/google-ads/api/docs/query/overview'
    ),
  },
  async ({ query }) => {
    // Безпека: перевіряємо що це тільки SELECT запит
    if (!query.trim().toUpperCase().startsWith('SELECT')) {
      return {
        content: [{ type: 'text', text: '❌ Дозволені тільки SELECT запити (читання даних).' }],
      };
    }
    const results = await adsService.runGaqlQuery(query);
    return {
      content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
    };
  }
);

// ╔═══════════════════════════════════════════════════════════════╗
// ║        GOOGLE ANALYTICS 4 (GA4)                              ║
// ╚═══════════════════════════════════════════════════════════════╝

server.tool(
  'get_ga4_report',
  `Запустити кастомний звіт Google Analytics 4 для отримання даних про трафік, конверсії, поведінку на сайті.

КОЛИ ВИКОРИСТОВУВАТИ:
- Для аналізу поведінки користувачів ПІСЛЯ кліку (bounce rate, engagement, conversions)
- Для порівняння конверсій з різних джерел трафіку (organic vs paid)
- Для аудиту посадкових сторінок (landingPage + bounceRate)
- Для крос-аналізу з Google Ads даними

ПОПУЛЯРНІ КОМБІНАЦІЇ ПАРАМЕТРІВ:
1. Трафік по джерелах: dimensions=["sessionSource","sessionMedium"], metrics=["sessions","conversions"]
2. Ефективність лендингів: dimensions=["landingPagePlusQueryString"], metrics=["sessions","bounceRate","conversions","engagementRate"]
3. Конверсії по кампаніях: dimensions=["sessionCampaignName"], metrics=["sessions","conversions","engagementRate"]
4. Поведінка: dimensions=["pagePath"], metrics=["screenPageViews","averageSessionDuration","engagementRate"]`,
  {
    propertyId: z.string().optional().describe(
      'GA4 Property ID (числовий рядок, наприклад "123456789"). Якщо не вказано — використовується GA_PROPERTY_ID з .env. Знайти ID: GA4 → Admin → Property Settings.'
    ),
    dimensions: z.array(z.string()).min(1).describe(
      'Масив вимірів GA4. Основні:\n- "sessionSource" — джерело трафіку\n- "sessionMedium" — тип трафіку (organic/cpc/referral)\n- "sessionCampaignName" — назва кампанії\n- "landingPagePlusQueryString" — URL посадкової сторінки\n- "country" — країна\n- "city" — місто\n- "deviceCategory" — тип девайсу\n- "pagePath" — сторінка'
    ),
    metrics: z.array(z.string()).min(1).describe(
      'Масив метрик GA4. Основні:\n- "sessions" — сесії\n- "totalUsers" — унікальні користувачі\n- "conversions" — конверсії\n- "engagementRate" — рівень залучення\n- "bounceRate" — показник відмов\n- "averageSessionDuration" — середня тривалість сесії\n- "screenPageViewsPerSession" — сторінок за сесію'
    ),
    startDate: z.string().optional().describe(
      'Дата початку. Формати: "YYYY-MM-DD" (наприклад "2025-03-01") або відносні: "today", "yesterday", "7daysAgo", "30daysAgo", "90daysAgo". За замовчуванням: "30daysAgo".'
    ),
    endDate: z.string().optional().describe(
      'Дата закінчення. Формати ті ж. За замовчуванням: "today".'
    ),
  },
  async ({ propertyId, dimensions, metrics, startDate, endDate }) => {
    const report = await gaService.getReport({ propertyId, dimensions, metrics, startDate, endDate });
    return {
      content: [{ type: 'text', text: JSON.stringify(report, null, 2) }],
    };
  }
);

// ╔═══════════════════════════════════════════════════════════════╗
// ║        GOOGLE SEARCH CONSOLE (GSC)                           ║
// ╚═══════════════════════════════════════════════════════════════╝

server.tool(
  'get_gsc_sites',
  `Отримати список всіх верифікованих сайтів в Google Search Console.

КОЛИ ВИКОРИСТОВУВАТИ:
- На початку роботи — щоб дізнатись який siteUrl використовувати для get_gsc_search_analytics
- Для перевірки чи сайт клієнта верифікований в GSC

ПОВЕРТАЄ: масив сайтів з URL та рівнем доступу. URL може бути у форматі "sc-domain:example.com" або "https://example.com/".`,
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
  `Отримати дані Search Analytics з Google Search Console: органічні кліки, покази, CTR, позиція по запитах та сторінках.

КОЛИ ВИКОРИСТОВУВАТИ:
- Для SEO vs PPC аналізу — порівняти органічні та платні запити
- Для знаходження "майже-топ" запитів (позиція 4-10) де можна підсилити PPC
- Для аудиту посадкових сторінок — органічний CTR та позиції
- Для знаходження SEO-прогалин (запити в Ads що не мають органіки)

ПОВЕРТАЄ: масив рядків з keys (значення dimensions), clicks, impressions, ctr, position.`,
  {
    siteUrl: z.string().describe(
      'URL сайту з Google Search Console. Формати:\n- "sc-domain:example.com" — для domain property\n- "https://example.com/" — для URL prefix property\nОтримай список сайтів через get_gsc_sites!'
    ),
    startDate: z.string().describe(
      'Початок періоду у форматі YYYY-MM-DD. GSC зберігає дані за останні 16 місяців.'
    ),
    endDate: z.string().describe(
      'Кінець періоду у форматі YYYY-MM-DD.'
    ),
    dimensions: z.array(z.string()).optional().describe(
      'Виміри для групування. Доступні:\n- "query" — пошукові запити\n- "page" — URL сторінок\n- "device" — тип девайсу (DESKTOP/MOBILE/TABLET)\n- "country" — країна\n- "date" — дата\nЗа замовчуванням: ["query", "page"].'
    ),
    rowLimit: z.number().min(1).max(25000).optional().describe(
      'Кількість рядків у результаті (за замовчуванням 100, максимум 25000). Для повного аналізу рекомендується 1000+.'
    ),
  },
  async ({ siteUrl, startDate, endDate, dimensions, rowLimit }) => {
    const data = await gscService.querySearchAnalytics(siteUrl, startDate, endDate, dimensions, rowLimit);
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ╔═══════════════════════════════════════════════════════════════╗
// ║           МАРКЕТИНГОВІ СКІЛИ (src/skills/)                   ║
// ╚═══════════════════════════════════════════════════════════════╝

registerAllSkills(server);


// ╔═══════════════════════════════════════════════════════════════╗
// ║                    ЗАПУСК СЕРВЕРУ                             ║
// ╚═══════════════════════════════════════════════════════════════╝

async function main() {
  console.error('Starting Google Marketing MCP Server v2.0...');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Google Marketing MCP Server connected via stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
