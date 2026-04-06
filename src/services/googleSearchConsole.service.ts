import { google, searchconsole_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class GoogleSearchConsoleService {
  private searchConsole: searchconsole_v1.Searchconsole;

  constructor() {
    const auth = new OAuth2Client({
      clientId: process.env.GOOGLE_ADS_CLIENT_ID,
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET,
    });

    auth.setCredentials({
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });

    this.searchConsole = google.searchconsole({
      version: 'v1',
      auth: auth,
    });
    console.log('✅ GoogleSearchConsoleService initialized.');
  }

  /**
   * Get a list of verified sites in Google Search Console
   */
  async listSites() {
    console.log('🌍 Fetching GSC sites...');
    try {
      const res = await this.searchConsole.sites.list();
      return res.data.siteEntry || [];
    } catch (error: any) {
      console.error('❌ Error fetching GSC sites:', error.message);
      throw error;
    }
  }

  /**
   * Query Search Analytics (Clicks, Impressions, CTR, Position)
   */
  async querySearchAnalytics(
    siteUrl: string,
    startDate: string,
    endDate: string,
    dimensions: string[] = ['query', 'page'],
    rowLimit: number = 100
  ) {
    console.log(`📊 Fetching GSC Search Analytics for ${siteUrl}...`);
    try {
      const res = await this.searchConsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions,
          rowLimit,
        },
      });
      return res.data.rows || [];
    } catch (error: any) {
      console.error('❌ Error querying GSC analytics:', error.message);
      throw error;
    }
  }
}
