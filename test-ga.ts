import { AnalyticsAdminServiceClient } from '@google-analytics/admin';
import { OAuth2Client } from 'google-auth-library';
import * as dotenv from 'dotenv';
dotenv.config();

async function testAnalytics() {
  console.log('⏳ Тестуємо доступ до Google Analytics...');
  
  const auth = new OAuth2Client({
    clientId: process.env.GOOGLE_ADS_CLIENT_ID,
    clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  });

  auth.setCredentials({
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
  });

  try {
    const adminClient = new AnalyticsAdminServiceClient({ authClient: auth });
    console.log('🔄 Завантажуємо список акаунтів Google Analytics...');
    
    // Attempting to list accounts
    const [accounts] = await adminClient.listAccounts();
    
    if (accounts.length === 0) {
      console.log('✅ Доступ ПРАЦЮЄ, але до цього Google Акаунту не прикріплено жодного Google Analytics акаунту.');
      return;
    }

    console.log(`✅ Доступ ПРАЦЮЄ! Знайдено ${accounts.length} акаунтів:`);
    for (const account of accounts) {
      console.log(`- Акаунт GA: ${account.displayName} (ID: ${account.name})`);
      const [properties] = await adminClient.listProperties({ filter: `parent:${account.name}` });
      if (properties.length > 0) {
         console.log(`  Properties (GA4):`);
         for (const prop of properties) {
           console.log(`  -> ${prop.displayName} (Property ID: ${prop.name.replace('properties/', '')})`);
         }
      } else {
         console.log(`  (Немає GA4 ресурсів у цьому акаунті)`);
      }
    }
  } catch (err: any) {
    if (err.message?.includes('has not been used in project')) {
       console.error('❌ Google Analytics API НЕ УВІМКНЕНО у твоєму Google Cloud Project.');
       console.error('Щоб виправити: Зайди в Google Cloud Console -> APIs & Services -> Library -> Знайди "Google Analytics Admin API" та "Google Analytics Data API" і натисни ENABLE.');
    } else {
       console.error('❌ Помилка доступу до Google Analytics:');
       console.error(err.message);
    }
  }
}

testAnalytics();
