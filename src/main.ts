/**
 * main.ts — Точка входу проекту
 *
 * Демонструє використання GoogleAdsService:
 * 1. Ініціалізація з конфігурації (.env)
 * 2. Health check — перевірка з'єднання
 * 3. Лістинг усіх кампаній
 * 4. Зміна статусу (приклад закоментовано)
 * 5. Зміна бюджету (приклад закоментовано)
 * 6. Зведений звіт за обраний період
 *
 * Запуск:
 *   npm run dev
 */

import { adsConfig, logConfigSummary } from './config/adsConfig';
import { GoogleAdsService } from './services/googleAds.service';
import { CampaignStatusEnum } from './types';

// ─────────────────────────────────────────────
// Головна функція
// ─────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🚀 Google Ads Manager — запуск\n');

  // ── Показуємо маскований конфіг для дебагу ──
  logConfigSummary();

  // ── Ініціалізація сервісу ──
  const adsService = new GoogleAdsService(adsConfig);

  // ═══════════════════════════════════════════
  //  1. Health Check
  // ═══════════════════════════════════════════
  console.log('\n─── Health Check ───');
  const isHealthy = await adsService.healthCheck();
  if (!isHealthy) {
    console.error('⛔ Не вдалося підключитися до Google Ads API. Перевірте креденшіали.');
    process.exit(1);
  }

  // ═══════════════════════════════════════════
  //  2. Лістинг кампаній
  // ═══════════════════════════════════════════
  console.log('\n─── Список кампаній ───');
  const campaigns = await adsService.listAllCampaigns();

  // Красивий вивід у таблицю
  if (campaigns.length > 0) {
    console.table(
      campaigns.map((c) => ({
        ID: c.id,
        Назва: c.name,
        Статус: c.status,
        Канал: c.advertisingChannelType,
        'Бюджет/день': `${c.budgetAmount}`,
        Кліки: c.metrics.clicks,
        Покази: c.metrics.impressions,
        Витрати: `${c.metrics.cost}`,
        Конверсії: c.metrics.conversions,
        CTR: `${(c.metrics.ctr * 100).toFixed(2)}%`,
      }))
    );
  } else {
    console.log('   Кампаній не знайдено.');
  }

  // ═══════════════════════════════════════════
  //  3. Зміна статусу кампанії (ПРИКЛАД)
  // ═══════════════════════════════════════════
  // ⚠️ Розкоментуйте та підставте реальний campaignId для тестування:
  //
  // console.log('\n─── Зміна статусу ───');
  // const statusResult = await adsService.updateStatus(
  //   '123456789',                    // ← ID кампанії
  //   CampaignStatusEnum.PAUSED       // ← Новий статус
  // );
  // console.log('Результат:', statusResult);

  // ═══════════════════════════════════════════
  //  4. Зміна бюджету кампанії (ПРИКЛАД)
  // ═══════════════════════════════════════════
  // ⚠️ Розкоментуйте та підставте реальний campaignId для тестування:
  //
  // console.log('\n─── Зміна бюджету ───');
  // const budgetResult = await adsService.updateDailyBudget(
  //   '123456789',   // ← ID кампанії
  //   75.00          // ← Нова сума бюджету (у валюті акаунту)
  // );
  // console.log('Результат:', budgetResult);

  // ═══════════════════════════════════════════
  //  5. Зведений звіт
  // ═══════════════════════════════════════════
  console.log('\n─── Зведений звіт ───');

  // Звіт за останні 7 днів
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const formatDate = (d: Date): string =>
    d.toISOString().split('T')[0];

  const report = await adsService.getPerformanceReport(
    formatDate(sevenDaysAgo),
    formatDate(today)
  );

  // Деталізація
  if (report.rows.length > 0) {
    console.log(`\n📅 Період: ${report.dateRange.startDate} — ${report.dateRange.endDate}`);
    console.table(
      report.rows.slice(0, 20).map((r) => ({
        Дата: r.date,
        Кампанія: r.campaignName,
        Кліки: r.clicks,
        Покази: r.impressions,
        Витрати: r.cost,
        Конверсії: r.conversions,
        'CPA': r.costPerConversion,
        CTR: `${(r.ctr * 100).toFixed(2)}%`,
      }))
    );

    // Підсумки
    console.log('\n📈 Підсумки по акаунту:');
    console.table({
      'Всього кліків': report.totals.clicks,
      'Всього показів': report.totals.impressions,
      'Всього витрат': report.totals.cost,
      'Всього конверсій': report.totals.conversions,
      'Середній CTR': `${report.totals.averageCtr}%`,
      'Середній CPA': report.totals.averageCostPerConversion,
    });
  } else {
    console.log('   Даних за обраний період не знайдено.');
  }

  console.log('\n🏁 Готово!');
}

// ─────────────────────────────────────────────
// Запуск з обробкою необроблених помилок
// ─────────────────────────────────────────────

main().catch((error) => {
  console.error('\n💀 Критична помилка:', error);
  process.exit(1);
});
