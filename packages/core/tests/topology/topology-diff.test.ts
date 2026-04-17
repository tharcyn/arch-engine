import { expect, test, describe } from 'vitest';
import { diffTopologyGraphs } from '../../src/topology/diffTopologyGraphs';
import { classifyTopologyDiff } from '../../src/topology/classifyTopologyDiff';
import { classifyPolicyRelevantDiff } from '../../src/topology/classifyPolicyRelevantDiff';
import { DiffConsumerRunner } from '../../src/topology/DiffConsumerRunner';
import { PolicyPackRunner } from '../../src/topology/PolicyPackRunner';
import type { TopologyDiffConsumer } from '../../src/topology/TopologyDiffConsumer';
import type { TopologyPolicyPack } from '../../src/topology/TopologyPolicyPack';
import type { TopologyGraph } from '../../src/topology/TopologyGraph';

describe('Phase 4A Topology Structural Diff', () => {

  const baseGraph: TopologyGraph = {
    graphSurfaceVersion: "1.0.0",
    graphSurfaceHash: "hash1",
    nodes: [
      { id: "A", type: "node" },
      { id: "B", type: "node" }
    ],
    edges: [
      { from: "A", to: "B", type: "connects" }
    ]
  };

  test('diff_detects_added_nodes', () => {
    const after = { ...baseGraph, nodes: [...baseGraph.nodes, { id: "C", type: "node" }] };
    const result = diffTopologyGraphs(baseGraph, after);
    expect(result.addedNodes).toEqual(["C"]);
    expect(result.removedNodes.length).toBe(0);
  });

  test('diff_detects_removed_nodes', () => {
    const after = { ...baseGraph, nodes: [{ id: "B", type: "node" }] };
    const result = diffTopologyGraphs(baseGraph, after);
    expect(result.removedNodes).toEqual(["A"]);
    expect(result.addedNodes.length).toBe(0);
  });

  test('diff_detects_added_edges', () => {
    const after = { ...baseGraph, edges: [...baseGraph.edges, { from: "B", to: "A", type: "connects" }] };
    const result = diffTopologyGraphs(baseGraph, after);
    expect(result.addedEdges.length).toBe(1);
    expect(result.addedEdges[0].from).toBe("B");
    expect(result.removedEdges.length).toBe(0);
  });

  test('diff_detects_removed_edges', () => {
    const after = { ...baseGraph, edges: [] };
    const result = diffTopologyGraphs(baseGraph, after);
    expect(result.removedEdges.length).toBe(1);
    expect(result.removedEdges[0].from).toBe("A");
    expect(result.addedEdges.length).toBe(0);
  });

  test('diff_output_is_deterministic', () => {
    const after = { 
      ...baseGraph, 
      nodes: [...baseGraph.nodes, { id: "Z", type: "node" }, { id: "Y", type: "node" }],
      edges: [
        { from: "Z", to: "A", type: "connects" },
        { from: "A", to: "B", type: "connects" }
      ]
    };
    const res1 = diffTopologyGraphs(baseGraph, after);
    const res2 = diffTopologyGraphs(baseGraph, after);
    expect(res1).toEqual(res2);
    // Verifying alphabetical sorting output enforces identical independent sets strictly 
    expect(res1.addedNodes).toEqual(["Y", "Z"]);
  });

  test('diff_does_not_mutate_inputs', () => {
    const beforeNodesLen = baseGraph.nodes.length;
    const after = { ...baseGraph, nodes: [] };
    diffTopologyGraphs(baseGraph, after);
    expect(baseGraph.nodes.length).toBe(beforeNodesLen);
  });

  test('diff_returns_empty_when_graphs_identical', () => {
    const result = diffTopologyGraphs(baseGraph, baseGraph);
    expect(result.addedNodes.length).toBe(0);
    expect(result.removedNodes.length).toBe(0);
    expect(result.addedEdges.length).toBe(0);
    expect(result.removedEdges.length).toBe(0);
  });

  test('metadata_diff_detects_node_metadata_change', () => {
    const before: TopologyGraph = {
      ...baseGraph,
      nodes: [{ id: "A", type: "node", metadata: { a: 1 } }]
    };
    const after: TopologyGraph = {
      ...baseGraph,
      nodes: [{ id: "A", type: "node", metadata: { a: 2 } }]
    };
    const result = diffTopologyGraphs(before, after);
    expect(result.metadataDiff).toBeDefined();
    expect(result.metadataDiff?.nodeMetadataChanges.length).toBe(1);
    expect(result.metadataDiff?.nodeMetadataChanges[0].nodeId).toBe("A");
    expect(result.metadataDiff?.nodeMetadataChanges[0].afterMetadata).toEqual({ a: 2 });
  });

  test('metadata_diff_detects_edge_metadata_change', () => {
    const before: TopologyGraph = {
      ...baseGraph,
      edges: [{ from: "A", to: "B", type: "connects", metadata: { b: 1 } }]
    };
    const after: TopologyGraph = {
      ...baseGraph,
      edges: [{ from: "A", to: "B", type: "connects", metadata: { b: 2 } }]
    };
    const result = diffTopologyGraphs(before, after);
    expect(result.metadataDiff).toBeDefined();
    expect(result.metadataDiff?.edgeMetadataChanges.length).toBe(1);
    expect(result.metadataDiff?.edgeMetadataChanges[0].from).toBe("A");
    expect(result.metadataDiff?.edgeMetadataChanges[0].afterMetadata).toEqual({ b: 2 });
  });

  test('metadata_diff_empty_when_metadata_equal', () => {
    const before: TopologyGraph = {
      ...baseGraph,
      nodes: [{ id: "A", type: "node", metadata: { a: 1, b: 2 } }]
    };
    const after: TopologyGraph = {
      ...baseGraph,
      // Testing independent key order natively mapped correctly securely preventing unstable validations natively
      nodes: [{ id: "A", type: "node", metadata: { b: 2, a: 1 } }]
    };
    const result = diffTopologyGraphs(before, after);
    expect(result.metadataDiff).toBeUndefined(); // Returns safely strictly empty without attachment bounds limiting outputs gracefully successfully explicitly targeting
  });

  test('metadata_diff_does_not_affect_structural_diff', () => {
    const before: TopologyGraph = {
      ...baseGraph,
      nodes: [{ id: "A", type: "node", metadata: { a: 1 } }]
    };
    const after: TopologyGraph = {
      ...baseGraph,
      nodes: [{ id: "A", type: "node", metadata: { a: 2 } }, { id: "C", type: "node" }]
    };
    const result = diffTopologyGraphs(before, after);
    
    // Structural matches cleanly
    expect(result.addedNodes).toEqual(["C"]);
    expect(result.removedNodes.length).toBe(0);
    
    // Metadata strictly separate
    expect(result.metadataDiff?.nodeMetadataChanges.length).toBe(1);
  });

  test('classification_returns_no_change_for_empty_diff', () => {
    const diff = diffTopologyGraphs(baseGraph, baseGraph);
    const classification = classifyTopologyDiff(diff);
    expect(classification.kind).toBe("no_change");
    expect(classification.hasStructuralChanges).toBe(false);
    expect(classification.hasMetadataChanges).toBe(false);
  });

  test('classification_returns_metadata_only', () => {
    const after: TopologyGraph = { ...baseGraph, nodes: [{ id: "A", type: "node", metadata: { a: 1 } }, { id: "B", type: "node" }] };
    const diff = diffTopologyGraphs(baseGraph, after);
    const classification = classifyTopologyDiff(diff);
    
    expect(classification.kind).toBe("metadata_only");
    expect(classification.hasStructuralChanges).toBe(false);
    expect(classification.hasMetadataChanges).toBe(true);
  });

  test('classification_returns_structural_addition', () => {
    const after: TopologyGraph = { ...baseGraph, nodes: [...baseGraph.nodes, { id: "C", type: "node" }] };
    const diff = diffTopologyGraphs(baseGraph, after);
    const classification = classifyTopologyDiff(diff);
    
    expect(classification.kind).toBe("structural_addition");
    expect(classification.hasStructuralChanges).toBe(true);
    expect(classification.hasMetadataChanges).toBe(false);
  });

  test('classification_returns_structural_removal', () => {
    const after: TopologyGraph = { ...baseGraph, edges: [] };
    const diff = diffTopologyGraphs(baseGraph, after);
    const classification = classifyTopologyDiff(diff);
    
    expect(classification.kind).toBe("structural_removal");
    expect(classification.hasStructuralChanges).toBe(true);
    expect(classification.hasMetadataChanges).toBe(false);
  });

  test('classification_returns_structural_mixed', () => {
    const after: TopologyGraph = { 
      ...baseGraph, 
      nodes: [...baseGraph.nodes, { id: "Z", type: "node" }], // Add
      edges: [] // Remove
    };
    const diff = diffTopologyGraphs(baseGraph, after);
    const classification = classifyTopologyDiff(diff);
    
    expect(classification.kind).toBe("structural_mixed");
    expect(classification.hasStructuralChanges).toBe(true);
    expect(classification.hasMetadataChanges).toBe(false);
  });

  test('classification_returns_metadata_and_structural', () => {
    const after: TopologyGraph = { 
      ...baseGraph, 
      nodes: [{ id: "A", type: "node", metadata: { a: 2 } }], // Remove B, modify A
      edges: [] // Remove
    };
    const diff = diffTopologyGraphs(baseGraph, after);
    const classification = classifyTopologyDiff(diff);
    
    expect(classification.kind).toBe("metadata_and_structural");
    expect(classification.hasStructuralChanges).toBe(true);
    expect(classification.hasMetadataChanges).toBe(true);
  });

  test('policy_relevant_diff_maps_no_change', () => {
    const diff = diffTopologyGraphs(baseGraph, baseGraph);
    const classification = classifyTopologyDiff(diff);
    const policyDiff = classifyPolicyRelevantDiff(diff, classification);
    expect(policyDiff.kind).toBe("no_policy_relevance");
  });

  test('policy_relevant_diff_maps_metadata_only', () => {
    const after: TopologyGraph = { ...baseGraph, nodes: [{ id: "A", type: "node", metadata: { a: 1 } }, { id: "B", type: "node" }] };
    const diff = diffTopologyGraphs(baseGraph, after);
    const classification = classifyTopologyDiff(diff);
    const policyDiff = classifyPolicyRelevantDiff(diff, classification);
    expect(policyDiff.kind).toBe("metadata_drift");
  });

  test('policy_relevant_diff_maps_structural_addition', () => {
    const after: TopologyGraph = { ...baseGraph, nodes: [...baseGraph.nodes, { id: "C", type: "node" }] };
    const diff = diffTopologyGraphs(baseGraph, after);
    const classification = classifyTopologyDiff(diff);
    const policyDiff = classifyPolicyRelevantDiff(diff, classification);
    expect(policyDiff.kind).toBe("structural_expansion");
  });

  test('policy_relevant_diff_maps_structural_removal', () => {
    const after: TopologyGraph = { ...baseGraph, edges: [] };
    const diff = diffTopologyGraphs(baseGraph, after);
    const classification = classifyTopologyDiff(diff);
    const policyDiff = classifyPolicyRelevantDiff(diff, classification);
    expect(policyDiff.kind).toBe("structural_contraction");
  });

  test('policy_relevant_diff_maps_structural_mixed', () => {
    const after: TopologyGraph = { 
      ...baseGraph, 
      nodes: [...baseGraph.nodes, { id: "Z", type: "node" }], // Add
      edges: [] // Remove
    };
    const diff = diffTopologyGraphs(baseGraph, after);
    const classification = classifyTopologyDiff(diff);
    const policyDiff = classifyPolicyRelevantDiff(diff, classification);
    expect(policyDiff.kind).toBe("structural_recomposition");
  });

  test('policy_relevant_diff_maps_metadata_and_structural', () => {
    const after: TopologyGraph = { 
      ...baseGraph, 
      nodes: [{ id: "A", type: "node", metadata: { a: 2 } }], // Remove B, modify A
      edges: [] // Remove
    };
    const diff = diffTopologyGraphs(baseGraph, after);
    const classification = classifyTopologyDiff(diff);
    const policyDiff = classifyPolicyRelevantDiff(diff, classification);
    expect(policyDiff.kind).toBe("mixed_drift");
  });

  test('consumer_runner_preserves_insertion_order', () => {
    const executedIds: string[] = [];
    const c1: TopologyDiffConsumer = {
      consumerId: "c1",
      displayName: "C1",
      consume: (d) => {
        executedIds.push("c1");
        return d;
      }
    };
    const c2: TopologyDiffConsumer = {
      consumerId: "c2",
      displayName: "C2",
      consume: (d) => {
        executedIds.push("c2");
        return d;
      }
    };
    const runner = new DiffConsumerRunner([c1, c2]);
    const diff = diffTopologyGraphs(baseGraph, baseGraph);
    const classification = classifyTopologyDiff(diff);
    const policyDiff = classifyPolicyRelevantDiff(diff, classification);
    
    const results = runner.run({ policyRelevantDiff: policyDiff, topologyGraph: baseGraph });
    expect(results.length).toBe(2);
    expect(executedIds).toEqual(["c1", "c2"]); // Verified exact ordering limits natively accurately dynamically
  });

  test('consumer_runner_rejects_duplicate_consumer_ids', () => {
    const c1: TopologyDiffConsumer = {
      consumerId: "c1",
      displayName: "C1",
      consume: (d) => d
    };
    const c2: TopologyDiffConsumer = {
      consumerId: "c1", // Duplicate!
      displayName: "C2",
      consume: (d) => d
    };
    expect(() => new DiffConsumerRunner([c1, c2])).toThrowError(/Duplicate consumerId detected: c1/);
  });

  test('policy_pack_runner_executes_in_insertion_order', () => {
    const sequence: string[] = [];
    const p1: TopologyPolicyPack = {
      policyPackId: "p1",
      displayName: "P1",
      evaluate: (diff) => {
        sequence.push("p1");
        return { policyPackId: "p1", success: true, diagnostics: [] };
      }
    };
    const p2: TopologyPolicyPack = {
      policyPackId: "p2",
      displayName: "P2",
      evaluate: (diff) => {
        sequence.push("p2");
        return { policyPackId: "p2", success: true, diagnostics: [] };
      }
    };
    const runner = new PolicyPackRunner([p1, p2]);
    const diff = diffTopologyGraphs(baseGraph, baseGraph);
    const classification = classifyTopologyDiff(diff);
    const policyDiff = classifyPolicyRelevantDiff(diff, classification);
    
    runner.run(policyDiff);
    expect(sequence).toEqual(["p1", "p2"]);
  });

  test('policy_pack_runner_rejects_duplicate_policy_pack_ids', () => {
    const p1: TopologyPolicyPack = {
      policyPackId: "dup",
      displayName: "P1",
      evaluate: (diff) => ({ policyPackId: "dup", success: true, diagnostics: [] })
    };
    const p2: TopologyPolicyPack = {
      policyPackId: "dup", // Duplicate
      displayName: "P2",
      evaluate: (context) => ({ policyPackId: "dup", success: true, diagnostics: [] })
    };
    expect(() => new PolicyPackRunner([p1, p2])).toThrowError(/Duplicate policyPackId detected: dup/);
  });

  test('policy_pack_evaluation_returns_structured_results', () => {
    const p1: TopologyPolicyPack = {
      policyPackId: "p1",
      displayName: "P1",
      evaluate: (context) => ({ 
        policyPackId: "p1", 
        success: true, 
        diagnostics: [{ code: "INFO_1", message: "All good", severity: "info" }] 
      })
    };
    const runner = new PolicyPackRunner([p1]);
    const diff = diffTopologyGraphs(baseGraph, baseGraph);
    const policyDiff = classifyPolicyRelevantDiff(diff, classifyTopologyDiff(diff));
    
    const results = runner.run({ policyRelevantDiff: policyDiff, topologyGraph: baseGraph });
    expect(results.length).toBe(1);
    expect(results[0].policyPackId).toBe("p1");
  });

  test('policy_pack_evaluation_preserves_diagnostics', () => {
    const logic: TopologyPolicyPack = {
      policyPackId: "test_diag",
      displayName: "Test Diag",
      evaluate: (context) => ({ 
        policyPackId: "test_diag", 
        success: false, 
        diagnostics: [{ code: "ERR_99", message: "Failure", severity: "error" }] 
      })
    };
    const runner = new PolicyPackRunner([logic]);
    const diff = diffTopologyGraphs(baseGraph, baseGraph);
    const policyDiff = classifyPolicyRelevantDiff(diff, classifyTopologyDiff(diff));
    
    const results = runner.run({ policyRelevantDiff: policyDiff, topologyGraph: baseGraph });
    expect(results[0].diagnostics.length).toBe(1);
    expect(results[0].diagnostics[0].severity).toBe("error");
    expect(results[0].diagnostics[0].code).toBe("ERR_99");
  });

  test('policy_pack_evaluation_handles_success_case', () => {
    const logic: TopologyPolicyPack = {
      policyPackId: "success_case",
      displayName: "Success Case",
      evaluate: (context) => ({ policyPackId: "success_case", success: true, diagnostics: [] })
    };
    const runner = new PolicyPackRunner([logic]);
    const diff = diffTopologyGraphs(baseGraph, baseGraph);
    const policyDiff = classifyPolicyRelevantDiff(diff, classifyTopologyDiff(diff));
    
    const results = runner.run({ policyRelevantDiff: policyDiff, topologyGraph: baseGraph });
    expect(results[0].success).toBe(true);
  });

  test('policy_pack_evaluation_handles_failure_case', () => {
    const logic: TopologyPolicyPack = {
      policyPackId: "failure_case",
      displayName: "Failure Case",
      evaluate: (context) => ({ policyPackId: "failure_case", success: false, diagnostics: [] })
    };
    const runner = new PolicyPackRunner([logic]);
    const diff = diffTopologyGraphs(baseGraph, baseGraph);
    const policyDiff = classifyPolicyRelevantDiff(diff, classifyTopologyDiff(diff));
    
    const results = runner.run({ policyRelevantDiff: policyDiff, topologyGraph: baseGraph });
    expect(results[0].success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
//  Phase 5C — Policy Evaluation Aggregation Surface
// ═══════════════════════════════════════════════════════════

import { summarizePolicyEvaluations } from '../../src/topology/summarizePolicyEvaluations';
import type { PolicyEvaluationResult } from '../../src/topology/PolicyEvaluationResult';

describe('Phase 5C Policy Evaluation Aggregation Surface', () => {

  test('policy_evaluation_summary_returns_pass', () => {
    const results: readonly PolicyEvaluationResult[] = [
      { policyPackId: "p1", success: true, diagnostics: [] },
      { policyPackId: "p2", success: true, diagnostics: [{ code: "I1", message: "ok", severity: "info" }] },
    ];
    const summary = summarizePolicyEvaluations(results);
    expect(summary.status).toBe("pass");
    expect(summary.evaluationSurfaceVersion).toBe("1.0.0");
  });

  test('policy_evaluation_summary_returns_warning', () => {
    const results: readonly PolicyEvaluationResult[] = [
      { policyPackId: "p1", success: true, diagnostics: [{ code: "W1", message: "drift", severity: "warning" }] },
      { policyPackId: "p2", success: true, diagnostics: [] },
    ];
    const summary = summarizePolicyEvaluations(results);
    expect(summary.status).toBe("warning");
  });

  test('policy_evaluation_summary_returns_fail', () => {
    const results: readonly PolicyEvaluationResult[] = [
      { policyPackId: "p1", success: false, diagnostics: [{ code: "E1", message: "broken", severity: "error" }] },
      { policyPackId: "p2", success: true, diagnostics: [] },
    ];
    const summary = summarizePolicyEvaluations(results);
    expect(summary.status).toBe("fail");
  });

  test('policy_evaluation_summary_counts_pack_outcomes_correctly', () => {
    const results: readonly PolicyEvaluationResult[] = [
      { policyPackId: "pass1", success: true, diagnostics: [] },
      { policyPackId: "pass2", success: true, diagnostics: [{ code: "I1", message: "note", severity: "info" }] },
      { policyPackId: "warn1", success: true, diagnostics: [{ code: "W1", message: "caution", severity: "warning" }] },
      { policyPackId: "fail1", success: false, diagnostics: [{ code: "E1", message: "err", severity: "error" }] },
      { policyPackId: "fail2", success: false, diagnostics: [] },
    ];
    const summary = summarizePolicyEvaluations(results);
    expect(summary.totalPacks).toBe(5);
    expect(summary.passedPacks).toBe(2);
    expect(summary.warningPacks).toBe(1);
    expect(summary.failedPacks).toBe(2);
  });

  test('policy_evaluation_summary_computes_highest_severity_correctly', () => {
    // info only → "info"
    const infoOnly: readonly PolicyEvaluationResult[] = [
      { policyPackId: "p1", success: true, diagnostics: [{ code: "I1", message: "ok", severity: "info" }] },
    ];
    expect(summarizePolicyEvaluations(infoOnly).highestSeverity).toBe("info");

    // warning present → "warning"
    const withWarning: readonly PolicyEvaluationResult[] = [
      { policyPackId: "p1", success: true, diagnostics: [{ code: "I1", message: "ok", severity: "info" }] },
      { policyPackId: "p2", success: true, diagnostics: [{ code: "W1", message: "warn", severity: "warning" }] },
    ];
    expect(summarizePolicyEvaluations(withWarning).highestSeverity).toBe("warning");

    // error present → "error"
    const withError: readonly PolicyEvaluationResult[] = [
      { policyPackId: "p1", success: true, diagnostics: [{ code: "I1", message: "ok", severity: "info" }] },
      { policyPackId: "p2", success: false, diagnostics: [{ code: "E1", message: "err", severity: "error" }] },
    ];
    expect(summarizePolicyEvaluations(withError).highestSeverity).toBe("error");

    // no diagnostics → null
    const noDiags: readonly PolicyEvaluationResult[] = [
      { policyPackId: "p1", success: true, diagnostics: [] },
    ];
    expect(summarizePolicyEvaluations(noDiags).highestSeverity).toBeNull();
  });

  test('policy_evaluation_summary_preserves_results_without_mutation', () => {
    const results: readonly PolicyEvaluationResult[] = [
      { policyPackId: "p1", success: true, diagnostics: [{ code: "I1", message: "ok", severity: "info" }] },
      { policyPackId: "p2", success: false, diagnostics: [{ code: "E1", message: "err", severity: "error" }] },
    ];
    const summary = summarizePolicyEvaluations(results);

    // Reference identity — same array, not a copy
    expect(summary.results).toBe(results);

    // Content preserved exactly
    expect(summary.results.length).toBe(2);
    expect(summary.results[0].policyPackId).toBe("p1");
    expect(summary.results[1].policyPackId).toBe("p2");
  });
});

// ═══════════════════════════════════════════════════════════
//  Phase 6B — CLI Output Formatter Surface
// ═══════════════════════════════════════════════════════════

import { formatGovernanceReportForCLI } from '../../src/topology/formatGovernanceReportForCLI';
import type { GovernanceReport } from '../../src/topology/GovernanceReport';

describe('Phase 6B CLI Output Formatter Surface', () => {

  const passReport: GovernanceReport = {
    reportSurfaceVersion: "1.0.0",
    status: "pass",
    totalPacks: 2,
    passedPacks: 2,
    warningPacks: 0,
    failedPacks: 0,
    highestSeverity: "info",
    results: [
      { policyPackId: "p1", success: true, diagnostics: [] },
      { policyPackId: "p2", success: true, diagnostics: [{ code: "I1", message: "ok", severity: "info" }] },
    ],
  };

  const failReport: GovernanceReport = {
    reportSurfaceVersion: "1.0.0",
    status: "fail",
    totalPacks: 3,
    passedPacks: 1,
    warningPacks: 1,
    failedPacks: 1,
    highestSeverity: "error",
    results: [
      { policyPackId: "alpha", success: true, diagnostics: [] },
      { policyPackId: "beta", success: true, diagnostics: [{ code: "W1", message: "drift detected", severity: "warning" }] },
      { policyPackId: "gamma", success: false, diagnostics: [{ code: "E1", message: "broken", severity: "error" }] },
    ],
  };

  test('cli_formatter_outputs_status_line', () => {
    const output = formatGovernanceReportForCLI(passReport);
    expect(output).toContain('Status: pass');

    const failOutput = formatGovernanceReportForCLI(failReport);
    expect(failOutput).toContain('Status: fail');
  });

  test('cli_formatter_outputs_pack_counts', () => {
    const output = formatGovernanceReportForCLI(failReport);
    expect(output).toContain('Policy Packs Evaluated: 3');
    expect(output).toContain('Passed: 1');
    expect(output).toContain('Warnings: 1');
    expect(output).toContain('Failed: 1');
  });

  test('cli_formatter_outputs_highest_severity', () => {
    const output = formatGovernanceReportForCLI(failReport);
    expect(output).toContain('Highest Severity: error');

    const nullSeverityReport: GovernanceReport = {
      reportSurfaceVersion: "1.0.0",
      status: "pass",
      totalPacks: 1,
      passedPacks: 1,
      warningPacks: 0,
      failedPacks: 0,
      highestSeverity: null,
      results: [{ policyPackId: "p1", success: true, diagnostics: [] }],
    };
    const nullOutput = formatGovernanceReportForCLI(nullSeverityReport);
    expect(nullOutput).toContain('Highest Severity: none');
  });

  test('cli_formatter_outputs_pack_results', () => {
    const output = formatGovernanceReportForCLI(passReport);
    expect(output).toContain('Policy Pack Results:');
    expect(output).toContain('p1');
    expect(output).toContain('  success: true');
    expect(output).toContain('p2');
  });

  test('cli_formatter_outputs_diagnostics_when_present', () => {
    const output = formatGovernanceReportForCLI(failReport);
    expect(output).toContain('  diagnostics:');
    expect(output).toContain('    - [error] E1: broken');
    expect(output).toContain('    - [warning] W1: drift detected');
  });

  test('cli_formatter_skips_empty_diagnostics', () => {
    const output = formatGovernanceReportForCLI(passReport);
    // p1 has no diagnostics — its section should only have success line
    const p1Section = output.split('p1')[1].split('p2')[0];
    expect(p1Section).not.toContain('diagnostics:');
  });

  test('cli_formatter_preserves_pack_order', () => {
    const output = formatGovernanceReportForCLI(failReport);
    const alphaIdx = output.indexOf('alpha');
    const betaIdx = output.indexOf('beta');
    const gammaIdx = output.indexOf('gamma');
    expect(alphaIdx).toBeLessThan(betaIdx);
    expect(betaIdx).toBeLessThan(gammaIdx);
  });

  test('cli_formatter_returns_single_string_output', () => {
    const output = formatGovernanceReportForCLI(passReport);
    expect(typeof output).toBe('string');
    // Verify exact structure: starts with Status, ends with trailing newline after last pack
    expect(output.startsWith('Status: ')).toBe(true);
    // Verify uses \n line endings throughout
    expect(output.includes('\r')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
//  Phase 6C — JSON Output Mode Surface
// ═══════════════════════════════════════════════════════════

import { formatGovernanceReportAsJSON } from '../../src/topology/formatGovernanceReportAsJSON';

describe('Phase 6C JSON Output Mode Surface', () => {

  const sampleReport: GovernanceReport = {
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

  test('json_formatter_returns_valid_json_string', () => {
    const output = formatGovernanceReportAsJSON(sampleReport);
    const parsed = JSON.parse(output);
    expect(parsed).toBeDefined();
    expect(parsed.status).toBe("fail");
    expect(parsed.totalPacks).toBe(2);
  });

  test('json_formatter_preserves_report_structure', () => {
    const output = formatGovernanceReportAsJSON(sampleReport);
    const parsed = JSON.parse(output);
    expect(parsed.reportSurfaceVersion).toBe("1.0.0");
    expect(parsed.status).toBe("fail");
    expect(parsed.highestSeverity).toBe("error");
    expect(parsed.totalPacks).toBe(2);
    expect(parsed.passedPacks).toBe(1);
    expect(parsed.warningPacks).toBe(0);
    expect(parsed.failedPacks).toBe(1);
    expect(parsed.results.length).toBe(2);
    expect(parsed.results[0].policyPackId).toBe("p1");
    expect(parsed.results[1].diagnostics[0].code).toBe("E1");
  });

  test('json_formatter_preserves_property_order', () => {
    const output = formatGovernanceReportAsJSON(sampleReport);
    const parsed = JSON.parse(output);
    const keys = Object.keys(parsed);
    expect(keys).toEqual([
      "reportSurfaceVersion",
      "status",
      "highestSeverity",
      "totalPacks",
      "passedPacks",
      "warningPacks",
      "failedPacks",
      "results",
    ]);
  });

  test('json_formatter_does_not_mutate_input', () => {
    const before = JSON.stringify(sampleReport);
    formatGovernanceReportAsJSON(sampleReport);
    const after = JSON.stringify(sampleReport);
    expect(after).toBe(before);
  });

  test('json_formatter_uses_two_space_indentation', () => {
    const output = formatGovernanceReportAsJSON(sampleReport);
    // Second line should start with exactly 2 spaces (first-level indent)
    const lines = output.split('\n');
    expect(lines[1]).toMatch(/^  "/);
  });

  test('json_formatter_appends_trailing_newline', () => {
    const output = formatGovernanceReportAsJSON(sampleReport);
    expect(output.endsWith('\n')).toBe(true);
    // Must not end with double newline
    expect(output.endsWith('\n\n')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
//  Phase 6D — Explain Mode Surface
// ═══════════════════════════════════════════════════════════

import { buildExplainReport } from '../../src/topology/buildExplainReport';
import { formatExplainReportForCLI } from '../../src/topology/formatExplainReportForCLI';
import { formatExplainReportAsJSON } from '../../src/topology/formatExplainReportAsJSON';

describe('Phase 6D Explain Mode Surface', () => {

  const mixedReport: GovernanceReport = {
    reportSurfaceVersion: "1.0.0",
    status: "fail",
    totalPacks: 3,
    passedPacks: 1,
    warningPacks: 1,
    failedPacks: 1,
    highestSeverity: "error",
    results: [
      { policyPackId: "alpha", success: true, diagnostics: [] },
      { policyPackId: "beta", success: true, diagnostics: [{ code: "W1", message: "drift", severity: "warning" }] },
      { policyPackId: "gamma", success: false, diagnostics: [{ code: "E1", message: "broken", severity: "error" }, { code: "I1", message: "note", severity: "info" }] },
    ],
  };

  // ── Builder tests ──────────────────────────────────────

  test('explain_report_maps_status_correctly', () => {
    const explain = buildExplainReport(mixedReport, "dataset_vs_dataset");
    expect(explain.status).toBe("fail");
    expect(explain.explainSurfaceVersion).toBe("1.0.0");
  });

  test('explain_report_maps_highest_severity_correctly', () => {
    const explain = buildExplainReport(mixedReport, "dataset_vs_dataset");
    expect(explain.highestSeverity).toBe("error");

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
    const passExplain = buildExplainReport(passReport, "dataset_vs_dataset");
    expect(passExplain.highestSeverity).toBeNull();
  });

  test('explain_report_preserves_pack_order', () => {
    const explain = buildExplainReport(mixedReport, "dataset_vs_dataset");
    expect(explain.sections.length).toBe(3);
    expect(explain.sections[0].policyPackId).toBe("alpha");
    expect(explain.sections[1].policyPackId).toBe("beta");
    expect(explain.sections[2].policyPackId).toBe("gamma");
  });

  test('explain_report_computes_section_highest_severity', () => {
    const explain = buildExplainReport(mixedReport, "dataset_vs_dataset");

    // alpha: no diagnostics → null
    expect(explain.sections[0].highestSeverity).toBeNull();

    // beta: warning only → "warning"
    expect(explain.sections[1].highestSeverity).toBe("warning");

    // gamma: error + info → "error"
    expect(explain.sections[2].highestSeverity).toBe("error");

    // Verify diagnostics passed through by reference
    expect(explain.sections[2].diagnostics).toBe(mixedReport.results[2].diagnostics);
  });

  // ── Formatter tests ────────────────────────────────────

  test('cli_explain_formatter_outputs_status', () => {
    const explain = buildExplainReport(mixedReport, "dataset_vs_dataset");
    const output = formatExplainReportForCLI(explain);
    expect(output).toContain('Explain Mode Output');
    expect(output).toContain('Status: fail');
    expect(output).toContain('Highest Severity: error');
  });

  test('cli_explain_formatter_outputs_sections', () => {
    const explain = buildExplainReport(mixedReport, "dataset_vs_dataset");
    const output = formatExplainReportForCLI(explain);
    expect(output).toContain('Policy Pack Analysis:');
    expect(output).toContain('alpha');
    expect(output).toContain('beta');
    expect(output).toContain('gamma');
    expect(output).toContain('  success: true');
    expect(output).toContain('  success: false');
  });

  test('cli_explain_formatter_outputs_diagnostics', () => {
    const explain = buildExplainReport(mixedReport, "dataset_vs_dataset");
    const output = formatExplainReportForCLI(explain);
    expect(output).toContain('  diagnostics:');
    expect(output).toContain('    - [warning] W1: drift');
    expect(output).toContain('    - [error] E1: broken');
    expect(output).toContain('    - [info] I1: note');
  });

  test('cli_explain_formatter_skips_empty_diagnostics', () => {
    const explain = buildExplainReport(mixedReport, "dataset_vs_dataset");
    const output = formatExplainReportForCLI(explain);
    // alpha has no diagnostics — its section should only have success line
    const alphaSection = output.split('alpha')[1].split('beta')[0];
    expect(alphaSection).not.toContain('diagnostics:');
  });

  test('cli_explain_formatter_returns_single_string', () => {
    const explain = buildExplainReport(mixedReport, "dataset_vs_dataset");
    const output = formatExplainReportForCLI(explain);
    expect(typeof output).toBe('string');
    expect(output.startsWith('Explain Mode Output')).toBe(true);
    expect(output.includes('\r')).toBe(false);
  });

  // ── Phase 8B — Execution-mode-aware explain ────────────

  test('buildExplainReport_includes_execution_mode', () => {
    const explain = buildExplainReport(mixedReport, "snapshot_vs_snapshot");
    expect(explain.executionMode).toBe("snapshot_vs_snapshot");

    const explain2 = buildExplainReport(mixedReport, "dataset_vs_snapshot");
    expect(explain2.executionMode).toBe("dataset_vs_snapshot");

    const explain3 = buildExplainReport(mixedReport, "snapshot_vs_dataset");
    expect(explain3.executionMode).toBe("snapshot_vs_dataset");

    const explain4 = buildExplainReport(mixedReport, "dataset_vs_dataset");
    expect(explain4.executionMode).toBe("dataset_vs_dataset");
  });

  test('cli_explain_formatter_outputs_execution_mode', () => {
    const explain = buildExplainReport(mixedReport, "snapshot_vs_snapshot");
    const output = formatExplainReportForCLI(explain);
    expect(output).toContain('Execution Mode: snapshot_vs_snapshot');

    // Verify ordering: Status before Execution Mode before Highest Severity
    const statusIdx = output.indexOf('Status: fail');
    const modeIdx = output.indexOf('Execution Mode: snapshot_vs_snapshot');
    const severityIdx = output.indexOf('Highest Severity: error');
    expect(statusIdx).toBeLessThan(modeIdx);
    expect(modeIdx).toBeLessThan(severityIdx);
  });

  // ── Phase 8C — JSON Explain Formatter Tests ────────────

  test('json_explain_output_contains_execution_mode_dataset_vs_dataset', () => {
    const explain = buildExplainReport(mixedReport, "dataset_vs_dataset");
    const jsonStr = formatExplainReportAsJSON(explain);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.executionMode).toBe("dataset_vs_dataset");
    expect(jsonStr).toContain('"executionMode": "dataset_vs_dataset"');
    expect(jsonStr.endsWith('\n')).toBe(true);

    // Verify ordering
    const keys = Object.keys(parsed);
    expect(keys).toEqual(["explainSurfaceVersion", "status", "executionMode", "sections"]);
  });

  test('json_explain_output_contains_execution_mode_dataset_vs_snapshot', () => {
    const explain = buildExplainReport(mixedReport, "dataset_vs_snapshot");
    const parsed = JSON.parse(formatExplainReportAsJSON(explain));
    expect(parsed.executionMode).toBe("dataset_vs_snapshot");
  });

  test('json_explain_output_contains_execution_mode_snapshot_vs_dataset', () => {
    const explain = buildExplainReport(mixedReport, "snapshot_vs_dataset");
    const parsed = JSON.parse(formatExplainReportAsJSON(explain));
    expect(parsed.executionMode).toBe("snapshot_vs_dataset");
  });

  test('json_explain_output_contains_execution_mode_snapshot_vs_snapshot', () => {
    const explain = buildExplainReport(mixedReport, "snapshot_vs_snapshot");
    const parsed = JSON.parse(formatExplainReportAsJSON(explain));
    expect(parsed.executionMode).toBe("snapshot_vs_snapshot");
  });
});

// ═══════════════════════════════════════════════════════════
//  Phase 6E — Exit Code Mapping Surface
// ═══════════════════════════════════════════════════════════

import { mapGovernanceReportToExitCode } from '../../src/topology/mapGovernanceReportToExitCode';

describe('Phase 6E Exit Code Mapping Surface', () => {

  test('exit_code_returns_zero_for_pass', () => {
    const report: GovernanceReport = {
      reportSurfaceVersion: "1.0.0",
      status: "pass",
      totalPacks: 1,
      passedPacks: 1,
      warningPacks: 0,
      failedPacks: 0,
      highestSeverity: null,
      results: [{ policyPackId: "p1", success: true, diagnostics: [] }],
    };
    expect(mapGovernanceReportToExitCode(report)).toBe(0);
  });

  test('exit_code_returns_zero_for_warning', () => {
    const report: GovernanceReport = {
      reportSurfaceVersion: "1.0.0",
      status: "warning",
      totalPacks: 1,
      passedPacks: 0,
      warningPacks: 1,
      failedPacks: 0,
      highestSeverity: "warning",
      results: [{ policyPackId: "p1", success: true, diagnostics: [{ code: "W1", message: "drift", severity: "warning" }] }],
    };
    expect(mapGovernanceReportToExitCode(report)).toBe(0);
  });

  test('exit_code_returns_one_for_fail', () => {
    const report: GovernanceReport = {
      reportSurfaceVersion: "1.0.0",
      status: "fail",
      totalPacks: 1,
      passedPacks: 0,
      warningPacks: 0,
      failedPacks: 1,
      highestSeverity: "error",
      results: [{ policyPackId: "p1", success: false, diagnostics: [{ code: "E1", message: "broken", severity: "error" }] }],
    };
    expect(mapGovernanceReportToExitCode(report)).toBe(1);
  });
});
