import { GoogleAdsApi } from 'google-ads-api';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

async function testAds() {
  console.log('⏳ Тестуємо доступ до Google Ads...');

  const api = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
  });

  const customer = api.Customer({
    customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID || '',
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || '',
  });

  try {
    const campaigns = await customer.report({
      entity: 'campaign',
      attributes: ['campaign.id', 'campaign.name'],
      limit: 5,
    });
    console.log(`✅ Доступ до Google Ads ПРАЦЮЄ! Знайдено ${campaigns.length} кампаній.`);
  } catch (err: any) {
    console.error('❌ Помилка доступу до Google Ads:');
    console.error(err.message);
    if (err.errors) {
      console.error(JSON.stringify(err.errors, null, 2));
    }
  }
}

testAds();
