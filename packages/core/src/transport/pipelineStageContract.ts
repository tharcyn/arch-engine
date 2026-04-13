/**
 * Phase 4.9→4.13: Pipeline Stage Ordering Assertion
 *
 * Phase 4.13 expands to v5 (32 stages) with:
 * plainObjectGraphValidation, envelopeIdentitySurfaceValidation,
 * metadataGraphShapeCertification, snapshotTransportCompatibility
 */

export const PIPELINE_STAGE_ORDER_CONTRACT_VERSION = 'v5';

export const PIPELINE_STAGES = [
  'uriResolution',
  'trustPolicyResolution',
  'registryLookup',
  'semverSelection',
  'manifestHydration',
  'dependencyGraphResolution',
  'compositionHintExtraction',
  'transitiveCapabilityPropagation',
  'capabilityClosureCaching',
  'capabilityExplainabilityGraph',
  'trustMetadataBinding',
  'closureGraphHashing',
  'manifestDigestAggregation',
  'dependencyGraphShapeHashing',
  'namespaceSurfaceHashing',
  'explainabilityHashing',
  'registrySourceHashing',
  'stackTopologicalOrdering',
  'dependencyMetadataAttachment',
  'registryProvenanceCapture',
  'snapshotEnvelopeAssembly',
  'snapshotEnvelopeFieldWhitelist',
  'envelopeIdentitySurfaceValidation',
  'plainObjectGraphValidation',
  'deepMetadataFreeze',
  'metadataImmutabilityCertification',
  'authoritativeTopologySurfaceCertification',
  'metadataGraphShapeCertification',
  'envelopeVersionInvariant',
  'snapshotEnvelopeCompleteness',
  'snapshotReplayValidation',
  'snapshotTransportCompatibility'
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number];

export class PipelineStageTracker {
  private completedStages: PipelineStage[] = [];

  public assertStage(stage: PipelineStage): void {
    const expectedIndex = PIPELINE_STAGES.indexOf(stage);
    if (expectedIndex === -1) {
      throw new Error(`Unknown pipeline stage: ${stage}`);
    }

    if (this.completedStages.length > 0) {
      const lastCompleted = this.completedStages[this.completedStages.length - 1];
      const lastIndex = PIPELINE_STAGES.indexOf(lastCompleted);
      if (expectedIndex <= lastIndex) {
        throw new Error(
          `Pipeline stage ordering violation: "${stage}" (index ${expectedIndex}) ` +
          `cannot execute after "${lastCompleted}" (index ${lastIndex}). ` +
          `Contract version: ${PIPELINE_STAGE_ORDER_CONTRACT_VERSION}`
        );
      }
    }

    this.completedStages.push(stage);
  }

  public getCompletedStages(): readonly PipelineStage[] {
    return this.completedStages;
  }
}

/**
 * Phase 4.10→4.13: Deterministic Ordering Surface Assertion
 */
export function assertDeterministicOrderingSurface<T>(
  items: T[],
  keyExtractor: (item: T) => string,
  surfaceName: string
): void {
  for (let i = 1; i < items.length; i++) {
    const prev = keyExtractor(items[i - 1]);
    const curr = keyExtractor(items[i]);
    if ((prev < curr ? -1 : prev > curr ? 1 : 0) > 0) {
      throw new Error(
        `Deterministic ordering violation in ${surfaceName}: ` +
        `"${prev}" must sort before "${curr}" via binary codepoint comparison. ` +
        `Contract version: ${PIPELINE_STAGE_ORDER_CONTRACT_VERSION}`
      );
    }
  }
}
