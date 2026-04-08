/**
 * Skills — маркетингові скіли (покрокові інструкції для LLM)
 *
 * Кожен скіл має два режими:
 *   mode="preview"  → показує план дій у Markdown (працює в БУДЬ-ЯКОМУ клієнті)
 *   mode="execute"  → повертає інструкції для виконання
 *
 * Як це працює:
 * 1. Користувач каже "зроби аудит"
 * 2. LLM викликає skill з mode="preview"
 * 3. Користувач бачить план → підтверджує
 * 4. LLM викликає skill з mode="execute"
 * 5. LLM виконує інструкцію, викликаючи data tools крок за кроком
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerAccountAuditSkill } from './accountAudit';
import { registerAdCreationSkill } from './adCreation';
import { registerCreateCampaignFullSkill } from './createCampaignFull';
import { registerBudgetOptimizerSkill } from './budgetOptimizer';
import { registerKeywordRelevanceSkill } from './keywordRelevance';
import { registerAdCopyReviewSkill } from './adCopyReview';
import { registerSearchTermsHarvestSkill } from './searchTermsHarvest';
import { registerSeoPpcOverlapSkill } from './seoPpcOverlap';
import { registerLandingPageAuditSkill } from './landingPageAudit';
import { registerConversionFunnelSkill } from './conversionFunnel';
import { registerGrowthOpportunitiesSkill } from './growthOpportunities';
import { registerCampaignDeepAuditSkill } from './campaignDeepAudit';
import { registerAdGroupDeepAuditSkill } from './adGroupDeepAudit';
import { registerWeeklyOptimizationSkill } from './weeklyOptimization';

/**
 * Реєструє ВСІ скіли на MCP-сервері.
 */
export function registerAllSkills(server: McpServer): void {
  registerAccountAuditSkill(server);
  registerAdCreationSkill(server);
  registerCreateCampaignFullSkill(server);
  registerBudgetOptimizerSkill(server);
  registerKeywordRelevanceSkill(server);
  registerAdCopyReviewSkill(server);
  registerSearchTermsHarvestSkill(server);
  registerSeoPpcOverlapSkill(server);
  registerLandingPageAuditSkill(server);
  registerConversionFunnelSkill(server);
  registerGrowthOpportunitiesSkill(server);
  registerCampaignDeepAuditSkill(server);
  registerAdGroupDeepAuditSkill(server);
  registerWeeklyOptimizationSkill(server);

  console.error('✅ Зареєстровано 14 маркетингових скілів (preview + execute mode)');
}
