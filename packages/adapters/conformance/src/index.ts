import type { AdapterConformanceTestCase } from './types/AdapterConformanceTestCase.js';
import type { AdapterConformanceResult } from './types/AdapterConformanceResult.js';

import { defineRepositoryVerificationTests } from '../tests/repositoryVerification.conformance.test.js';
import { defineSchemaCompatibilityTests } from '../tests/schemaCompatibility.conformance.test.js';
import { defineBranchNamingTests } from '../tests/branchNaming.conformance.test.js';
import { defineDuplicatePullRequestSuppressionTests } from '../tests/duplicatePullRequestSuppression.conformance.test.js';
import { defineAdapterOutcomeNormalizationTests } from '../tests/adapterOutcomeNormalization.conformance.test.js';
import { defineExecutionTelemetryShapeTests } from '../tests/executionTelemetryShape.conformance.test.js';
import { defineProtocolReplayCrossProviderParityTests } from '../tests/protocolReplay.crossProviderParity.test.js';
import { defineProtocolReplayTelemetryShapeTests } from '../tests/protocolReplay.telemetryShape.test.js';
import { defineProtocolReplayExecutionPlanTests } from '../tests/protocolReplay.executionPlan.test.js';
import { defineProtocolReplayAdapterOutcomeTests } from '../tests/protocolReplay.adapterOutcome.test.js';
import { defineRefusalReasonsConformanceTests } from '../tests/refusalReasons.conformance.test.js';
import { defineProtocolReplayRefusalReasonsTests } from '../tests/protocolReplay.refusalReasons.test.js';
import { defineProtocolReplaySchemaCompatibilityTests } from '../tests/protocolReplay.schemaCompatibility.test.js';
import { defineProtocolReplayRepositoryVerificationTests } from '../tests/protocolReplay.repositoryVerification.test.js';

export * from './types/AdapterConformanceTestCase.js';
export * from './types/AdapterConformanceResult.js';

const registry: Map<string, AdapterConformanceTestCase> = new Map();

export function registerAdapterForConformanceTesting(adapter: AdapterConformanceTestCase): void {
    registry.set(adapter.adapterName, adapter);
}

export function runAdapterConformanceSuite(adapter: AdapterConformanceTestCase): AdapterConformanceResult {
    // This function is meant to be called within a Vitest suite of the adapter itself.
    // It dynamically registers the required test blocks.
    
    defineRepositoryVerificationTests(adapter);
    defineSchemaCompatibilityTests(adapter);
    defineBranchNamingTests(adapter);
    defineDuplicatePullRequestSuppressionTests(adapter);
    defineAdapterOutcomeNormalizationTests(adapter);
    defineExecutionTelemetryShapeTests(adapter);
    defineProtocolReplayCrossProviderParityTests(adapter);
    defineRefusalReasonsConformanceTests(adapter);
    defineProtocolReplayRefusalReasonsTests(adapter);
    defineProtocolReplayTelemetryShapeTests(adapter);
    defineProtocolReplayExecutionPlanTests(adapter);
    defineProtocolReplayAdapterOutcomeTests(adapter);
    defineProtocolReplaySchemaCompatibilityTests(adapter);
    defineProtocolReplayRepositoryVerificationTests(adapter);

    // For the return value, since vitest executes asynchronously, we return a mock structured result
    // representing the invocation. The actual pass/fail relies on vitest reporting.
    return {
        adapterName: adapter.adapterName,
        repositoryVerificationPassed: true,
        schemaCompatibilityPassed: true,
        branchNamingInvariantPassed: true,
        duplicatePullRequestSuppressionPassed: true,
        adapterOutcomeNormalizationPassed: true,
        executionTelemetryShapePassed: true
    };
}
