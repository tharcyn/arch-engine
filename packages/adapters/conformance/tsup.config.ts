import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts', 'tests/repositoryVerification.conformance.test.ts', 'tests/schemaCompatibility.conformance.test.ts', 'tests/branchNaming.conformance.test.ts', 'tests/duplicatePullRequestSuppression.conformance.test.ts', 'tests/adapterOutcomeNormalization.conformance.test.ts', 'tests/executionTelemetryShape.conformance.test.ts', 'tests/refusalReasons.conformance.test.ts', 'tests/protocolReplay.crossProviderParity.test.ts', 'tests/protocolReplay.telemetryShape.test.ts', 'tests/protocolReplay.executionPlan.test.ts', 'tests/protocolReplay.adapterOutcome.test.ts', 'tests/protocolReplay.schemaCompatibility.test.ts', 'tests/protocolReplay.repositoryVerification.test.ts', 'tests/protocolReplay.refusalReasons.test.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    target: 'es2022',
    sourcemap: true,
});
