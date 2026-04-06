/**
 * adsConfig.ts
 *
 * Зчитує змінні середовища з .env файлу і валідує їхню наявність.
 * Експортує єдиний об'єкт конфігурації для ініціалізації GoogleAdsApi.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { IGoogleAdsCredentials } from '../types';

// Завантажуємо .env з кореня проекту
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Отримує змінну середовища або кидає помилку якщо вона відсутня.
 * @param key — назва змінної
 * @param required — чи є ця змінна обов'язковою (за замовчуванням true)
 */
function getEnvVar(key: string, required: boolean = true): string {
  const value = process.env[key];

  if (!value && required) {
    throw new Error(
      `[Config Error] Змінна середовища "${key}" не знайдена.\n` +
      `Переконайтеся, що файл .env створено на основі .env.example ` +
      `і всі обов'язкові поля заповнені.`
    );
  }

  return value ?? '';
}

/**
 * Об'єкт конфігурації для Google Ads API.
 * Автоматично зчитується при імпорті модуля.
 */
export const adsConfig: IGoogleAdsCredentials = {
  developerToken: getEnvVar('GOOGLE_ADS_DEVELOPER_TOKEN'),
  clientId: getEnvVar('GOOGLE_ADS_CLIENT_ID'),
  clientSecret: getEnvVar('GOOGLE_ADS_CLIENT_SECRET'),
  refreshToken: getEnvVar('GOOGLE_ADS_REFRESH_TOKEN'),
  customerId: getEnvVar('GOOGLE_ADS_CUSTOMER_ID'),
  loginCustomerId: getEnvVar('GOOGLE_ADS_LOGIN_CUSTOMER_ID', false) || undefined,
};

/**
 * Виводить маскований лог конфігурації (для дебагу).
 * Ніколи не показує повні секрети.
 */
export function logConfigSummary(): void {
  const mask = (val: string | undefined): string => {
    if (!val) return '(не задано)';
    if (val.length <= 8) return '****';
    return val.slice(0, 4) + '****' + val.slice(-4);
  };

  console.log('\n🔧 Google Ads Config:');
  console.log(`   Developer Token : ${mask(adsConfig.developerToken)}`);
  console.log(`   Client ID       : ${mask(adsConfig.clientId)}`);
  console.log(`   Client Secret   : ${mask(adsConfig.clientSecret)}`);
  console.log(`   Refresh Token   : ${mask(adsConfig.refreshToken)}`);
  console.log(`   Customer ID     : ${adsConfig.customerId}`);
  console.log(`   Login Cust. ID  : ${adsConfig.loginCustomerId ?? '(не задано)'}`);
  console.log('');
}
