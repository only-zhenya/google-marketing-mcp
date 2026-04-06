import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { OAuth2Client } from 'google-auth-library';
import { IGa4ReportParams, IGa4ReportResult, IGa4ReportRow } from '../types';

export class GoogleAnalyticsService {
  private analyticsDataClient: BetaAnalyticsDataClient;
  private defaultPropertyId: string;

  constructor() {
    this.defaultPropertyId = process.env.GA_PROPERTY_ID || '';

    // Initialize with the standard OAuth approach to share credentials with Google Ads
    const auth = new OAuth2Client({
      clientId: process.env.GOOGLE_ADS_CLIENT_ID,
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET,
    });

    auth.setCredentials({
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });

    this.analyticsDataClient = new BetaAnalyticsDataClient({ authClient: auth });
    
    if (this.defaultPropertyId) {
      console.log(`✅ GoogleAnalyticsService initialized with default GA4 Property ID: ${this.defaultPropertyId}`);
    } else {
      console.log(`⚠️ GoogleAnalyticsService initialized without a default Property ID.`);
    }
  }

  /**
   * Run a custom GA4 Report
   */
  async getReport(params: IGa4ReportParams): Promise<IGa4ReportResult> {
    const propertyId = params.propertyId || this.defaultPropertyId;
    if (!propertyId) {
       throw new Error('GA4 Property ID is required. Either set GA_PROPERTY_ID in .env or pass it as a parameter.');
    }

    console.log(`📊 Fetching GA4 Report for Property ${propertyId}...`);

    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [
          {
            startDate: params.startDate || '30daysAgo',
            endDate: params.endDate || 'today',
          },
        ],
        dimensions: params.dimensions.map(name => ({ name })),
        metrics: params.metrics.map(name => ({ name })),
      });

      const formattedRows: IGa4ReportRow[] = [];

      if (response.rows) {
        response.rows.forEach(row => {
          const dimensionValues: Record<string, string> = {};
          const metricValues: Record<string, string> = {};

          row.dimensionValues?.forEach((val, i) => {
            const dimName = response.dimensionHeaders?.[i]?.name || `dim_${i}`;
            dimensionValues[dimName] = val.value || '';
          });

          row.metricValues?.forEach((val, i) => {
            const metName = response.metricHeaders?.[i]?.name || `met_${i}`;
            metricValues[metName] = val.value || '';
          });

          formattedRows.push({ dimensionValues, metricValues });
        });
      }

      console.log(`✅ Fetched ${formattedRows.length} rows from GA4.`);

      return {
        propertyId,
        rowCount: formattedRows.length,
        rows: formattedRows,
      };
    } catch (error: any) {
      console.error('❌ Error fetching GA4 report:', error.message);
      throw error;
    }
  }
}
