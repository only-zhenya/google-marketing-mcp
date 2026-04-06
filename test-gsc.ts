import { google } from 'googleapis';
import * as dotenv from 'dotenv';
dotenv.config();

async function testGSC() {
  console.log('⏳ Тестуємо доступ до Google Search Console...');

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_ADS_CLIENT_ID,
    process.env.GOOGLE_ADS_CLIENT_SECRET
  );

  auth.setCredentials({
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
  });

  const searchconsole = google.searchconsole({
    version: 'v1',
    auth: auth,
  });

  try {
    const res = await searchconsole.sites.list();
    if (!res.data.siteEntry || res.data.siteEntry.length === 0) {
      console.log('✅ Доступ ПРАЦЮЄ, але у тебе немає підтверджених сайтів у Google Search Console на цьому акаунті.');
      return;
    }

    console.log(`✅ Доступ ПРАЦЮЄ! Знайдено ${res.data.siteEntry.length} сайтів:`);
    res.data.siteEntry.forEach((site: any) => {
      console.log(`- ${site.siteUrl} (Дозвіл: ${site.permissionLevel})`);
    });
  } catch (err: any) {
    if (err.message.includes('Search Console API has not been used')) {
      console.error('❌ Google Search Console API НЕ УВІМКНЕНО у твоєму Google Cloud Project.');
      console.error('Перейди за посиланням у повідомленні помилки вище, щоб увімкнути його.');
    } else if (err.message.includes('scope') || err.message.includes('Insufficient Permission')) {
      console.error('❌ Недостатньо прав (Scope) у твоєму токені доступу.');
      console.error('Твій поточний OAuth токен був створений лише для Google Ads та Analytics. Для GSC потрібен scope: "https://www.googleapis.com/auth/webmasters" або "https://www.googleapis.com/auth/webmasters.readonly"');
      console.error('Будь ласка, згенеруй новий токен, вибравши також Search Console API.');
    } else {
      console.error('❌ Помилка доступу до Google Search Console:');
      console.error(err.message);
    }
  }
}

testGSC();
