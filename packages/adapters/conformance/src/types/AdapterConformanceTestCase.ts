import type { FederationEvaluationPolicyPullRequestPayload } from '@arch-engine/core';

export interface AdapterConformanceTestCase {
    readonly adapterName: string;
    
    // The core capabilities the adapter claims to support
    readonly supportsRepositoryVerification: boolean;
    readonly supportsDuplicatePullRequestDetection: boolean;
    readonly supportsSchemaCompatibilityValidation: boolean;

    // The execution plane functions to be validated
    readonly buildExecutionPlan: (payload: FederationEvaluationPolicyPullRequestPayload) => any;
    readonly executePlan: (plan: any, options?: any) => Promise<any>;
}
