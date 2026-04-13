import { ArbitrationExplainabilitySurface } from '../composition/arbitrationExplainabilitySurface.js';
import { ShortCircuitExecutionPlan } from './EvaluationShortCircuitResolver.js';
import { ExecutionResultSurface } from './ResultAggregationResolver.js';
import { capabilityDescriptorConfig } from '../transport/capabilityDescriptorMatrixHash.js';

export const EXECUTION_EXPLAINABILITY_EMITTER_VERSION = 'v1';

export interface ExecutionExplainabilityGraph {
  decisionOrigin: string; // The root logic path
  suppressionLineage: string[];
  fallbackActivationLineage: string[];
  namespaceOverrideLineage: string[];
  trustOverrideLineage: string[];
  evaluationTerminationNodes: string[];
  decisionInputs: string[];
  thresholdValues: Record<string, string>;
  environmentParameters: Record<string, string>;
  fallbackBoundaryTriggers: string[];
  capabilityMatrixCanonicalizationVersion?: string;
  federationRejectionDiagnostics?: {
    expectedCanonicalizationVersion?: string;
    receivedCanonicalizationVersion?: string;
    expectedDescriptorVersions?: string;
    receivedDescriptorVersions?: string;
    matrixHashLocal?: string;
    matrixHashRemote?: string;
  };
}

/**
 * Phase 7 Objective 7: Execution Explainability Emitter
 */
export class ExecutionExplainabilityEmitter {
  constructor(
    private executionResultSurface: ExecutionResultSurface,
    private shortCircuitPlan: ShortCircuitExecutionPlan,
    private arbitrationExplainabilitySurface: ArbitrationExplainabilitySurface
  ) {}

  public mapGraph(): ExecutionExplainabilityGraph {
    let decisionOrigin = 'implicit-default';
    if (this.executionResultSurface.decisionChain.length > 0) {
      decisionOrigin = `Evaluated through mapping sequence ending in [${this.executionResultSurface.decisionChain[this.executionResultSurface.decisionChain.length - 1]}]`;
    }

    if (Object.keys(this.shortCircuitPlan.terminatedBranches).length > 0) {
      const stops = Object.keys(this.shortCircuitPlan.terminatedBranches);
      decisionOrigin = `Evaluation structurally terminated gracefully at nodes [${stops.join(', ')}]`;
    }

    return {
      decisionOrigin,
      suppressionLineage: [...this.arbitrationExplainabilitySurface.loserSuppressionChain],
      fallbackActivationLineage: [...this.arbitrationExplainabilitySurface.fallbackActivationChain],
      namespaceOverrideLineage: [...this.arbitrationExplainabilitySurface.namespaceOverrideChain],
      trustOverrideLineage: [...this.arbitrationExplainabilitySurface.trustOverrideChain],
      evaluationTerminationNodes: Object.keys(this.shortCircuitPlan.terminatedBranches),
      decisionInputs: [...this.executionResultSurface.decisionChain],
      thresholdValues: {}, // Map explicitly when execution thresholds are defined natively
      environmentParameters: {}, // Bound statically to Context Explainability mapping outputs natively
      fallbackBoundaryTriggers: [...this.arbitrationExplainabilitySurface.fallbackActivationChain],
      capabilityMatrixCanonicalizationVersion: capabilityDescriptorConfig.capabilityMatrixCanonicalizationVersion
    };
  }
}
