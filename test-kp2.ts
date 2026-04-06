import { GoogleAdsApi, enums } from 'google-ads-api';
import * as dotenv from 'dotenv';
dotenv.config();

const api = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
});
const customer = api.Customer({
  customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
  refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
});

async function run() {
  try {
    const res = await customer.keywordPlanIdeas.generateKeywordIdeas({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
      language: 'languageConstants/1033',
      keyword_plan_network: enums.KeywordPlanNetwork.GOOGLE_SEARCH,
      keyword_seed: { keywords: ['дизайн інтерєру'] }
    });
    console.log(JSON.stringify(res, null, 2));
  } catch (err: any) {
    console.error("ERROR:");
    console.error(err);
  }
}
run();
