/**
 * googleAds.service.ts
 *
 * Основний сервісний шар для роботи з Google Ads API.
 * Інкапсулює ініціалізацію клієнта, керування кампаніями та звітність.
 *
 * Використано пакет `google-ads-api` від Opteo:
 * @see https://github.com/Opteo/google-ads-api
 */

import {
  GoogleAdsApi,
  enums,
  resources,
  MutateOperation,
  ResourceNames,
} from 'google-ads-api';

// ─────────────────────────────────────────────
// Enum-to-string хелпери
// ─────────────────────────────────────────────

/** Конвертує числовий CampaignStatus у рядок (ENABLED, PAUSED, тощо) */
const campaignStatusToString = (status: number | string): string => {
  const map = enums.CampaignStatus as unknown as Record<string, string>;
  return map[String(status)] ?? String(status);
};

/** Конвертує числовий AdvertisingChannelType у рядок (SEARCH, DISPLAY, тощо) */
const channelTypeToString = (type: number | string): string => {
  const map = enums.AdvertisingChannelType as unknown as Record<string, string>;
  return map[String(type)] ?? String(type);
};

/** Конвертує числовий BiddingStrategyType у рядок */
const biddingStrategyToString = (type: number | string): string => {
  const map = enums.BiddingStrategyType as unknown as Record<string, string>;
  return map[String(type)] ?? String(type);
};
import {
  IGoogleAdsCredentials,
  ICampaignInfo,
  CampaignStatusEnum,
  IUpdateStatusResult,
  IUpdateBudgetResult,
  IPerformanceReport,
  IPerformanceReportRow,
  IKeywordInfo,
  INewKeyword,
  IAddKeywordsResult,
  ISearchTermInfo,
  NegativeKeywordLevel,
  INegativeKeyword,
  IAddNegativeKeywordsResult,
  INegativeKeywordInfo,
  IAdGroupInfo,
  ICreateAdGroupResult,
  IUpdateAdGroupParams,
  IAdInfo,
  ICreateAdResult,
  AdStatusEnum,
  IGenerateKeywordIdeasParams,
  IKeywordIdea,
  IAccountInfo,
  ICreateCampaignParams,
  ICreateCampaignResult,
  IGeographicReportRow,
  IDeviceReportRow,
  IHourOfDayReportRow,
  IAgeGenderReportRow,
  ICampaignStructure,
  IBudgetUtilization,
  IConversionAction,
} from '../types';

// ─────────────────────────────────────────────
// Утиліти
// ─────────────────────────────────────────────

/** Конвертує мікро-одиниці API (1 USD = 1_000_000 micros) у звичайну валюту */
const fromMicros = (micros: number): number =>
  Number((micros / 1_000_000).toFixed(2));

/** Конвертує звичайну валюту у мікро-одиниці */
const toMicros = (amount: number): number =>
  Math.round(amount * 1_000_000);

// ─────────────────────────────────────────────
// GoogleAdsService
// ─────────────────────────────────────────────

/**
 * Сервіс для роботи з Google Ads API.
 *
 * Об'єднує функціональність:
 * - GoogleAdsClient — ініціалізація клієнта
 * - CampaignService — лістинг, зміна статусів та бюджетів
 * - ReportingService — витягування статистики через GAQL
 *
 * @example
 * ```ts
 * const service = new GoogleAdsService(config);
 * const campaigns = await service.listAllCampaigns();
 * ```
 */
export class GoogleAdsService {
  private readonly api: GoogleAdsApi;
  private readonly customer: ReturnType<GoogleAdsApi['Customer']>;
  private readonly customerId: string;

  constructor(credentials: IGoogleAdsCredentials) {
    // ── 1. Ініціалізація клієнта API ──
    this.api = new GoogleAdsApi({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      developer_token: credentials.developerToken,
    });

    // ── 2. Створення інстанса Customer ──
    this.customerId = credentials.customerId;
    this.customer = this.api.Customer({
      customer_id: credentials.customerId,
      refresh_token: credentials.refreshToken,
      ...(credentials.loginCustomerId && {
        login_customer_id: credentials.loginCustomerId,
      }),
    });

    console.log(
      `✅ GoogleAdsService ініціалізовано для аккаунту: ${credentials.customerId}`
    );
  }

  // ═══════════════════════════════════════════
  //  CampaignService — Лістинг кампаній
  // ═══════════════════════════════════════════

  /**
   * Отримує список усіх кампаній з поточними метриками.
   *
   * Виконує GAQL-запит до Google Ads API і повертає масив кампаній
   * із основними атрибутами та метриками за останні 30 днів.
   *
   * @returns Масив об'єктів ICampaignInfo
   * @throws GoogleAdsFailure при помилках API
   */
  async listAllCampaigns(): Promise<ICampaignInfo[]> {
    console.log('📋 Завантаження списку кампаній...');

    try {
      const query = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign.bidding_strategy_type,
          campaign_budget.amount_micros,
          metrics.clicks,
          metrics.impressions,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr,
          metrics.average_cpc
        FROM campaign
        WHERE campaign.status != 'REMOVED'
        ORDER BY campaign.name ASC
      `;

      const results = await this.customer.query(query);

      const campaigns: ICampaignInfo[] = results.map((row: any) => {
        const budgetMicros = Number(row.campaign_budget?.amount_micros ?? 0);
        const costMicros = Number(row.metrics?.cost_micros ?? 0);

        return {
          id: row.campaign?.id ?? 0,
          name: row.campaign?.name ?? 'Без назви',
          status: campaignStatusToString(row.campaign?.status ?? 1),
          advertisingChannelType:
            channelTypeToString(row.campaign?.advertising_channel_type ?? 1),
          biddingStrategyType:
            biddingStrategyToString(row.campaign?.bidding_strategy_type ?? 1),
          budgetAmountMicros: budgetMicros,
          budgetAmount: fromMicros(budgetMicros),
          metrics: {
            clicks: Number(row.metrics?.clicks ?? 0),
            impressions: Number(row.metrics?.impressions ?? 0),
            costMicros: costMicros,
            cost: fromMicros(costMicros),
            conversions: Number(row.metrics?.conversions ?? 0),
            ctr: Number(row.metrics?.ctr ?? 0),
            averageCpc: fromMicros(Number(row.metrics?.average_cpc ?? 0)),
          },
        };
      });

      console.log(`✅ Знайдено ${campaigns.length} кампаній`);
      return campaigns;
    } catch (error) {
      this.handleApiError('listAllCampaigns', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════
  //  CampaignService — Зміна статусу
  // ═══════════════════════════════════════════

  /**
   * Змінює статус кампанії (ENABLED / PAUSED).
   *
   * @param campaignId — ID кампанії (числовий рядок)
   * @param status — новий статус (CampaignStatusEnum.ENABLED | PAUSED)
   * @returns Результат операції IUpdateStatusResult
   * @throws Error якщо статус REMOVED (видалення через цей метод заборонено)
   */
  async updateStatus(
    campaignId: string,
    status: CampaignStatusEnum
  ): Promise<IUpdateStatusResult> {
    console.log(
      `🔄 Зміна статусу кампанії ${campaignId} → ${status}...`
    );

    // Захист від випадкового видалення
    if (status === CampaignStatusEnum.REMOVED) {
      throw new Error(
        '⛔ Видалення кампаній через updateStatus заборонено. ' +
        'Використовуйте Google Ads UI для видалення.'
      );
    }

    try {
      // Побудова resource name кампанії
      const campaignResourceName = ResourceNames.campaign(
        this.customerId,
        campaignId
      );

      // Маппінг нашого enum на enums бібліотеки
      const apiStatus =
        status === CampaignStatusEnum.ENABLED
          ? enums.CampaignStatus.ENABLED
          : enums.CampaignStatus.PAUSED;

      const operation: MutateOperation<resources.ICampaign> = {
        entity: 'campaign',
        operation: 'update',
        resource: {
          resource_name: campaignResourceName,
          status: apiStatus,
        },
      };

      const response = await this.customer.mutateResources([operation]);

      // mutate_operation_responses[0].campaign_result.resource_name
      const opResult = (response as any)?.mutate_operation_responses?.[0];
      const returnedResourceName =
        opResult?.campaign_result?.resource_name ?? campaignResourceName;

      const result: IUpdateStatusResult = {
        campaignId,
        newStatus: status,
        success: true,
        resourceName: returnedResourceName,
      };

      console.log(`✅ Статус кампанії ${campaignId} змінено на ${status}`);
      return result;
    } catch (error) {
      this.handleApiError('updateStatus', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════
  //  CampaignService — Зміна бюджету
  // ═══════════════════════════════════════════

  /**
   * Змінює денний бюджет кампанії.
   *
   * ⚠️ Спочатку виконує запит для отримання resource_name бюджету кампанії,
   * а потім оновлює його. Бюджет задається у звичайних одиницях валюти
   * (наприклад, 50.00 USD), а метод конвертує у мікро-одиниці автоматично.
   *
   * @param campaignId — ID кампанії
   * @param amount — нова сума денного бюджету у звичайних одиницях (e.g. 50.00)
   * @returns Результат операції IUpdateBudgetResult
   */
  async updateDailyBudget(
    campaignId: string,
    amount: number
  ): Promise<IUpdateBudgetResult> {
    console.log(
      `💰 Зміна бюджету кампанії ${campaignId} → ${amount}...`
    );

    if (amount < 0) {
      throw new Error(`⛔ Бюджет не може бути від'ємним.`);
    }

    try {
      // ── Крок 1: Отримуємо resource_name бюджету кампанії ──
      const budgetQuery = `
        SELECT
          campaign.id,
          campaign_budget.resource_name
        FROM campaign
        WHERE campaign.id = ${campaignId}
        LIMIT 1
      `;

      const budgetRows = await this.customer.query(budgetQuery);

      if (!budgetRows.length) {
        throw new Error(`Кампанію з ID ${campaignId} не знайдено.`);
      }

      const budgetResourceName = (budgetRows[0] as any).campaign_budget?.resource_name;

      if (!budgetResourceName) {
        throw new Error(
          `Бюджет для кампанії ${campaignId} не знайдено.`
        );
      }

      // ── Крок 2: Оновлюємо суму бюджету ──
      const operation: MutateOperation<resources.ICampaignBudget> = {
        entity: 'campaign_budget',
        operation: 'update',
        resource: {
          resource_name: budgetResourceName,
          amount_micros: toMicros(amount),
        },
      };

      const response = await this.customer.mutateResources([operation]);

      // mutate_operation_responses[0].campaign_budget_result.resource_name
      const opResult = (response as any)?.mutate_operation_responses?.[0];
      const returnedResourceName =
        opResult?.campaign_budget_result?.resource_name ?? budgetResourceName;

      const result: IUpdateBudgetResult = {
        campaignId,
        newDailyBudget: amount,
        success: true,
        resourceName: returnedResourceName,
      };

      console.log(
        `✅ Бюджет кампанії ${campaignId} змінено на ${amount}`
      );
      return result;
    } catch (error) {
      this.handleApiError('updateDailyBudget', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════
  //  ReportingService — Зведений звіт
  // ═══════════════════════════════════════════

  /**
   * Отримує зведений звіт по продуктивності акаунту за обраний період.
   *
   * Повертає деталізацію по кампаніях та датах, а також
   * підсумкові (агреговані) метрики по всьому акаунту.
   *
   * @param startDate — початок періоду (формат YYYY-MM-DD)
   * @param endDate — кінець періоду (формат YYYY-MM-DD)
   * @returns Зведений звіт IPerformanceReport
   */
  async getPerformanceReport(
    startDate: string,
    endDate: string
  ): Promise<IPerformanceReport> {
    console.log(
      `📊 Генерація звіту за період ${startDate} — ${endDate}...`
    );

    // Валідація формату дат
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      throw new Error(
        '⛔ Невірний формат дати. Використовуйте YYYY-MM-DD.'
      );
    }

    try {
      const query = `
        SELECT
          segments.date,
          campaign.id,
          campaign.name,
          metrics.clicks,
          metrics.impressions,
          metrics.cost_micros,
          metrics.conversions,
          metrics.cost_per_conversion,
          metrics.ctr
        FROM campaign
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
          AND campaign.status != 'REMOVED'
          AND metrics.impressions > 0
        ORDER BY segments.date DESC, campaign.name ASC
      `;

      const results = await this.customer.query(query);

      // ── Маппінг рядків ──
      const rows: IPerformanceReportRow[] = results.map((row: any) => {
        const costMicros = Number(row.metrics?.cost_micros ?? 0);
        const conversions = Number(row.metrics?.conversions ?? 0);
        const cost = fromMicros(costMicros);

        return {
          date: row.segments?.date ?? '',
          campaignId: row.campaign?.id ?? 0,
          campaignName: row.campaign?.name ?? 'Без назви',
          clicks: Number(row.metrics?.clicks ?? 0),
          impressions: Number(row.metrics?.impressions ?? 0),
          cost,
          conversions,
          costPerConversion: conversions > 0
            ? Number((cost / conversions).toFixed(2))
            : 0,
          ctr: Number(row.metrics?.ctr ?? 0),
        };
      });

      // ── Агрегація підсумків ──
      const totals = rows.reduce(
        (acc, row) => ({
          clicks: acc.clicks + row.clicks,
          impressions: acc.impressions + row.impressions,
          cost: Number((acc.cost + row.cost).toFixed(2)),
          conversions: acc.conversions + row.conversions,
        }),
        { clicks: 0, impressions: 0, cost: 0, conversions: 0 }
      );

      const report: IPerformanceReport = {
        dateRange: { startDate, endDate },
        rows,
        totals: {
          ...totals,
          averageCtr:
            totals.impressions > 0
              ? Number(((totals.clicks / totals.impressions) * 100).toFixed(2))
              : 0,
          averageCostPerConversion:
            totals.conversions > 0
              ? Number((totals.cost / totals.conversions).toFixed(2))
              : 0,
        },
      };

      console.log(
        `✅ Звіт згенеровано: ${rows.length} рядків, ` +
        `${totals.clicks} кліків, ${totals.cost} витрат`
      );

      return report;
    } catch (error) {
      this.handleApiError('getPerformanceReport', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════
  //  Допоміжні методи
  // ═══════════════════════════════════════════

  /**
   * Перевіряє з'єднання з API, виконуючи легкий запит.
   * Корисно для валідації креденшіалів при старті програми.
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Використовуємо campaign замість customer —
      // customer table потребує Manager-акаунту та викликає GRPC помилки
      const result = await this.customer.query(`
        SELECT campaign.id, campaign.name, campaign.status
        FROM campaign
        LIMIT 1
      `);

      const campaignCount = result.length;
      console.log(
        `🏥 Health check пройдено. ` +
        `Акаунт ID: ${this.customerId}. ` +
        `Знайдено мінімум ${campaignCount} кампаній.`
      );
      return true;
    } catch (error) {
      console.error('🏥 Health check не пройдено:', (error as Error).message);
      return false;
    }
  }

  /**
   * Повертає список доступних акаунтів для поточного refresh_token.
   * Корисно для MCC (Manager) акаунтів.
   */
  async listAccessibleCustomers(
    refreshToken: string
  ): Promise<string[]> {
    try {
      const response = await this.api.listAccessibleCustomers(refreshToken);
      const resourceNames = response.resource_names ?? [];
      console.log(`👥 Доступних акаунтів: ${resourceNames.length}`);
      return resourceNames;
    } catch (error) {
      this.handleApiError('listAccessibleCustomers', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────
  // Обробка помилок
  // ─────────────────────────────────────────────

  /**
   * Єдиний обробник помилок API.
   * Витягує деталі з GoogleAdsFailure і форматує зрозумілий лог.
   */
  private handleApiError(methodName: string, error: unknown): void {
    console.error(`\n❌ Помилка в ${methodName}:`);

    if (error && typeof error === 'object' && 'errors' in error) {
      // GoogleAdsFailure — структурована помилка від API
      const gadsError = error as { errors: Array<{ message: string; error_code: any }> };
      gadsError.errors.forEach((err, idx) => {
        console.error(`   [${idx + 1}] ${err.message}`);
        if (err.error_code) {
          console.error(`       Error code: ${JSON.stringify(err.error_code)}`);
        }
      });
    } else if (error instanceof Error) {
      console.error(`   ${error.message}`);
      if (error.stack) {
        console.error(`   Stack: ${error.stack.split('\n').slice(1, 3).join('\n   ')}`);
      }
    } else {
      console.error(`   Невідома помилка:`, error);
    }
  }

  /** Загальний enum-to-string маппер */
  private enumToString(enumObj: unknown, value: number | string): string {
    const map = enumObj as unknown as Record<string, string>;
    return map[String(value)] ?? String(value);
  }

  // ═══════════════════════════════════════════
  //  KeywordService — Ключові слова
  // ═══════════════════════════════════════════

  async getKeywords(campaignId?: string): Promise<IKeywordInfo[]> {
    console.log(`🔑 Завантаження ключових слів...`);
    try {
      const campaignFilter = campaignId ? `AND campaign.id = ${campaignId}` : '';
      const results = await this.customer.query(`
        SELECT
          ad_group_criterion.criterion_id,
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type,
          ad_group_criterion.status,
          ad_group_criterion.cpc_bid_micros,
          ad_group_criterion.quality_info.quality_score,
          ad_group.id, ad_group.name,
          campaign.id, campaign.name,
          metrics.clicks, metrics.impressions, metrics.cost_micros,
          metrics.conversions, metrics.ctr, metrics.average_cpc
        FROM keyword_view
        WHERE ad_group_criterion.status != 'REMOVED'
          AND ad_group_criterion.type = 'KEYWORD'
          ${campaignFilter}
        ORDER BY metrics.cost_micros DESC
      `);

      const keywords: IKeywordInfo[] = results.map((r: any) => ({
        criterionId: r.ad_group_criterion?.criterion_id ?? 0,
        adGroupId: r.ad_group?.id ?? 0,
        adGroupName: r.ad_group?.name ?? '',
        campaignId: r.campaign?.id ?? 0,
        campaignName: r.campaign?.name ?? '',
        text: r.ad_group_criterion?.keyword?.text ?? '',
        matchType: this.enumToString(enums.KeywordMatchType, r.ad_group_criterion?.keyword?.match_type ?? 0),
        status: this.enumToString(enums.AdGroupCriterionStatus, r.ad_group_criterion?.status ?? 0),
        cpcBid: fromMicros(Number(r.ad_group_criterion?.cpc_bid_micros ?? 0)),
        qualityScore: r.ad_group_criterion?.quality_info?.quality_score ?? null,
        metrics: {
          clicks: Number(r.metrics?.clicks ?? 0),
          impressions: Number(r.metrics?.impressions ?? 0),
          cost: fromMicros(Number(r.metrics?.cost_micros ?? 0)),
          conversions: Number(r.metrics?.conversions ?? 0),
          ctr: Number(r.metrics?.ctr ?? 0),
          averageCpc: fromMicros(Number(r.metrics?.average_cpc ?? 0)),
        },
      }));

      console.log(`✅ Знайдено ${keywords.length} ключових слів`);
      return keywords;
    } catch (error) {
      this.handleApiError('getKeywords', error);
      throw error;
    }
  }

  async addKeywords(adGroupId: string, keywords: INewKeyword[]): Promise<IAddKeywordsResult> {
    console.log(`➕ Додавання ${keywords.length} ключових слів до групи ${adGroupId}...`);
    try {
      const adGroupRN = ResourceNames.adGroup(this.customerId, adGroupId);
      const operations: MutateOperation<resources.IAdGroupCriterion>[] = keywords.map(kw => ({
        entity: 'ad_group_criterion',
        operation: 'create',
        resource: {
          ad_group: adGroupRN,
          keyword: {
            text: kw.text,
            match_type: (enums.KeywordMatchType as any)[kw.matchType],
          },
          status: enums.AdGroupCriterionStatus.ENABLED,
          ...(kw.cpcBidAmount !== undefined && { cpc_bid_micros: toMicros(kw.cpcBidAmount) }),
        },
      }));

      const response = await this.customer.mutateResources(operations);
      const ops = (response as any)?.mutate_operation_responses ?? [];
      const resourceNames = ops
        .map((op: any) => op?.ad_group_criterion_result?.resource_name ?? '')
        .filter(Boolean);

      console.log(`✅ Додано ${keywords.length} ключових слів`);
      return { adGroupId, added: keywords.length, resourceNames };
    } catch (error) {
      this.handleApiError('addKeywords', error);
      throw error;
    }
  }

  async removeKeyword(adGroupId: string, criterionId: string): Promise<{ success: boolean }> {
    console.log(`🗑️ Видалення ключового слова ${criterionId}...`);
    try {
      await this.customer.mutateResources([{
        entity: 'ad_group_criterion',
        operation: 'remove',
        resource: { resource_name: ResourceNames.adGroupCriterion(this.customerId, adGroupId, criterionId) },
      }]);
      console.log(`✅ Ключове слово ${criterionId} видалено`);
      return { success: true };
    } catch (error) {
      this.handleApiError('removeKeyword', error);
      throw error;
    }
  }

  async updateKeywordCpc(adGroupId: string, criterionId: string, cpcAmount: number): Promise<{ success: boolean; newCpc: number }> {
    console.log(`💲 Зміна CPC ключового слова ${criterionId} → ${cpcAmount}...`);
    try {
      await this.customer.mutateResources([{
        entity: 'ad_group_criterion',
        operation: 'update',
        resource: {
          resource_name: ResourceNames.adGroupCriterion(this.customerId, adGroupId, criterionId),
          cpc_bid_micros: toMicros(cpcAmount),
        },
      }]);
      console.log(`✅ CPC змінено на ${cpcAmount}`);
      return { success: true, newCpc: cpcAmount };
    } catch (error) {
      this.handleApiError('updateKeywordCpc', error);
      throw error;
    }
  }

  async getSearchTerms(campaignId?: string, limit = 100): Promise<ISearchTermInfo[]> {
    console.log(`🔍 Завантаження пошукових запитів...`);
    try {
      const campaignFilter = campaignId ? `AND campaign.id = ${campaignId}` : '';
      const results = await this.customer.query(`
        SELECT
          search_term_view.search_term,
          search_term_view.status,
          campaign.id, campaign.name,
          ad_group.id, ad_group.name,
          metrics.clicks, metrics.impressions,
          metrics.cost_micros, metrics.conversions, metrics.ctr
        FROM search_term_view
        WHERE metrics.impressions > 0
          ${campaignFilter}
        ORDER BY metrics.cost_micros DESC
        LIMIT ${limit}
      `);

      const terms: ISearchTermInfo[] = results.map((r: any) => ({
        searchTerm: r.search_term_view?.search_term ?? '',
        status: this.enumToString(enums.SearchTermTargetingStatus, r.search_term_view?.status ?? 0),
        campaignId: r.campaign?.id ?? 0,
        campaignName: r.campaign?.name ?? '',
        adGroupId: r.ad_group?.id ?? 0,
        adGroupName: r.ad_group?.name ?? '',
        metrics: {
          clicks: Number(r.metrics?.clicks ?? 0),
          impressions: Number(r.metrics?.impressions ?? 0),
          cost: fromMicros(Number(r.metrics?.cost_micros ?? 0)),
          conversions: Number(r.metrics?.conversions ?? 0),
          ctr: Number(r.metrics?.ctr ?? 0),
        },
      }));

      console.log(`✅ Знайдено ${terms.length} пошукових запитів`);
      return terms;
    } catch (error) {
      this.handleApiError('getSearchTerms', error);
      throw error;
    }
  }

  async addNegativeKeywords(
    level: NegativeKeywordLevel,
    resourceId: string,
    keywords: INegativeKeyword[]
  ): Promise<IAddNegativeKeywordsResult> {
    console.log(`🚫 Додавання ${keywords.length} мінус-фраз (${level})...`);
    try {
      let operations: MutateOperation<any>[];

      if (level === 'campaign') {
        const campaignRN = ResourceNames.campaign(this.customerId, resourceId);
        operations = keywords.map(kw => ({
          entity: 'campaign_criterion',
          operation: 'create',
          resource: {
            campaign: campaignRN,
            negative: true,
            keyword: {
              text: kw.text,
              match_type: (enums.KeywordMatchType as any)[kw.matchType],
            },
          },
        }));
      } else {
        const adGroupRN = ResourceNames.adGroup(this.customerId, resourceId);
        operations = keywords.map(kw => ({
          entity: 'ad_group_criterion',
          operation: 'create',
          resource: {
            ad_group: adGroupRN,
            negative: true,
            keyword: {
              text: kw.text,
              match_type: (enums.KeywordMatchType as any)[kw.matchType],
            },
          },
        }));
      }

      const response = await this.customer.mutateResources(operations);
      const ops = (response as any)?.mutate_operation_responses ?? [];
      const resourceNames = ops
        .map((op: any) => op?.campaign_criterion_result?.resource_name ?? op?.ad_group_criterion_result?.resource_name ?? '')
        .filter(Boolean);

      console.log(`✅ Додано ${keywords.length} мінус-фраз`);
      return { level, resourceId, added: keywords.length, resourceNames };
    } catch (error) {
      this.handleApiError('addNegativeKeywords', error);
      throw error;
    }
  }

  async getNegativeKeywords(campaignId?: string): Promise<INegativeKeywordInfo[]> {
    console.log(`🚫 Завантаження мінус-фраз...`);
    try {
      const campaignFilter = campaignId ? `AND campaign.id = ${campaignId}` : '';
      const results = await this.customer.query(`
        SELECT
          campaign_criterion.criterion_id,
          campaign_criterion.keyword.text,
          campaign_criterion.keyword.match_type,
          campaign.id, campaign.name
        FROM campaign_criterion
        WHERE campaign_criterion.negative = true
          AND campaign_criterion.type = 'KEYWORD'
          ${campaignFilter}
      `);

      const negatives: INegativeKeywordInfo[] = results.map((r: any) => ({
        criterionId: r.campaign_criterion?.criterion_id ?? 0,
        text: r.campaign_criterion?.keyword?.text ?? '',
        matchType: this.enumToString(enums.KeywordMatchType, r.campaign_criterion?.keyword?.match_type ?? 0),
        level: 'campaign' as NegativeKeywordLevel,
        campaignId: r.campaign?.id ?? 0,
        campaignName: r.campaign?.name ?? '',
      }));

      console.log(`✅ Знайдено ${negatives.length} мінус-фраз`);
      return negatives;
    } catch (error) {
      this.handleApiError('getNegativeKeywords', error);
      throw error;
    }
  }

  async generateKeywordIdeas(params: IGenerateKeywordIdeasParams): Promise<IKeywordIdea[]> {
    console.log(`💡 Генерація ідей ключових слів для: ${params.keywords.join(', ')}...`);
    try {
      const languageConstant = ResourceNames.languageConstant(params.languageId || 1033);
      const geoTargetConstant = params.geoTargetId ? ResourceNames.geoTargetConstant(params.geoTargetId) : undefined;

      const request: any = {
        customer_id: this.customerId,
        language: languageConstant,
        keyword_plan_network: enums.KeywordPlanNetwork.GOOGLE_SEARCH,
        keyword_seed: {
          keywords: params.keywords,
        },
      };

      if (geoTargetConstant) {
        request.geo_target_constants = [geoTargetConstant];
      }

      // Використовуємо кастомний сервіс (потребує Basic/Standard Access)
      const [response] = await (this.customer as any).keywordPlanIdeas.generateKeywordIdeas(request);

      const results: IKeywordIdea[] = (response?.results || []).map((idea: any) => {
        return {
          text: idea.text || '',
          avgMonthlySearches: Number(idea.keyword_idea_metrics?.avg_monthly_searches || 0),
          competition: this.enumToString(enums.KeywordPlanCompetitionLevel, idea.keyword_idea_metrics?.competition || 0),
          lowTopOfPageBidMicros: Number(idea.keyword_idea_metrics?.low_top_of_page_bid_micros || 0),
          highTopOfPageBidMicros: Number(idea.keyword_idea_metrics?.high_top_of_page_bid_micros || 0),
        };
      });

      console.log(`✅ Знайдено ${results.length} ідей ключових слів.`);
      return results;
    } catch (error: any) {
      const safeMessage = error instanceof Error ? error.message : '';
      const serializedError = (() => {
        try {
          return JSON.stringify(error);
        } catch {
          return '';
        }
      })();
      const errorText = `${safeMessage} ${serializedError}`.toLowerCase();

      // Keyword Planner API недоступний на Explorer Access / неапрувнутому токені.
      // Повертаємо ЧЕСНУ помилку з кроками, без fake/fallback даних.
      if (
        errorText.includes('explorer access')
        || errorText.includes('developer_token_not_approved')
        || errorText.includes('not allowed for use with explorer access')
      ) {
        throw new Error(
          `Keyword Planner API недоступний для поточного Developer Token (Explorer/Test access). Метод generate_keyword_ideas вимагає Basic або Standard access.

Що зробити:
1) У Google Ads API Center подайте заявку на Basic/Standard access.
2) У заявці/permissions увімкніть "Keyword research and suggestions" (KeywordPlanIdeaService).
3) Після approve зачекайте поширення змін (зазвичай до 24 год), перезапустіть MCP сервер і повторіть запит.`
        );
      }

      this.handleApiError('generateKeywordIdeas', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════
  //  AdGroupService — Групи оголошень
  // ═══════════════════════════════════════════

  async getAdGroups(campaignId?: string): Promise<IAdGroupInfo[]> {
    console.log(`📁 Завантаження груп оголошень...`);
    try {
      const filter = campaignId ? `AND campaign.id = ${campaignId}` : '';
      const results = await this.customer.query(`
        SELECT
          ad_group.id, ad_group.name, ad_group.status,
          ad_group.type, ad_group.cpc_bid_micros,
          campaign.id, campaign.name,
          metrics.clicks, metrics.impressions,
          metrics.cost_micros, metrics.conversions
        FROM ad_group
        WHERE ad_group.status != 'REMOVED'
          ${filter}
        ORDER BY metrics.cost_micros DESC
      `);

      const groups: IAdGroupInfo[] = results.map((r: any) => ({
        id: r.ad_group?.id ?? 0,
        name: r.ad_group?.name ?? '',
        status: this.enumToString(enums.AdGroupStatus, r.ad_group?.status ?? 0),
        type: this.enumToString(enums.AdGroupType, r.ad_group?.type ?? 0),
        campaignId: r.campaign?.id ?? 0,
        campaignName: r.campaign?.name ?? '',
        cpcBid: fromMicros(Number(r.ad_group?.cpc_bid_micros ?? 0)),
        metrics: {
          clicks: Number(r.metrics?.clicks ?? 0),
          impressions: Number(r.metrics?.impressions ?? 0),
          cost: fromMicros(Number(r.metrics?.cost_micros ?? 0)),
          conversions: Number(r.metrics?.conversions ?? 0),
        },
      }));

      console.log(`✅ Знайдено ${groups.length} груп оголошень`);
      return groups;
    } catch (error) {
      this.handleApiError('getAdGroups', error);
      throw error;
    }
  }

  async createAdGroup(campaignId: string, name: string, cpcBidAmount: number): Promise<ICreateAdGroupResult> {
    console.log(`➕ Створення групи "${name}"...`);
    try {
      const response = await this.customer.mutateResources([{
        entity: 'ad_group',
        operation: 'create',
        resource: {
          name,
          campaign: ResourceNames.campaign(this.customerId, campaignId),
          status: enums.AdGroupStatus.ENABLED,
          type: enums.AdGroupType.SEARCH_STANDARD,
          cpc_bid_micros: toMicros(cpcBidAmount),
        },
      }]);

      const opResult = (response as any)?.mutate_operation_responses?.[0];
      const resourceName = opResult?.ad_group_result?.resource_name ?? '';
      const adGroupId = resourceName.split('/').pop() ?? '';

      console.log(`✅ Групу "${name}" створено (ID: ${adGroupId})`);
      return { adGroupId, resourceName };
    } catch (error) {
      this.handleApiError('createAdGroup', error);
      throw error;
    }
  }

  async updateAdGroup(adGroupId: string, params: IUpdateAdGroupParams): Promise<{ success: boolean }> {
    console.log(`✏️ Оновлення групи ${adGroupId}...`);
    try {
      const resource: resources.IAdGroup = {
        resource_name: ResourceNames.adGroup(this.customerId, adGroupId),
      };
      if (params.name !== undefined) resource.name = params.name;
      if (params.cpcBidAmount !== undefined) resource.cpc_bid_micros = toMicros(params.cpcBidAmount);
      if (params.status !== undefined) resource.status = (enums.AdGroupStatus as any)[params.status];

      await this.customer.mutateResources([{ entity: 'ad_group', operation: 'update', resource }]);
      console.log(`✅ Групу ${adGroupId} оновлено`);
      return { success: true };
    } catch (error) {
      this.handleApiError('updateAdGroup', error);
      throw error;
    }
  }

  async removeAdGroup(adGroupId: string): Promise<{ success: boolean }> {
    console.log(`🗑️ Видалення групи ${adGroupId}...`);
    try {
      await this.customer.mutateResources([{
        entity: 'ad_group',
        operation: 'remove',
        resource: { resource_name: ResourceNames.adGroup(this.customerId, adGroupId) },
      }]);
      console.log(`✅ Групу ${adGroupId} видалено`);
      return { success: true };
    } catch (error) {
      this.handleApiError('removeAdGroup', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════
  //  AdService — Оголошення
  // ═══════════════════════════════════════════

  async getAds(adGroupId?: string): Promise<IAdInfo[]> {
    console.log(`📢 Завантаження оголошень...`);
    try {
      const filter = adGroupId ? `AND ad_group.id = ${adGroupId}` : '';
      const results = await this.customer.query(`
        SELECT
          ad_group_ad.ad.id,
          ad_group_ad.ad.type,
          ad_group_ad.status,
          ad_group_ad.ad.responsive_search_ad.headlines,
          ad_group_ad.ad.responsive_search_ad.descriptions,
          ad_group_ad.ad.final_urls,
          ad_group.id, ad_group.name,
          campaign.name,
          metrics.clicks, metrics.impressions,
          metrics.cost_micros, metrics.conversions
        FROM ad_group_ad
        WHERE ad_group_ad.status != 'REMOVED'
          ${filter}
        ORDER BY metrics.cost_micros DESC
      `);

      const ads: IAdInfo[] = results.map((r: any) => {
        const rsa = r.ad_group_ad?.ad?.responsive_search_ad;
        return {
          adId: r.ad_group_ad?.ad?.id ?? 0,
          adGroupId: r.ad_group?.id ?? 0,
          adGroupName: r.ad_group?.name ?? '',
          campaignName: r.campaign?.name ?? '',
          status: this.enumToString(enums.AdGroupAdStatus, r.ad_group_ad?.status ?? 0),
          type: this.enumToString(enums.AdType, r.ad_group_ad?.ad?.type ?? 0),
          headlines: (rsa?.headlines ?? []).map((h: any) => h.text ?? ''),
          descriptions: (rsa?.descriptions ?? []).map((d: any) => d.text ?? ''),
          finalUrls: r.ad_group_ad?.ad?.final_urls ?? [],
          metrics: {
            clicks: Number(r.metrics?.clicks ?? 0),
            impressions: Number(r.metrics?.impressions ?? 0),
            cost: fromMicros(Number(r.metrics?.cost_micros ?? 0)),
            conversions: Number(r.metrics?.conversions ?? 0),
          },
        };
      });

      console.log(`✅ Знайдено ${ads.length} оголошень`);
      return ads;
    } catch (error) {
      this.handleApiError('getAds', error);
      throw error;
    }
  }

  async createResponsiveSearchAd(
    adGroupId: string,
    headlines: string[],
    descriptions: string[],
    finalUrl: string
  ): Promise<ICreateAdResult> {
    if (headlines.length < 3) throw new Error('RSA потребує мінімум 3 заголовки');
    if (descriptions.length < 2) throw new Error('RSA потребує мінімум 2 описи');

    console.log(`📢 Створення RSA в групі ${adGroupId}...`);
    try {
      const response = await this.customer.mutateResources([{
        entity: 'ad_group_ad',
        operation: 'create',
        resource: {
          ad_group: ResourceNames.adGroup(this.customerId, adGroupId),
          status: enums.AdGroupAdStatus.ENABLED,
          ad: {
            responsive_search_ad: {
              headlines: headlines.map(text => ({ text })),
              descriptions: descriptions.map(text => ({ text })),
            },
            final_urls: [finalUrl],
          },
        },
      }]);

      const opResult = (response as any)?.mutate_operation_responses?.[0];
      const resourceName = opResult?.ad_group_ad_result?.resource_name ?? '';
      const adId = resourceName.split('~').pop() ?? '';

      console.log(`✅ RSA-оголошення створено (ID: ${adId})`);
      return { adId, resourceName };
    } catch (error) {
      this.handleApiError('createResponsiveSearchAd', error);
      throw error;
    }
  }

  async updateAdStatus(adGroupId: string, adId: string, status: AdStatusEnum): Promise<{ success: boolean }> {
    console.log(`🔄 Зміна статусу оголошення ${adId} → ${status}...`);
    try {
      await this.customer.mutateResources([{
        entity: 'ad_group_ad',
        operation: 'update',
        resource: {
          resource_name: ResourceNames.adGroupAd(this.customerId, adGroupId, adId),
          status: (enums.AdGroupAdStatus as any)[status],
        },
      }]);
      console.log(`✅ Статус оголошення ${adId} змінено на ${status}`);
      return { success: true };
    } catch (error) {
      this.handleApiError('updateAdStatus', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════
  //  AccountService — Інформація про акаунт
  // ═══════════════════════════════════════════

  async getAccountInfo(): Promise<IAccountInfo> {
    console.log('ℹ️ Отримання інформації про акаунт...');
    try {
      const results = await this.customer.query(`
        SELECT
          customer.id,
          customer.descriptive_name,
          customer.currency_code,
          customer.time_zone,
          customer.auto_tagging_enabled,
          customer.tracking_url_template
        FROM customer
        LIMIT 1
      `);

      if (!results.length) {
        throw new Error('Не вдалося отримати інформацію про акаунт.');
      }

      const row: any = results[0];
      const info: IAccountInfo = {
        customerId: String(row.customer?.id ?? this.customerId),
        descriptiveName: row.customer?.descriptive_name ?? 'Без назви',
        currencyCode: row.customer?.currency_code ?? 'UAH',
        timeZone: row.customer?.time_zone ?? 'Europe/Kyiv',
        autoTaggingEnabled: row.customer?.auto_tagging_enabled ?? false,
        trackingUrlTemplate: row.customer?.tracking_url_template ?? undefined,
      };

      console.log(`✅ Акаунт: "${info.descriptiveName}" (${info.customerId}), валюта: ${info.currencyCode}`);
      return info;
    } catch (error) {
      this.handleApiError('getAccountInfo', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════
  //  CampaignService — Створення кампанії
  // ═══════════════════════════════════════════

  async createSearchCampaign(params: ICreateCampaignParams): Promise<ICreateCampaignResult> {
    console.log(`➕ Створення кампанії "${params.name}"...`);
    try {
      // Крок 1: Створюємо бюджет
      const budgetResponse = await this.customer.mutateResources([{
        entity: 'campaign_budget',
        operation: 'create',
        resource: {
          name: `Budget for ${params.name}`,
          amount_micros: toMicros(params.dailyBudget),
          delivery_method: enums.BudgetDeliveryMethod.STANDARD,
        },
      }]);

      const budgetOp = (budgetResponse as any)?.mutate_operation_responses?.[0];
      const budgetResourceName = budgetOp?.campaign_budget_result?.resource_name ?? '';

      if (!budgetResourceName) {
        throw new Error('Не вдалося створити бюджет кампанії.');
      }

      // Крок 2: Маппінг стратегії ставок
      const campaignResource: any = {
        name: params.name,
        advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
        status: enums.CampaignStatus.PAUSED, // Завжди створюємо PAUSED для безпеки
        campaign_budget: budgetResourceName,
        network_settings: {
          target_google_search: params.networkSettings?.targetGoogleSearch ?? true,
          target_search_network: params.networkSettings?.targetSearchNetwork ?? false,
          target_content_network: params.networkSettings?.targetContentNetwork ?? false,
        },
      };

      // Додаємо стратегію ставок
      switch (params.biddingStrategy) {
        case 'MANUAL_CPC':
          campaignResource.manual_cpc = { enhanced_cpc_enabled: true };
          break;
        case 'MAXIMIZE_CLICKS':
          campaignResource.maximize_clicks = {};
          break;
        case 'MAXIMIZE_CONVERSIONS':
          campaignResource.maximize_conversions = {};
          break;
        case 'TARGET_CPA':
          if (!params.targetCpa) throw new Error('TARGET_CPA потребує вказати targetCpa.');
          campaignResource.target_cpa = { target_cpa_micros: toMicros(params.targetCpa) };
          break;
      }

      // Додаємо дати якщо вказано
      if (params.startDate) campaignResource.start_date = params.startDate.replace(/-/g, '');
      if (params.endDate) campaignResource.end_date = params.endDate.replace(/-/g, '');

      // Крок 3: Створюємо кампанію
      const campaignResponse = await this.customer.mutateResources([{
        entity: 'campaign',
        operation: 'create',
        resource: campaignResource,
      }]);

      const campaignOp = (campaignResponse as any)?.mutate_operation_responses?.[0];
      const campaignResourceName = campaignOp?.campaign_result?.resource_name ?? '';
      const campaignId = campaignResourceName.split('/').pop() ?? '';

      console.log(`✅ Кампанію "${params.name}" створено (ID: ${campaignId}). Статус: PAUSED.`);
      return {
        campaignId,
        budgetResourceName,
        campaignResourceName,
      };
    } catch (error) {
      this.handleApiError('createSearchCampaign', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════
  //  CampaignService — Видалення кампанії
  // ═══════════════════════════════════════════

  async removeCampaign(campaignId: string): Promise<{ success: boolean }> {
    console.log(`🗑️ Видалення кампанії ${campaignId}...`);
    try {
      await this.customer.mutateResources([{
        entity: 'campaign',
        operation: 'update',
        resource: {
          resource_name: ResourceNames.campaign(this.customerId, campaignId),
          status: enums.CampaignStatus.REMOVED,
        },
      }]);
      console.log(`✅ Кампанію ${campaignId} видалено (REMOVED)`);
      return { success: true };
    } catch (error) {
      this.handleApiError('removeCampaign', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════
  //  Видалення мінус-слова
  // ═══════════════════════════════════════════

  async removeNegativeKeyword(
    level: NegativeKeywordLevel,
    resourceId: string,
    criterionId: string
  ): Promise<{ success: boolean }> {
    console.log(`🗑️ Видалення мінус-слова ${criterionId}...`);
    try {
      if (level === 'campaign') {
        await this.customer.mutateResources([{
          entity: 'campaign_criterion',
          operation: 'remove',
          resource: {
            resource_name: `customers/${this.customerId}/campaignCriteria/${resourceId}~${criterionId}`,
          },
        }]);
      } else {
        await this.customer.mutateResources([{
          entity: 'ad_group_criterion',
          operation: 'remove',
          resource: {
            resource_name: ResourceNames.adGroupCriterion(this.customerId, resourceId, criterionId),
          },
        }]);
      }
      console.log(`✅ Мінус-слово ${criterionId} видалено`);
      return { success: true };
    } catch (error) {
      this.handleApiError('removeNegativeKeyword', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════
  //  ReportingService — Географічний звіт
  // ═══════════════════════════════════════════

  async getGeographicReport(
    startDate: string,
    endDate: string,
    campaignId?: string
  ): Promise<IGeographicReportRow[]> {
    console.log(`🌍 Географічний звіт за ${startDate} — ${endDate}...`);
    try {
      const campaignFilter = campaignId ? `AND campaign.id = ${campaignId}` : '';
      const results = await this.customer.query(`
        SELECT
          campaign.id,
          campaign.name,
          geographic_view.country_criterion_id,
          geographic_view.location_type,
          metrics.clicks,
          metrics.impressions,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr
        FROM geographic_view
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
          AND metrics.impressions > 0
          ${campaignFilter}
        ORDER BY metrics.cost_micros DESC
        LIMIT 200
      `);

      const rows: IGeographicReportRow[] = results.map((r: any) => ({
        campaignId: r.campaign?.id ?? 0,
        campaignName: r.campaign?.name ?? '',
        countryName: String(r.geographic_view?.country_criterion_id ?? 'Невідомо'),
        regionName: r.geographic_view?.location_type ?? '',
        metrics: {
          clicks: Number(r.metrics?.clicks ?? 0),
          impressions: Number(r.metrics?.impressions ?? 0),
          cost: fromMicros(Number(r.metrics?.cost_micros ?? 0)),
          conversions: Number(r.metrics?.conversions ?? 0),
          ctr: Number(r.metrics?.ctr ?? 0),
        },
      }));

      console.log(`✅ Географічний звіт: ${rows.length} рядків`);
      return rows;
    } catch (error) {
      this.handleApiError('getGeographicReport', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════
  //  ReportingService — Звіт по девайсах
  // ═══════════════════════════════════════════

  async getDeviceReport(
    startDate: string,
    endDate: string,
    campaignId?: string
  ): Promise<IDeviceReportRow[]> {
    console.log(`📱 Звіт по девайсах за ${startDate} — ${endDate}...`);
    try {
      const campaignFilter = campaignId ? `AND campaign.id = ${campaignId}` : '';
      const results = await this.customer.query(`
        SELECT
          campaign.id,
          campaign.name,
          segments.device,
          metrics.clicks,
          metrics.impressions,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr,
          metrics.average_cpc
        FROM campaign
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
          AND campaign.status != 'REMOVED'
          AND metrics.impressions > 0
          ${campaignFilter}
        ORDER BY metrics.cost_micros DESC
      `);

      const rows: IDeviceReportRow[] = results.map((r: any) => ({
        campaignId: r.campaign?.id ?? 0,
        campaignName: r.campaign?.name ?? '',
        device: this.enumToString(enums.Device, r.segments?.device ?? 0),
        metrics: {
          clicks: Number(r.metrics?.clicks ?? 0),
          impressions: Number(r.metrics?.impressions ?? 0),
          cost: fromMicros(Number(r.metrics?.cost_micros ?? 0)),
          conversions: Number(r.metrics?.conversions ?? 0),
          ctr: Number(r.metrics?.ctr ?? 0),
          averageCpc: fromMicros(Number(r.metrics?.average_cpc ?? 0)),
        },
      }));

      console.log(`✅ Звіт по девайсах: ${rows.length} рядків`);
      return rows;
    } catch (error) {
      this.handleApiError('getDeviceReport', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════
  //  ReportingService — Звіт по годинах дня
  // ═══════════════════════════════════════════

  async getHourOfDayReport(
    startDate: string,
    endDate: string,
    campaignId?: string
  ): Promise<IHourOfDayReportRow[]> {
    console.log(`🕐 Звіт по годинах дня за ${startDate} — ${endDate}...`);
    try {
      const campaignFilter = campaignId ? `AND campaign.id = ${campaignId}` : '';
      const results = await this.customer.query(`
        SELECT
          segments.hour,
          campaign.id,
          campaign.name,
          metrics.clicks,
          metrics.impressions,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr
        FROM campaign
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
          AND campaign.status != 'REMOVED'
          AND metrics.impressions > 0
          ${campaignFilter}
        ORDER BY segments.hour ASC
      `);

      const rows: IHourOfDayReportRow[] = results.map((r: any) => ({
        hour: Number(r.segments?.hour ?? 0),
        campaignId: r.campaign?.id ?? 0,
        campaignName: r.campaign?.name ?? '',
        metrics: {
          clicks: Number(r.metrics?.clicks ?? 0),
          impressions: Number(r.metrics?.impressions ?? 0),
          cost: fromMicros(Number(r.metrics?.cost_micros ?? 0)),
          conversions: Number(r.metrics?.conversions ?? 0),
          ctr: Number(r.metrics?.ctr ?? 0),
        },
      }));

      console.log(`✅ Звіт по годинах: ${rows.length} рядків`);
      return rows;
    } catch (error) {
      this.handleApiError('getHourOfDayReport', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════
  //  ReportingService — Демографічний звіт
  // ═══════════════════════════════════════════

  async getAgeGenderReport(
    startDate: string,
    endDate: string,
    campaignId?: string
  ): Promise<IAgeGenderReportRow[]> {
    console.log(`👥 Демографічний звіт за ${startDate} — ${endDate}...`);
    try {
      const campaignFilter = campaignId ? `AND campaign.id = ${campaignId}` : '';
      const results = await this.customer.query(`
        SELECT
          campaign.id,
          campaign.name,
          ad_group_criterion.age_range.type,
          ad_group_criterion.gender.type,
          metrics.clicks,
          metrics.impressions,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr
        FROM gender_view
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
          AND metrics.impressions > 0
          ${campaignFilter}
        ORDER BY metrics.cost_micros DESC
      `);

      const rows: IAgeGenderReportRow[] = results.map((r: any) => ({
        campaignId: r.campaign?.id ?? 0,
        campaignName: r.campaign?.name ?? '',
        ageRange: String(r.ad_group_criterion?.age_range?.type ?? 'UNKNOWN'),
        gender: String(r.ad_group_criterion?.gender?.type ?? 'UNKNOWN'),
        metrics: {
          clicks: Number(r.metrics?.clicks ?? 0),
          impressions: Number(r.metrics?.impressions ?? 0),
          cost: fromMicros(Number(r.metrics?.cost_micros ?? 0)),
          conversions: Number(r.metrics?.conversions ?? 0),
          ctr: Number(r.metrics?.ctr ?? 0),
        },
      }));

      console.log(`✅ Демографічний звіт: ${rows.length} рядків`);
      return rows;
    } catch (error) {
      this.handleApiError('getAgeGenderReport', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════
  //  CampaignService — Структура кампанії
  // ═══════════════════════════════════════════

  async getCampaignStructure(campaignId: string): Promise<ICampaignStructure> {
    console.log(`🏗️ Структура кампанії ${campaignId}...`);
    try {
      // Отримуємо інфо про кампанію
      const campaignRows = await this.customer.query(`
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign_budget.amount_micros
        FROM campaign
        WHERE campaign.id = ${campaignId}
        LIMIT 1
      `);

      if (!campaignRows.length) {
        throw new Error(`Кампанію ${campaignId} не знайдено.`);
      }

      const cr: any = campaignRows[0];

      // Отримуємо групи оголошень з кількістю keywords та ads
      const adGroupRows = await this.customer.query(`
        SELECT
          ad_group.id,
          ad_group.name,
          ad_group.status,
          ad_group.cpc_bid_micros
        FROM ad_group
        WHERE campaign.id = ${campaignId}
          AND ad_group.status != 'REMOVED'
        ORDER BY ad_group.name ASC
      `);

      // Для кожної групи рахуємо keywords та ads
      const adGroups = await Promise.all(
        adGroupRows.map(async (agr: any) => {
          const agId = agr.ad_group?.id;

          const [kwRows, adRows] = await Promise.all([
            this.customer.query(`
              SELECT ad_group_criterion.criterion_id
              FROM keyword_view
              WHERE ad_group.id = ${agId}
                AND ad_group_criterion.status != 'REMOVED'
            `).catch(() => []),
            this.customer.query(`
              SELECT ad_group_ad.ad.id
              FROM ad_group_ad
              WHERE ad_group.id = ${agId}
                AND ad_group_ad.status != 'REMOVED'
            `).catch(() => []),
          ]);

          return {
            id: agId ?? 0,
            name: agr.ad_group?.name ?? '',
            status: this.enumToString(enums.AdGroupStatus, agr.ad_group?.status ?? 0),
            cpcBid: fromMicros(Number(agr.ad_group?.cpc_bid_micros ?? 0)),
            keywordsCount: kwRows.length,
            adsCount: adRows.length,
          };
        })
      );

      const structure: ICampaignStructure = {
        campaignId: cr.campaign?.id ?? campaignId,
        campaignName: cr.campaign?.name ?? '',
        status: campaignStatusToString(cr.campaign?.status ?? 0),
        budget: fromMicros(Number(cr.campaign_budget?.amount_micros ?? 0)),
        adGroups,
      };

      console.log(`✅ Структура: ${adGroups.length} груп оголошень`);
      return structure;
    } catch (error) {
      this.handleApiError('getCampaignStructure', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════
  //  ReportingService — Утилізація бюджету
  // ═══════════════════════════════════════════

  async getBudgetUtilization(): Promise<IBudgetUtilization[]> {
    console.log('💸 Аналіз утилізації бюджетів...');
    try {
      const results = await this.customer.query(`
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign_budget.amount_micros,
          metrics.cost_micros
        FROM campaign
        WHERE campaign.status != 'REMOVED'
          AND segments.date DURING LAST_7_DAYS
        ORDER BY metrics.cost_micros DESC
      `);

      // Агрегуємо по кампаніях
      const campaignMap = new Map<string, {
        id: any;
        name: string;
        status: string;
        budget: number;
        totalCost: number;
        days: number;
      }>();

      results.forEach((r: any) => {
        const id = String(r.campaign?.id ?? 0);
        const existing = campaignMap.get(id);
        const cost = fromMicros(Number(r.metrics?.cost_micros ?? 0));

        if (existing) {
          existing.totalCost += cost;
          existing.days += 1;
        } else {
          campaignMap.set(id, {
            id: r.campaign?.id ?? 0,
            name: r.campaign?.name ?? '',
            status: campaignStatusToString(r.campaign?.status ?? 0),
            budget: fromMicros(Number(r.campaign_budget?.amount_micros ?? 0)),
            totalCost: cost,
            days: 1,
          });
        }
      });

      const utilization: IBudgetUtilization[] = Array.from(campaignMap.values()).map(c => {
        const avgDailySpend = c.days > 0 ? Number((c.totalCost / c.days).toFixed(2)) : 0;
        const utilizationPercent = c.budget > 0
          ? Number(((avgDailySpend / c.budget) * 100).toFixed(1))
          : 0;

        return {
          campaignId: c.id,
          campaignName: c.name,
          status: c.status,
          dailyBudget: c.budget,
          avgDailySpend,
          utilizationPercent,
          isLimited: utilizationPercent >= 90,
        };
      });

      console.log(`✅ Бюджетний аналіз: ${utilization.length} кампаній`);
      return utilization;
    } catch (error) {
      this.handleApiError('getBudgetUtilization', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════
  //  ConversionService — Конверсійні дії
  // ═══════════════════════════════════════════

  async getConversionActions(): Promise<IConversionAction[]> {
    console.log('🎯 Отримання конверсійних дій...');
    try {
      const results = await this.customer.query(`
        SELECT
          conversion_action.id,
          conversion_action.name,
          conversion_action.category,
          conversion_action.type,
          conversion_action.status,
          conversion_action.counting_type
        FROM conversion_action
        ORDER BY conversion_action.name ASC
      `);

      const actions: IConversionAction[] = results.map((r: any) => ({
        id: r.conversion_action?.id ?? 0,
        name: r.conversion_action?.name ?? '',
        category: String(r.conversion_action?.category ?? 'UNKNOWN'),
        type: String(r.conversion_action?.type ?? 'UNKNOWN'),
        status: String(r.conversion_action?.status ?? 'UNKNOWN'),
        countingType: String(r.conversion_action?.counting_type ?? 'UNKNOWN'),
      }));

      console.log(`✅ Знайдено ${actions.length} конверсійних дій`);
      return actions;
    } catch (error) {
      this.handleApiError('getConversionActions', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════
  //  Custom GAQL Query
  // ═══════════════════════════════════════════

  async runGaqlQuery(query: string): Promise<any[]> {
    console.log('🔧 Виконання GAQL-запиту...');
    try {
      const results = await this.customer.query(query);
      console.log(`✅ GAQL-запит повернув ${results.length} рядків`);
      return results;
    } catch (error) {
      this.handleApiError('runGaqlQuery', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════
  //  Quality Score звіт
  // ═══════════════════════════════════════════

  async getQualityScoreReport(campaignId?: string): Promise<any[]> {
    console.log('⭐ Аналіз Quality Score...');
    try {
      const filter = campaignId ? `AND campaign.id = ${campaignId}` : '';
      const results = await this.customer.query(`
        SELECT
          ad_group_criterion.criterion_id,
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type,
          ad_group_criterion.quality_info.quality_score,
          ad_group_criterion.quality_info.creative_quality_score,
          ad_group_criterion.quality_info.post_click_quality_score,
          ad_group_criterion.quality_info.search_predicted_ctr,
          ad_group.id,
          ad_group.name,
          campaign.id,
          campaign.name,
          metrics.clicks,
          metrics.impressions,
          metrics.cost_micros,
          metrics.conversions
        FROM keyword_view
        WHERE ad_group_criterion.status = 'ENABLED'
          AND ad_group_criterion.type = 'KEYWORD'
          ${filter}
        ORDER BY ad_group_criterion.quality_info.quality_score ASC
      `);

      const rows = results.map((r: any) => ({
        criterionId: r.ad_group_criterion?.criterion_id ?? 0,
        keyword: r.ad_group_criterion?.keyword?.text ?? '',
        matchType: this.enumToString(enums.KeywordMatchType, r.ad_group_criterion?.keyword?.match_type ?? 0),
        qualityScore: r.ad_group_criterion?.quality_info?.quality_score ?? null,
        creativeQuality: String(r.ad_group_criterion?.quality_info?.creative_quality_score ?? 'UNKNOWN'),
        landingPageQuality: String(r.ad_group_criterion?.quality_info?.post_click_quality_score ?? 'UNKNOWN'),
        expectedCtr: String(r.ad_group_criterion?.quality_info?.search_predicted_ctr ?? 'UNKNOWN'),
        adGroupId: r.ad_group?.id ?? 0,
        adGroupName: r.ad_group?.name ?? '',
        campaignId: r.campaign?.id ?? 0,
        campaignName: r.campaign?.name ?? '',
        metrics: {
          clicks: Number(r.metrics?.clicks ?? 0),
          impressions: Number(r.metrics?.impressions ?? 0),
          cost: fromMicros(Number(r.metrics?.cost_micros ?? 0)),
          conversions: Number(r.metrics?.conversions ?? 0),
        },
      }));

      console.log(`✅ Quality Score звіт: ${rows.length} ключових слів`);
      return rows;
    } catch (error) {
      this.handleApiError('getQualityScoreReport', error);
      throw error;
    }
  }
}

