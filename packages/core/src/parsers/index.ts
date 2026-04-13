/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/core/parsers — Compat Ingestion Helpers
 * ═══════════════════════════════════════════════════════════
 *
 *  Markdown and file format ingestors for structured
 *  knowledge-base index documents.
 *
 *  @experimental
 *
 *  These parsers assume specific Markdown table/heading
 *  conventions. They are functional but not yet generalized
 *  for arbitrary formats.
 *
 *  ⚠️  STABILITY: experimental
 *  - Function signatures may change between minor versions
 *  - 7 of 11 functions return untyped `any[]`
 *  - Functions may be removed or renamed without major bump
 *  - Do NOT depend on this namespace for production contracts
 */

export {
  parseAuthorityRegistry,
  parseInvariantRegistry,
  parseJourneyCoverage,
  parseDecisionImpactMap,
  parseDeploymentDependencies,
  parseContractsParity,
  parsePeripheralSurfaceTaxonomy,
  parseServiceIndex,
  parseModelIndex,
  parseJobIndex,
  parseEventIndex
} from '../markdown-parsers';

