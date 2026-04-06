/**
 * Google Ads API — TypeScript інтерфейси та типи
 *
 * Централізовані типи для всіх сервісів проекту.
 * Кожен інтерфейс описаний коментарями для зручної навігації.
 */

// ─────────────────────────────────────────────
// Конфігурація
// ─────────────────────────────────────────────

/** Креденшіали OAuth 2.0 для ініціалізації GoogleAdsApi */
export interface IGoogleAdsCredentials {
  /** Developer token з Google Ads Manager (Tools → API Center) */
  developerToken: string;
  /** OAuth 2.0 Client ID з Google Cloud Console */
  clientId: string;
  /** OAuth 2.0 Client Secret */
  clientSecret: string;
  /** Refresh token для автоматичного оновлення access token */
  refreshToken: string;
  /** Google Ads Customer ID (без дефісів, 10 цифр) */
  customerId: string;
  /** (Optional) Login Customer ID — ID Manager-аккаунту (MCC) */
  loginCustomerId?: string;
}

// ─────────────────────────────────────────────
// Кампанії
// ─────────────────────────────────────────────

/** Статус кампанії відповідно до Google Ads API */
export enum CampaignStatusEnum {
  ENABLED = 'ENABLED',
  PAUSED = 'PAUSED',
  REMOVED = 'REMOVED',
}

/** Інформація про кампанію з основними метриками */
export interface ICampaignInfo {
  /** Унікальний ID кампанії */
  id: number | string;
  /** Назва кампанії */
  name: string;
  /** Поточний статус */
  status: string;
  /** Тип рекламного каналу (SEARCH, DISPLAY, VIDEO тощо) */
  advertisingChannelType: string;
  /** Тип стратегії ставок */
  biddingStrategyType: string;
  /** Денний бюджет у мікро-одиницях (1 USD = 1_000_000 micros) */
  budgetAmountMicros: number;
  /** Денний бюджет у звичайних одиницях валюти */
  budgetAmount: number;
  /** Метрики за весь час (або за обраний період) */
  metrics: ICampaignMetrics;
}

/** Набір метрик кампанії */
export interface ICampaignMetrics {
  /** Кількість кліків */
  clicks: number;
  /** Кількість показів */
  impressions: number;
  /** Витрати у мікро-одиницях */
  costMicros: number;
  /** Витрати у звичайних одиницях валюти */
  cost: number;
  /** Кількість конверсій */
  conversions: number;
  /** CTR (Click-Through Rate) */
  ctr: number;
  /** Середня CPC у звичайних одиницях */
  averageCpc: number;
}

// ─────────────────────────────────────────────
// Мутації
// ─────────────────────────────────────────────

/** Результат операції зміни статусу кампанії */
export interface IUpdateStatusResult {
  /** ID кампанії, що була оновлена */
  campaignId: string;
  /** Новий статус */
  newStatus: CampaignStatusEnum;
  /** Чи успішна операція */
  success: boolean;
  /** Resource name ресурсу, що було оновлено */
  resourceName?: string;
}

/** Результат операції зміни бюджету */
export interface IUpdateBudgetResult {
  /** ID кампанії */
  campaignId: string;
  /** Нова сума денного бюджету */
  newDailyBudget: number;
  /** Чи успішна операція */
  success: boolean;
  /** Resource name бюджету */
  resourceName?: string;
}

// ─────────────────────────────────────────────
// Звітність (Reporting)
// ─────────────────────────────────────────────

/** Рядок зведеного звіту по акаунту */
export interface IPerformanceReportRow {
  /** Дата (YYYY-MM-DD) */
  date: string;
  /** ID кампанії */
  campaignId: number | string;
  /** Назва кампанії */
  campaignName: string;
  /** Кількість кліків */
  clicks: number;
  /** Кількість показів */
  impressions: number;
  /** Витрати у звичайних одиницях */
  cost: number;
  /** Кількість конверсій */
  conversions: number;
  /** Вартість конверсії */
  costPerConversion: number;
  /** CTR */
  ctr: number;
}

/** Агрегований звіт по акаунту */
export interface IPerformanceReport {
  /** Період звіту */
  dateRange: {
    startDate: string;
    endDate: string;
  };
  /** Рядки звіту по кампаніях та датах */
  rows: IPerformanceReportRow[];
  /** Підсумкові метрики по всьому акаунту */
  totals: {
    clicks: number;
    impressions: number;
    cost: number;
    conversions: number;
    averageCtr: number;
    averageCostPerConversion: number;
  };
}

// ─────────────────────────────────────────────
// Ключові слова (Keywords)
// ─────────────────────────────────────────────

export enum KeywordMatchTypeEnum {
  BROAD = 'BROAD',
  PHRASE = 'PHRASE',
  EXACT = 'EXACT',
}

export enum KeywordStatusEnum {
  ENABLED = 'ENABLED',
  PAUSED = 'PAUSED',
  REMOVED = 'REMOVED',
}

/** Ключове слово з метриками */
export interface IKeywordInfo {
  criterionId: number | string;
  adGroupId: number | string;
  adGroupName: string;
  campaignId: number | string;
  campaignName: string;
  text: string;
  matchType: string;
  status: string;
  /** Ставка CPC у звичайних одиницях */
  cpcBid: number;
  qualityScore: number | null;
  metrics: {
    clicks: number;
    impressions: number;
    cost: number;
    conversions: number;
    ctr: number;
    averageCpc: number;
  };
}

/** Нове ключове слово для додавання */
export interface INewKeyword {
  text: string;
  matchType: KeywordMatchTypeEnum;
  /** CPC-ставка у звичайних одиницях. Якщо не задано — успадковується від групи */
  cpcBidAmount?: number;
}

export interface IAddKeywordsResult {
  adGroupId: string;
  added: number;
  resourceNames: string[];
}

// ─────────────────────────────────────────────
// Мінус-слова (Negative Keywords)
// ─────────────────────────────────────────────

export type NegativeKeywordLevel = 'campaign' | 'ad_group';

export interface INegativeKeyword {
  text: string;
  matchType: KeywordMatchTypeEnum;
}

export interface INegativeKeywordInfo {
  criterionId: number | string;
  text: string;
  matchType: string;
  level: NegativeKeywordLevel;
  campaignId: number | string;
  campaignName: string;
  adGroupId?: number | string;
  adGroupName?: string;
}

export interface IAddNegativeKeywordsResult {
  level: NegativeKeywordLevel;
  resourceId: string;
  added: number;
  resourceNames: string[];
}

// ─────────────────────────────────────────────
// Пошукові запити (Search Terms)
// ─────────────────────────────────────────────

export interface ISearchTermInfo {
  searchTerm: string;
  /** ADDED = вже є у ключових словах, EXCLUDED = вже мінус, NONE = новий */
  status: string;
  campaignId: number | string;
  campaignName: string;
  adGroupId: number | string;
  adGroupName: string;
  metrics: {
    clicks: number;
    impressions: number;
    cost: number;
    conversions: number;
    ctr: number;
  };
}

// ─────────────────────────────────────────────
// Групи оголошень (Ad Groups)
// ─────────────────────────────────────────────

export enum AdGroupStatusEnum {
  ENABLED = 'ENABLED',
  PAUSED = 'PAUSED',
  REMOVED = 'REMOVED',
}

export interface IAdGroupInfo {
  id: number | string;
  name: string;
  status: string;
  type: string;
  campaignId: number | string;
  campaignName: string;
  cpcBid: number;
  metrics: {
    clicks: number;
    impressions: number;
    cost: number;
    conversions: number;
  };
}

export interface IUpdateAdGroupParams {
  name?: string;
  cpcBidAmount?: number;
  status?: AdGroupStatusEnum;
}

export interface ICreateAdGroupResult {
  adGroupId: string;
  resourceName: string;
}

// ─────────────────────────────────────────────
// Оголошення (Ads)
// ─────────────────────────────────────────────

export enum AdStatusEnum {
  ENABLED = 'ENABLED',
  PAUSED = 'PAUSED',
  REMOVED = 'REMOVED',
}

export interface IAdInfo {
  adId: number | string;
  adGroupId: number | string;
  adGroupName: string;
  campaignName: string;
  status: string;
  type: string;
  headlines: string[];
  descriptions: string[];
  finalUrls: string[];
  metrics: {
    clicks: number;
    impressions: number;
    cost: number;
    conversions: number;
  };
}

export interface ICreateAdResult {
  adId: string;
  resourceName: string;
}

// ─────────────────────────────────────────────
// Google Analytics 4 (GA4) Types
// ─────────────────────────────────────────────

export interface IGa4ReportRow {
  dimensionValues: Record<string, string>;
  metricValues: Record<string, string>;
}

export interface IGa4ReportResult {
  propertyId: string;
  rowCount: number;
  rows: IGa4ReportRow[];
}

export interface IGa4ReportParams {
  propertyId?: string;
  dimensions: string[];
  metrics: string[];
  startDate?: string; // e.g. '30daysAgo'
  endDate?: string;   // e.g. 'today'
}

// ─────────────────────────────────────────────
// Планувальник ключових слів (Keyword Planner Ideas)
// ─────────────────────────────────────────────

export interface IKeywordIdea {
  text: string;
  avgMonthlySearches: number;
  competition: string;
  lowTopOfPageBidMicros?: number;
  highTopOfPageBidMicros?: number;
}

export interface IGenerateKeywordIdeasParams {
  keywords: string[];
  /** Опціонально: ID мови (наприклад, 1000 для англійської, 1033 для української) */
  languageId?: number;
  /** Опціонально: Географічний ID (наприклад, 2804 для України) */
  geoTargetId?: number;
}
