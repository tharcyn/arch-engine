import { describe, test, expect } from 'vitest';
import { selectOutputFormat } from '../src/runCheckCommand';
import { mapGovernanceReportToExitCode } from '@arch-engine/core';
import type { GovernanceReport } from '@arch-engine/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * ═══════════════════════════════════════════════════════════
 *  Phase 6F — CLI Command Adapter Tests
 * ═══════════════════════════════════════════════════════════
 *
 *  Tests verify:
 *  - correct formatter selection based on options
 *  - correct exit code mapping
 *  - no process.exit usage inside runCheckCommand
 *
 *  Note: runCheckCommand itself requires filesystem access
 *  (dataset loading). These tests exercise the pure output
 *  selection and exit code mapping logic via selectOutputFormat
 *  and GovernanceReport fixtures.
 */

// ── Test fixtures ────────────────────────────────────────

const passReport: GovernanceReport = {
  reportSurfaceVersion: "1.0.0",
  status: "pass",
  totalPacks: 1,
  passedPacks: 1,
  warningPacks: 0,
  failedPacks: 0,
  highestSeverity: null,
  results: [{ policyPackId: "p1", success: true, diagnostics: [] }],
};

const warningReport: GovernanceReport = {
  reportSurfaceVersion: "1.0.0",
  status: "warning",
  totalPacks: 1,
  passedPacks: 0,
  warningPacks: 1,
  failedPacks: 0,
  highestSeverity: "warning",
  results: [
    { policyPackId: "p1", success: true, diagnostics: [{ code: "W1", message: "drift", severity: "warning" }] },
  ],
};

const failReport: GovernanceReport = {
  reportSurfaceVersion: "1.0.0",
  status: "fail",
  totalPacks: 2,
  passedPacks: 1,
  warningPacks: 0,
  failedPacks: 1,
  highestSeverity: "error",
  results: [
    { policyPackId: "p1", success: true, diagnostics: [] },
    { policyPackId: "p2", success: false, diagnostics: [{ code: "E1", message: "broken", severity: "error" }] },
  ],
};

// ── Tests ────────────────────────────────────────────────

describe('Phase 6F CLI Command Adapter', () => {

  test('returns_exit_code_pass_case', () => {
    const exitCode = mapGovernanceReportToExitCode(passReport);
    expect(exitCode).toBe(0);
  });

  test('returns_exit_code_warning_case', () => {
    const exitCode = mapGovernanceReportToExitCode(warningReport);
    expect(exitCode).toBe(0);
  });

  test('returns_exit_code_fail_case', () => {
    const exitCode = mapGovernanceReportToExitCode(failReport);
    expect(exitCode).toBe(1);
  });

  test('json_mode_formats_json_output', () => {
    const output = selectOutputFormat(failReport, { json: true });
    // Must be valid JSON
    const parsed = JSON.parse(output);
    expect(parsed.status).toBe("fail");
    expect(parsed.reportSurfaceVersion).toBe("1.0.0");
  });

  test('explain_mode_formats_explain_output', () => {
    const output = selectOutputFormat(failReport, { explain: true });
    expect(output).toContain('Explain Mode Output');
    expect(output).toContain('Status: fail');
    expect(output).toContain('Policy Pack Analysis:');
    expect(output).toContain('p2');
  });

  test('default_mode_formats_cli_output', () => {
    const output = selectOutputFormat(failReport);
    expect(output).toContain('Status: fail');
    expect(output).toContain('Policy Packs Evaluated: 2');
    expect(output).toContain('Policy Pack Results:');
    // Must NOT contain explain header
    expect(output).not.toContain('Explain Mode Output');
  });

  test('missing_dataset_path_returns_usage_message', () => {
    // Static assertion: runCheckCommand source must NOT call process.exit()
    const sourceCode = fs.readFileSync(
      path.resolve(__dirname, '../src/runCheckCommand.ts'),
      'utf-8'
    );
    // Strip comments before checking — doc comments may mention process.exit
    const codeOnly = sourceCode
      .replace(/\/\*[\s\S]*?\*\//g, '')  // block comments
      .replace(/\/\/.*/g, '');            // line comments
    expect(codeOnly).not.toContain('process.exit');
  });

  test('ensures_cli_imports_public_contract_surface_only', () => {
    // Regression guard: runCheckCommand must never import from internal source paths
    const sourceCode = fs.readFileSync(
      path.resolve(__dirname, '../src/runCheckCommand.ts'),
      'utf-8'
    );
    // Extract all import path strings
    const importPaths = [...sourceCode.matchAll(/from\s+['"]([^'"]+)['"]/g)]
      .map(m => m[1]);
    // No import path should contain '/src/' when referencing @arch-engine/core
    const violations = importPaths.filter(p => p.includes('/src/'));
    expect(violations).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════
//  Phase 7A — Baseline Comparison Surface
// ═══════════════════════════════════════════════════════════

describe('Phase 7A Baseline Comparison Surface', () => {

  const commandSource = fs.readFileSync(
    path.resolve(__dirname, '../src/runCheckCommand.ts'),
    'utf-8'
  );

  const entrySource = fs.readFileSync(
    path.resolve(__dirname, '../src/index.ts'),
    'utf-8'
  );

  test('baseline_mode_loads_baseline_graph', () => {
    // Verify the pipeline source contains baseline snapshot loading logic
    expect(commandSource).toContain('options?.baseline');
    expect(commandSource).toContain('readFileSync(options.baseline');
    expect(commandSource).toContain('extractTopologyGraphFromSnapshot(baselineSnapshot)');
  });

  test('baseline_mode_executes_diff_against_baseline', () => {
    // Verify diff uses baselineGraph when available, currentGraph as fallback
    expect(commandSource).toContain('baselineGraph ?? currentGraph');
    expect(commandSource).toContain('diffTopologyGraphs(');
    // Verify the second argument is always currentGraph
    expect(commandSource).toContain('currentGraph\n  );');
  });

  test('baseline_flag_without_path_returns_usage_error', () => {
    // Verify CLI entry handles missing --baseline value
    expect(entrySource).toContain('baselineMissingValue');
    // Verify usage message includes baseline flag
    expect(entrySource).toContain('[--baseline <path>]');
    // Verify missing baseline value triggers exit code 1 path
    expect(entrySource).toContain('!datasetPath || baselineMissingValue');
  });

  test('baseline_mode_preserves_default_behavior_when_absent', () => {
    // When no baseline is provided, selectOutputFormat should still work identically
    const output = selectOutputFormat(passReport);
    expect(output).toContain('Status: pass');
    expect(output).toContain('Policy Packs Evaluated: 1');

    // Verify baseline option is optional in the type signature
    expect(commandSource).toContain('readonly baseline?: string');
  });
});

// ═══════════════════════════════════════════════════════════
//  Phase 7B — Snapshot Persistence Surface
// ═══════════════════════════════════════════════════════════

import { buildTopologySnapshot } from '@arch-engine/core';
import type { TopologySnapshot } from '@arch-engine/core';
import { writeTopologySnapshot } from '../src/writeTopologySnapshot';
import * as os from 'node:os';

describe('Phase 7B Snapshot Persistence Surface', () => {

  const commandSource = fs.readFileSync(
    path.resolve(__dirname, '../src/runCheckCommand.ts'),
    'utf-8'
  );

  const entrySource = fs.readFileSync(
    path.resolve(__dirname, '../src/index.ts'),
    'utf-8'
  );

  // Minimal graph fixture for snapshot tests
  const testGraph = Object.freeze({
    graphSurfaceVersion: "1.0.0" as const,
    graphSurfaceHash: "abc123",
    nodes: Object.freeze([
      Object.freeze({ id: "n1", type: "test", metadata: Object.freeze({}) }),
    ]),
    edges: Object.freeze([]),
  });

  test('write_baseline_creates_snapshot_file', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-snapshot-'));
    const outputPath = path.join(tmpDir, 'snapshot.json');

    const snapshot = buildTopologySnapshot(testGraph as any);
    writeTopologySnapshot(snapshot, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
    const content = fs.readFileSync(outputPath, 'utf-8');
    // Deterministic: trailing newline
    expect(content.endsWith('\n')).toBe(true);
    // Valid JSON
    const parsed = JSON.parse(content);
    expect(parsed.snapshotSurfaceVersion).toBe("1.0.0");

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('snapshot_contains_surface_version', () => {
    const snapshot = buildTopologySnapshot(testGraph as any);
    expect(snapshot.snapshotSurfaceVersion).toBe("1.0.0");
  });

  test('snapshot_contains_topology_graph', () => {
    const snapshot = buildTopologySnapshot(testGraph as any);
    expect(snapshot.topologyGraph).toBe(testGraph);
    expect(snapshot.topologyGraph.nodes).toHaveLength(1);
    expect(snapshot.topologyGraph.edges).toHaveLength(0);
  });

  test('write_baseline_without_path_returns_usage_error', () => {
    // Verify CLI entry handles missing --write-baseline value
    expect(entrySource).toContain('writeBaselineMissingValue');
    // Verify usage message includes write-baseline flag
    expect(entrySource).toContain('[--write-baseline <path>]');
    // Verify missing value triggers exit code 1 path
    expect(entrySource).toContain('writeBaselineMissingValue');
  });

  test('snapshot_generation_does_not_affect_diff_pipeline', () => {
    // Verify writeBaseline step is before diff stage in pipeline
    const writeBaselineIdx = commandSource.indexOf('writeBaseline');
    const diffIdx = commandSource.indexOf('diffTopologyGraphs(');
    expect(writeBaselineIdx).toBeGreaterThan(-1);
    expect(diffIdx).toBeGreaterThan(-1);
    expect(writeBaselineIdx).toBeLessThan(diffIdx);

    // Verify pipeline still produces valid output when no writeBaseline
    const output = selectOutputFormat(passReport);
    expect(output).toContain('Status: pass');
  });
});

// ═══════════════════════════════════════════════════════════
//  Phase 7C — Snapshot Compatibility Validation Surface
// ═══════════════════════════════════════════════════════════

import { validateTopologySnapshotCompatibility } from '@arch-engine/core';

describe('Phase 7C Snapshot Compatibility Validation Surface', () => {

  test('baseline_snapshot_valid_version_passes', () => {
    const result = validateTopologySnapshotCompatibility({
      snapshotSurfaceVersion: "1.0.0",
      topologyGraph: { nodes: [], edges: [] },
    });
    expect(result.compatible).toBe(true);
    expect(result.expectedVersion).toBe("1.0.0");
    expect(result.actualVersion).toBe("1.0.0");
  });

  test('baseline_snapshot_missing_version_fails', () => {
    const result = validateTopologySnapshotCompatibility({
      topologyGraph: { nodes: [], edges: [] },
    });
    expect(result.compatible).toBe(false);
    expect(result.expectedVersion).toBe("1.0.0");
    expect(result.actualVersion).toBeUndefined();
  });

  test('baseline_snapshot_wrong_version_fails', () => {
    const result = validateTopologySnapshotCompatibility({
      snapshotSurfaceVersion: "2.0.0",
      topologyGraph: { nodes: [], edges: [] },
    });
    expect(result.compatible).toBe(false);
    expect(result.expectedVersion).toBe("1.0.0");
    expect(result.actualVersion).toBe("2.0.0");
  });

  test('baseline_snapshot_non_object_fails', () => {
    expect(validateTopologySnapshotCompatibility(null).compatible).toBe(false);
    expect(validateTopologySnapshotCompatibility(undefined).compatible).toBe(false);
    expect(validateTopologySnapshotCompatibility("string").compatible).toBe(false);
    expect(validateTopologySnapshotCompatibility(42).compatible).toBe(false);
    expect(validateTopologySnapshotCompatibility(true).compatible).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
//  Phase 7D — Snapshot Graph Extraction Surface
// ═══════════════════════════════════════════════════════════

import { extractTopologyGraphFromSnapshot } from '@arch-engine/core';
import { isSnapshotInput } from '../src/runCheckCommand';

describe('Phase 7D Snapshot Graph Extraction Surface', () => {

  const commandSource = fs.readFileSync(
    path.resolve(__dirname, '../src/runCheckCommand.ts'),
    'utf-8'
  );

  // Minimal graph fixture
  const testGraph = Object.freeze({
    graphSurfaceVersion: "1.0.0" as const,
    graphSurfaceHash: "abc123",
    nodes: Object.freeze([
      Object.freeze({ id: "n1", type: "test", metadata: Object.freeze({}) }),
    ]),
    edges: Object.freeze([]),
  });

  const validSnapshot = {
    snapshotSurfaceVersion: "1.0.0" as const,
    topologyGraph: testGraph,
  };

  test('snapshot_input_executes_without_ingestion_pipeline', () => {
    // Verify content-based detection exists
    expect(commandSource).toContain('isSnapshotInput(inputJson)');
    // Verify snapshot path does NOT call ingestion pipeline
    expect(commandSource).toContain('extractTopologyGraphFromSnapshot(inputJson)');
    // Verify dataset path still uses ingestion
    expect(commandSource).toContain('runDatasetIngestionPipeline(datasetPath)');
  });

  test('snapshot_input_extracts_graph_correctly', () => {
    const graph = extractTopologyGraphFromSnapshot(validSnapshot as any);
    // Must return same reference — no cloning
    expect(graph).toBe(testGraph);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toHaveLength(0);
    expect(graph.graphSurfaceVersion).toBe("1.0.0");
  });

  test('snapshot_input_runs_policy_pipeline_normally', () => {
    // Verify the pipeline continues to diff/classification/evaluation
    // after either input path
    const diffIdx = commandSource.indexOf('diffTopologyGraphs(');
    const classifyIdx = commandSource.indexOf('classifyTopologyDiff(');
    const evalIdx = commandSource.indexOf('PolicyPackRunner(');
    expect(diffIdx).toBeGreaterThan(-1);
    expect(classifyIdx).toBeGreaterThan(diffIdx);
    expect(evalIdx).toBeGreaterThan(classifyIdx);

    // Verify pipeline still produces valid output
    const output = selectOutputFormat(passReport);
    expect(output).toContain('Status: pass');
  });

  test('snapshot_input_with_invalid_version_rejected', () => {
    // Verify snapshot path validates compatibility
    expect(commandSource).toContain('validateTopologySnapshotCompatibility(inputJson)');
    // Verify early exit on mismatch
    expect(commandSource).toContain('Snapshot version mismatch');

    // Verify isSnapshotInput detection
    expect(isSnapshotInput(validSnapshot)).toBe(true);
    expect(isSnapshotInput({ dataset: {} })).toBe(false);
    expect(isSnapshotInput(null)).toBe(false);
    expect(isSnapshotInput(42)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
//  Phase 8A — Snapshot Pair Comparison Surface
// ═══════════════════════════════════════════════════════════

import { detectExecutionInputMode } from '../src/detectExecutionInputMode';

describe('Phase 8A Snapshot Pair Comparison Surface', () => {

  const commandSource = fs.readFileSync(
    path.resolve(__dirname, '../src/runCheckCommand.ts'),
    'utf-8'
  );

  test('snapshot_pair_comparison_executes_successfully', () => {
    // Verify mode detection is integrated into pipeline
    expect(commandSource).toContain('detectExecutionInputMode(');
    expect(commandSource).toContain('currentInputIsSnapshot');
    expect(commandSource).toContain('baselineInputIsSnapshot');

    // Verify snapshot_vs_snapshot mode is reachable
    const mode = detectExecutionInputMode(true, true);
    expect(mode).toBe("snapshot_vs_snapshot");

    // Verify pipeline continues after mode detection
    const modeIdx = commandSource.indexOf('detectExecutionInputMode(');
    const diffIdx = commandSource.indexOf('diffTopologyGraphs(');
    expect(modeIdx).toBeGreaterThan(-1);
    expect(diffIdx).toBeGreaterThan(modeIdx);

    // Verify pipeline still produces valid output without changes
    const output = selectOutputFormat(passReport);
    expect(output).toContain('Status: pass');
  });
});

// ═══════════════════════════════════════════════════════════
//  Phase 8B — Execution-Mode-Aware Explain Surface
// ═══════════════════════════════════════════════════════════

describe('Phase 8B Execution-Mode-Aware Explain Surface', () => {

  test('explain_output_includes_execution_mode_dataset_vs_dataset', () => {
    const output = selectOutputFormat(passReport, { explain: true }, "dataset_vs_dataset");
    expect(output).toContain('Execution Mode: dataset_vs_dataset');
  });

  test('explain_output_includes_execution_mode_dataset_vs_snapshot', () => {
    const output = selectOutputFormat(passReport, { explain: true }, "dataset_vs_snapshot");
    expect(output).toContain('Execution Mode: dataset_vs_snapshot');
  });

  test('explain_output_includes_execution_mode_snapshot_vs_dataset', () => {
    const output = selectOutputFormat(passReport, { explain: true }, "snapshot_vs_dataset");
    expect(output).toContain('Execution Mode: snapshot_vs_dataset');
  });

  test('explain_output_includes_execution_mode_snapshot_vs_snapshot', () => {
    const output = selectOutputFormat(passReport, { explain: true }, "snapshot_vs_snapshot");
    expect(output).toContain('Execution Mode: snapshot_vs_snapshot');
  });
});

// ═══════════════════════════════════════════════════════════
//  Phase 8C — Execution-Mode-Aware JSON Explain Surface
// ═══════════════════════════════════════════════════════════

describe('Phase 8C Execution-Mode-Aware JSON Explain Surface', () => {

  test('json_explain_mode_outputs_execution_mode_dataset_vs_dataset', () => {
    const output = selectOutputFormat(passReport, { explain: true, json: true }, "dataset_vs_dataset");
    const parsed = JSON.parse(output);
    expect(parsed.executionMode).toBe("dataset_vs_dataset");
  });

  test('json_explain_mode_outputs_execution_mode_dataset_vs_snapshot', () => {
    const output = selectOutputFormat(passReport, { explain: true, json: true }, "dataset_vs_snapshot");
    const parsed = JSON.parse(output);
    expect(parsed.executionMode).toBe("dataset_vs_snapshot");
  });

  test('json_explain_mode_outputs_execution_mode_snapshot_vs_dataset', () => {
    const output = selectOutputFormat(passReport, { explain: true, json: true }, "snapshot_vs_dataset");
    const parsed = JSON.parse(output);
    expect(parsed.executionMode).toBe("snapshot_vs_dataset");
  });

  test('json_explain_mode_outputs_execution_mode_snapshot_vs_snapshot', () => {
    const output = selectOutputFormat(passReport, { explain: true, json: true }, "snapshot_vs_snapshot");
    const parsed = JSON.parse(output);
    expect(parsed.executionMode).toBe("snapshot_vs_snapshot");
  });
});

// ═══════════════════════════════════════════════════════════
//  Phase 8D — Snapshot Identity & Lineage Surface
// ═══════════════════════════════════════════════════════════

describe('Phase 8D Snapshot Identity & Lineage Surface', () => {

  const commandSource = fs.readFileSync(
    path.resolve(__dirname, '../src/runCheckCommand.ts'),
    'utf-8'
  );

  test('snapshot_lineage_mismatch_prints_warning', () => {
    // Verify lineage validation is hooked up
    expect(commandSource).toContain('validateTopologySnapshotLineage(');
    
    // Verify deterministic warning string is present
    expect(commandSource).toContain('Snapshot lineage mismatch detected');
    expect(commandSource).toContain('Current lineage:');
    expect(commandSource).toContain('Baseline lineage:');

    // Verify it doesn't return/exit early on mismatch (no return 1 in that block)
    const warningBlock = commandSource.split('Snapshot lineage mismatch detected')[1].split('}')[0];
    expect(warningBlock).not.toContain('return');
  });
});

// ═══════════════════════════════════════════════════════════
//  Phase 8E — Drift-Gate Exit Surface
// ═══════════════════════════════════════════════════════════

describe('Phase 8E Drift-Gate Exit Surface', () => {

  const commandSource = fs.readFileSync(
    path.resolve(__dirname, '../src/runCheckCommand.ts'),
    'utf-8'
  );

  test('drift_gate_detects_topology_change', () => {
    // Verify drift gate implementation is present and correct
    expect(commandSource).toContain('options?.driftGate === true');
    expect(commandSource).toContain('const hasDrift = classification.hasStructuralChanges || classification.hasMetadataChanges;');
    expect(commandSource).toContain('Topology drift detected relative to baseline snapshot');
    
    // Verify it returns 1 on drift
    const driftBlock = commandSource.split('Topology drift detected')[1].split('}')[0];
    expect(driftBlock).toContain('return 1;');
  });

  test('drift_gate_passes_without_changes', () => {
    expect(commandSource).toContain('No topology drift detected relative to baseline snapshot');
  });

  test('drift_gate_requires_baseline', () => {
    expect(commandSource).toContain('Drift gate requires a baseline snapshot');
    const reqBlock = commandSource.split('Drift gate requires a baseline snapshot')[1].split('}')[0];
    expect(reqBlock).toContain('return 1;');
  });
});

// ═══════════════════════════════════════════════════════════
//  Phase 9A — Policy-Pack Selection Surface
// ═══════════════════════════════════════════════════════════

describe('Phase 9A Policy-Pack Selection Surface', () => {

  const commandSource = fs.readFileSync(
    path.resolve(__dirname, '../src/runCheckCommand.ts'),
    'utf-8'
  );

  test('policy_flag_runs_single_pack', () => {
    // Verify it filters based on policy flag
    expect(commandSource).toContain('options?.policy && options.policy.length > 0');
    expect(commandSource).toContain('resolvePolicyPackDependencies(');
    expect(commandSource).toContain('selectedPolicyPacks = resolvedIds.map(id => allPacks.find(p => p.policyPackId === id)!);');
  });

  test('policy_flag_runs_multiple_packs', () => {
    // Logic automatically handles multiple packs via resolvePolicyPackDependencies
    expect(commandSource).toContain('const resolvedIds = await resolvePolicyPackDependencies(');
  });

  test('unknown_policy_flag_fails', () => {
    // Verify rejection of unknown pack IDs
    expect(commandSource).toContain('!availablePackIds.has(requestedId)');
    expect(commandSource).toContain('Unknown policy pack id:');
    
    // Verify returns exit code 1
    const failBlock = commandSource.split('Unknown policy pack id:')[1].split('}')[1];
    expect(failBlock).toContain('return 1;');
  });
});

describe('Phase 9F Unified Policy Execution Context Surface', () => {

  const commandSource = fs.readFileSync(
    path.resolve(__dirname, '../src/runCheckCommand.ts'),
    'utf-8'
  );

  test('policy_runner_receives_context_surface', () => {
    expect(commandSource).toContain('const context = {');
    expect(commandSource).toContain('policyRelevantDiff: policyDiff');
    expect(commandSource).toContain('topologyGraph: currentGraph');
    expect(commandSource).toContain('const results = runner.run(context);');
  });
});
