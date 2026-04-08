/**
 * Skills — маркетингові скіли (покрокові інструкції для LLM)
 *
 * Кожен скіл реєструється як TOOL (не prompt), тому він видимий
 * у ВСІХ MCP-клієнтах: Claude Desktop, Claude Code, LM Studio, тощо.
 *
 * Як це працює:
 * 1. Користувач каже "зроби аудит" або "створи кампанію"
 * 2. LLM викликає відповідний skill tool
 * 3. Tool повертає покрокову інструкцію
 * 4. LLM виконує інструкцію, викликаючи інші tools крок за кроком
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
 * Викликай один раз при ініціалізації сервера.
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

  console.error(`✅ Зареєстровано 14 маркетингових скілів`);
}
