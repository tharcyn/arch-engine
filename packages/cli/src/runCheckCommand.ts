// NOTE:
// CLI depends only on public dist exports from @arch-engine/core.
// Internal source-path imports are intentionally prohibited here
// to guarantee package-boundary stability during publishing.

import {
  runDatasetIngestionPipeline,
  projectValidatedDatasetToValidatorView,
  extractTopologyGraph,
  diffTopologyGraphs,
  classifyTopologyDiff,
  classifyPolicyRelevantDiff,
  PolicyPackRunner,
  summarizePolicyEvaluations,
  buildGovernanceReport,
  formatGovernanceReportForCLI,
  formatGovernanceReportAsJSON,
  buildExplainReport,
  formatExplainReportForCLI,
  formatExplainReportAsJSON,
  mapGovernanceReportToExitCode,
  buildTopologySnapshot,
  validateTopologySnapshotCompatibility,
  extractTopologyGraphFromSnapshot,
  validateTopologySnapshotLineage,
  assessPolicyPackDatasetCapabilityCompatibility,
  assessPolicyPackGovernanceSurfaceCompatibility,
  assessPolicyPackExecutionCompatibility,
  extractLockfileDatasetIdentity
} from '@arch-engine/core';

import { writeTopologySnapshot } from './writeTopologySnapshot';
import { listPolicyPackMetadata } from './listPolicyPackMetadata';
import { resolvePolicyPackDependencies } from './resolvePolicyPackDependencies';

import type {
  GovernanceReport,
  TopologyPolicyPack,
  TopologyGraph,
} from '@arch-engine/core';

import * as fs from 'node:fs';

import { detectExecutionInputMode } from './detectExecutionInputMode';

/**
 * CLI command adapter for the `check` command.
 *
 * Connects the full governance pipeline:
 *   input detection (snapshot or dataset) → graph extraction →
 *   snapshot persistence (optional) → baseline loading (optional) →
 *   baseline compatibility validation → diff → classification →
 *   policy evaluation → aggregation → governance report →
 *   formatted output → exit code
 *
 * Returns a process exit code integer.
 * Does NOT call process.exit().
 * Logs output exactly once via console.log.
 *
 * Phase 6F — CLI Command Adapter Layer
 * Phase 7A — Baseline Comparison Surface
 * Phase 7B — Snapshot Persistence Surface
 * Phase 7C — Snapshot Compatibility Validation Surface
 * Phase 7D — Snapshot Graph Extraction Surface
 * Phase 8A — Snapshot Pair Comparison Surface
 */
export async function runCheckCommand(
  datasetPath: string,
  options?: {
    readonly json?: boolean;
    readonly explain?: boolean;
    readonly baseline?: string;
    readonly writeBaseline?: string;
    readonly driftGate?: boolean;
    readonly policy?: string[];
    readonly policyPacks?: readonly TopologyPolicyPack[];
    readonly useLockfile?: boolean;
    readonly writeLockfile?: boolean;
    readonly refreshLockfile?: boolean;
    readonly diffLockfile?: boolean;
    readonly verifyLockfileSignature?: boolean;
  }
): Promise<number> {
  // ── 1. Load input and detect type ──────────────────────
  // Content-based detection: if snapshotSurfaceVersion is present,
  // treat as snapshot input; otherwise treat as dataset input.
  let currentGraph: TopologyGraph;
  let currentSnapshot: import('@arch-engine/core').TopologySnapshot | undefined;
  let currentInputIsSnapshot = false;

  const inputContent = fs.readFileSync(datasetPath, 'utf-8');
  const inputJson = JSON.parse(inputContent);

  if (isSnapshotInput(inputJson)) {
    // ── 1a. Snapshot input path ────────────────────────────
    currentInputIsSnapshot = true;
    const compatibility = validateTopologySnapshotCompatibility(inputJson);
    if (!compatibility.compatible) {
      console.log(
        `Snapshot version mismatch\nExpected: ${compatibility.expectedVersion}\nReceived: ${compatibility.actualVersion ?? 'undefined'}`
      );
      return 1;
    }
    currentSnapshot = inputJson as import('@arch-engine/core').TopologySnapshot;
    currentGraph = extractTopologyGraphFromSnapshot(inputJson);
  } else {
    // ── 1b. Dataset input path ────────────────────────────
    const validated = runDatasetIngestionPipeline(datasetPath);
    const view = projectValidatedDatasetToValidatorView(validated as any);
    currentGraph = extractTopologyGraph(view);
    const { extractLockfileDatasetIdentity } = require('@arch-engine/core');
    if (inputJson && inputJson.topology_dataset_identity) {
        const extracted = extractLockfileDatasetIdentity(inputJson);
        options.activeDatasetIdentity = extracted.identity;
        (options as any).activeCapabilityManifest = extracted.capabilityManifest;
        (options as any).activeDataset = inputJson;
        (options as any).activeMutationClassRegistry = extracted.mutationClassRegistry;
        (options as any).activeAuthorityScopeRegistry = extracted.authorityScopeRegistry;
        (options as any).activeSurfaceConfidenceRegistry = extracted.surfaceConfidenceRegistry;
        (options as any).activeTrustBoundaryRules = extracted.trustBoundaryRules;
        (options as any).activeDataset = inputJson;
    }
  }

  // ── 2. Write snapshot (optional) ───────────────────────
  if (options?.writeBaseline) {
    const snapshot = buildTopologySnapshot(currentGraph);
    writeTopologySnapshot(snapshot, options.writeBaseline);
  }

  // ── 3. Load baseline snapshot (optional) ───────────────
  // If baseline dataset provided:
  // compare baselineGraph → currentGraph
  // otherwise fallback to self-diff for deterministic pipeline stability
  let baselineGraph;
  let baselineInputIsSnapshot = false;
  if (options?.baseline) {
    const baselineSnapshot = JSON.parse(
      fs.readFileSync(options.baseline, 'utf-8')
    );

    // ── 4. Validate baseline compatibility ─────────────────
    const compatibility = validateTopologySnapshotCompatibility(baselineSnapshot);
    if (!compatibility.compatible) {
      console.log(
        `Baseline snapshot version mismatch\nExpected: ${compatibility.expectedVersion}\nReceived: ${compatibility.actualVersion ?? 'undefined'}`
      );
      return 1;
    }

    baselineInputIsSnapshot = true;
    baselineGraph = extractTopologyGraphFromSnapshot(baselineSnapshot);

    // ── 4b. Validate baseline lineage (optional) ───────────
    if (currentSnapshot) {
      const lineageResult = validateTopologySnapshotLineage(
        currentSnapshot,
        baselineSnapshot
      );

      if (!lineageResult.compatible) {
        console.log(
          `Snapshot lineage mismatch detected\nCurrent lineage: ${lineageResult.currentLineageId ?? 'undefined'}\nBaseline lineage: ${lineageResult.baselineLineageId ?? 'undefined'}`
        );
      }
    }
  }

  // ── 5. Detect execution mode ──────────────────────────
  // ExecutionInputMode classifies topology comparison semantics.
  // Enables future snapshot-native workflows without modifying diff engine behavior.
  const executionMode = detectExecutionInputMode(
    currentInputIsSnapshot,
    baselineInputIsSnapshot
  );

  // ── 6. Compute diff ────────────────────────────────────
  const diff = diffTopologyGraphs(
    baselineGraph ?? currentGraph,
    currentGraph
  );

  // ── 7. Classify diff ───────────────────────────────────
  const classification = classifyTopologyDiff(diff);
  const policyDiff = classifyPolicyRelevantDiff(diff, classification);

  // ── 7.5. Evaluate Drift Gate ───────────────────────────
  // driftGate mode enables CI-safe topology regression enforcement
  // by exiting early when classified topology drift exists relative
  // to a provided baseline snapshot
  if (options?.driftGate === true) {
    if (!options?.baseline) {
      console.log('Drift gate requires a baseline snapshot');
      return 1;
    }

    const hasDrift = classification.hasStructuralChanges || classification.hasMetadataChanges;
    if (hasDrift) {
      console.log('Topology drift detected relative to baseline snapshot');
      return 1;
    } else {
      console.log('No topology drift detected relative to baseline snapshot');
    }
  }

  // ── 8. Evaluate policy packs ───────────────────────────
  // --policy flag enables selective execution of governance packs
  // supporting incremental rollout and scoped CI enforcement workflows
  const builtinPacks = options?.policyPacks ?? [];
  const builtinIds = new Set(builtinPacks.map((p) => p.policyPackId));
  const discoveredMetadata = await listPolicyPackMetadata({
    useLockfile: options?.useLockfile,
    writeLockfile: options?.writeLockfile,
    refreshLockfile: options?.refreshLockfile,
    diffLockfile: options?.diffLockfile,
    verifyLockfileSignature: options?.verifyLockfileSignature,
    json: options?.json,
    activeDatasetIdentity: (options as any)?.activeDatasetIdentity,
    activeCapabilityManifest: (options as any)?.activeCapabilityManifest,
    activeMutationClassRegistry: (options as any)?.activeMutationClassRegistry,
    activeAuthorityScopeRegistry: (options as any)?.activeAuthorityScopeRegistry,
    activeSurfaceConfidenceRegistry: (options as any)?.activeSurfaceConfidenceRegistry,
    activeTrustBoundaryRules: (options as any)?.activeTrustBoundaryRules,
    activeDataset: (options as any)?.activeDataset
  });
  const discoveredPacks: TopologyPolicyPack[] = discoveredMetadata
    .filter(m => !builtinIds.has(m.policyPackId))
    .map(m => ({
      policyPackId: m.policyPackId,
      displayName: m.policyPackId,
      metadata: m
    }));

  const allPacks = [...builtinPacks, ...discoveredPacks];
  let selectedPolicyPacks = [...allPacks];

  if (options?.policy && options.policy.length > 0) {
    const availablePackIds = new Set(allPacks.map(p => p.policyPackId));

    for (const requestedId of options.policy) {
      if (!availablePackIds.has(requestedId)) {
        console.log(`Unknown policy pack id: ${requestedId}`);
        return 1;
      }
    }

    const resolvedIds = await resolvePolicyPackDependencies(
      options.policy,
      Array.from(availablePackIds)
    );

    // Filter AND preserve order based on resolvedIds
    selectedPolicyPacks = resolvedIds.map(id => allPacks.find(p => p.policyPackId === id)!);
  }

  // ── 8.5. Policy-Pack Execution Enforcement ───────────
  if ((options as any)?.activeDataset) {
    const packMetadatas = selectedPolicyPacks.map(p => p.metadata).filter(Boolean) as import('@arch-engine/core').PolicyPackMetadata[];
    
    const executionCompat = assessPolicyPackExecutionCompatibility(
      (options as any)?.activeCapabilityManifest,
      (options as any)?.activeMutationClassRegistry,
      (options as any)?.activeAuthorityScopeRegistry,
      (options as any)?.activeSurfaceConfidenceRegistry,
      (options as any)?.activeTrustBoundaryRules,
      packMetadatas
    );

    if (executionCompat.overallStatus === 'incompatible') {
      const { loadTrustPolicyConfig } = await import('./loadTrustPolicyConfig.js');
      const trustConfig = loadTrustPolicyConfig();
      const mode = trustConfig.enforcementMode || 'permissive';
      
      if (mode === 'require-signature' || mode === 'require-signature-and-freshness') {
        console.log(`Policy-Pack Execution Blocked: ${executionCompat.summaryMessage}`);
        if (options?.json) {
          console.log(JSON.stringify(executionCompat, null, 2));
        }
        return 1;
      } else {
        console.log(`Warning: ${executionCompat.summaryMessage} (Permissive mode allows execution)`);
      }
    }
  }

  for (const pack of selectedPolicyPacks) {
    if ((pack.metadata as any)?.isRemote && pack.metadata?.rules) {
      console.log(`Executing trusted remote policy pack: ${pack.policyPackId}`);
    }
  }

  const runner = new PolicyPackRunner(selectedPolicyPacks);
  const context = {
    policyRelevantDiff: policyDiff,
    topologyGraph: currentGraph
  };
  const results = runner.run(context);

  // ── 9. Summarize and build report ──────────────────────
  const summary = summarizePolicyEvaluations(results);
  const report = buildGovernanceReport(summary);

  // ── 10. Select output mode and format ──────────────────
  const output = selectOutputFormat(report, options, executionMode);

  // ── 11. Print output exactly once ──────────────────────
  console.log(output);

  // ── 12. Map and return exit code ───────────────────────
  return mapGovernanceReportToExitCode(report);
}

/**
 * Detects whether parsed JSON input is a topology snapshot.
 *
 * Content-based detection: presence of snapshotSurfaceVersion
 * indicates snapshot format. Does NOT rely on file extension.
 *
 * @internal — exported for test isolation only.
 */
export function isSnapshotInput(input: unknown): boolean {
  if (input === null || input === undefined || typeof input !== 'object') {
    return false;
  }
  return 'snapshotSurfaceVersion' in (input as Record<string, unknown>);
}

/**
 * Selects the appropriate formatter based on CLI options.
 *
 * @internal — exported for test isolation only.
 */
export function selectOutputFormat(
  report: GovernanceReport,
  options?: {
    readonly json?: boolean;
    readonly explain?: boolean;
  },
  executionMode: import('@arch-engine/core').ExecutionInputMode = "dataset_vs_dataset"
): string {
  if (options?.explain === true) {
    const explainReport = buildExplainReport(report, executionMode);
    if (options?.json === true) {
      return formatExplainReportAsJSON(explainReport);
    }
    return formatExplainReportForCLI(explainReport);
  }

  if (options?.json === true) {
    return formatGovernanceReportAsJSON(report);
  }

  return formatGovernanceReportForCLI(report);
}
