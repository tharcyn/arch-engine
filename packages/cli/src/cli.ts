import { cac } from 'cac';
import pc from 'picocolors';
import { createRequire } from 'module';

export async function run() {
  const cli = cac('arch-engine');

  // ─── Global Options ────────────────────────────────────────

  cli.option('--json', 'Output results as JSON');
  cli.option('--no-color', 'Disable colorized output');

  // ─── The Progressive Trust Ladder ──────────────────────────

  // 1. Doctor (Environment Confidence)
  cli
    .command('doctor', 'Diagnose environment readiness and existing adapter usage')
    .action(async (options) => {
      // Deferring loading to actual command file
      const { doctorCommand } = await import('./commands/doctor.js');
      await doctorCommand(options);
    });

  // 2. Inspect (Topology Confidence)
  cli
    .command('inspect', 'Output canonical topology summary without executing violations')
    .action(async (options) => {
      const { inspectCommand } = await import('./commands/inspect.js');
      await inspectCommand(options);
    });

  // 3. Analyze (Discovery & Insights)
  cli
    .command('analyze', 'Emit stability score, conflict ratios, and blast radius summary')
    .action(async (options) => {
      const { analyzeCommand } = await import('./commands/analyze.js');
      await analyzeCommand(options);
    });

  // 4. Check (Violation Detection)
  cli
    .command('check', 'Execute architecture pipeline and evaluate boundaries')
    .option('--min-coverage <percentage>', 'Require a minimum topology coverage percentage (0.0-1.0)')
    .option('--sync', 'Emit SaaS synchronization session locally')
    .action(async (options) => {
      const { checkCommand } = await import('./commands/check.js');
      await checkCommand(options);
    });

  // 5. Explain (Reasoning Transparency)
  cli
    .command('explain <target>', 'Explain WHY a violation occurred or HOW confidence propagated')
    .action(async (target, options) => {
      const { explainCommand } = await import('./commands/explain.js');
      await explainCommand(target, options);
    });

  // 6. GitHub
  cli
    .command('github create-policy-pr [file]', 'Create a GitHub PR from a policy patch payload')
    .option('--execute', 'Execute the live pull request creation')
    .option('--dry-run', 'Dry-run execution plan (default)')
    .option('--json-output-plan', 'Output structured execution plan as JSON')
    .action(async (file, options) => {
      const { githubCreatePolicyPrCommand } = await import('./githubCreatePolicyPrCommand.js');
      const args: string[] = [];
      if (options.execute) args.push('--execute');
      else if (options.dryRun) args.push('--dry-run');
      if (options.jsonOutputPlan) args.push('--json-output-plan');
      if (file) args.push(file);
      await githubCreatePolicyPrCommand(args);
    });

  // 7. GitLab
  cli
    .command('gitlab create-policy-mr [file]', 'Create a GitLab MR from a policy patch payload')
    .option('--execute', 'Execute the live merge request creation')
    .option('--dry-run', 'Dry-run execution plan (default)')
    .option('--json-output-plan', 'Output structured execution plan as JSON')
    .action(async (file, options) => {
      const { gitlabCreatePolicyMrCommand } = await import('./gitlabCreatePolicyMrCommand.js');
      const args: string[] = [];
      if (options.execute) args.push('--execute');
      else if (options.dryRun) args.push('--dry-run');
      if (options.jsonOutputPlan) args.push('--json-output-plan');
      if (file) args.push(file);
      await gitlabCreatePolicyMrCommand(args);
    });

  // 8. Evaluate (Multi-Provider Federation)
  cli
    .command('evaluate', 'Execute multi-provider federated topology evaluation')
    .option('--providers <...providers>', 'Providers to ingest (e.g. github gitlab)')
    .option('--show-provenance', 'Output a detailed provenance and contribution report')
    .action(async (options) => {
      const { runFederatedEvaluationCommand } = await import('./runFederatedEvaluationCommand.js');
      const exitCode = await runFederatedEvaluationCommand(options);
      process.exit(exitCode);
    });

  // 9. Federation Inspection Surface
  cli
    .command('federation doctor', 'Diagnose multi-provider federation readiness')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { federationDoctorCommand } = await import('./commands/federationDoctor.js');
      const exitCode = await federationDoctorCommand(options);
      process.exit(exitCode);
    });

  cli
    .command('federation inspect', 'Inspect merged federated topology and capability matrices without running evaluations')
    .option('--providers <...providers>', 'Providers to ingest (e.g. github gitlab)')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { federationInspectCommand } = await import('./commands/federationInspect.js');
      const exitCode = await federationInspectCommand(options);
      process.exit(exitCode);
    });

  cli
    .command('federation explain', 'Explain provider contribution, capability intersection, and finding provenance')
    .option('--providers <...providers>', 'Providers to ingest (e.g. github gitlab)')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { federationExplainCommand } = await import('./commands/federationExplain.js');
      const exitCode = await federationExplainCommand(options);
      process.exit(exitCode);
    });

  // 10. Registry Commands
  cli
    .command('registry list', 'List all registered policy packs')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { registryListCommand } = await import('./commands/registry/list.js');
      const exitCode = await registryListCommand(options);
      process.exit(exitCode);
    });

  cli
    .command('registry inspect <pack-id>', 'Inspect a registered policy pack manifest')
    .option('--json', 'Output report as strict JSON')
    .action(async (packId, options) => {
      const { registryInspectCommand } = await import('./commands/registry/inspect.js');
      const exitCode = await registryInspectCommand(packId, options);
      process.exit(exitCode);
    });

  cli
    .command('registry resolve', 'Resolve compatible policy packs for a given federation configuration')
    .option('--providers <...providers>', 'Providers to map capabilities against')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { registryResolveCommand } = await import('./commands/registry/resolve.js');
      const exitCode = await registryResolveCommand(options);
      process.exit(exitCode);
    });

  cli
    .command('registry explain <pack-id>', 'Explain policy pack dependency resolution and constraints')
    .option('--providers <...providers>', 'Providers to map capabilities against')
    .option('--json', 'Output report as strict JSON')
    .action(async (packId, options) => {
      const { registryExplainCommand } = await import('./commands/registry/explain.js');
      const exitCode = await registryExplainCommand(packId, options);
      process.exit(exitCode);
    });

  cli
    .command('registry lock', 'Generate a deterministic lockfile for the current registry state')
    .option('--providers <...providers>', 'Providers to evaluate capabilities against')
    .action(async (options) => {
      const { registryLockCommand } = await import('./commands/registry/lock.js');
      const exitCode = await registryLockCommand(options);
      process.exit(exitCode);
    });

  cli
    .command('registry verify-lock', 'Verify an existing lockfile matches current registry state')
    .action(async (options) => {
      const { registryVerifyLockCommand } = await import('./commands/registry/verify-lock.js');
      const exitCode = await registryVerifyLockCommand(options);
      process.exit(exitCode);
    });

  // 11. Registry Sources Commands
  cli
    .command('registry sources list', 'List all configured registry sources')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { registrySourcesListCommand } = await import('./commands/registry/sources/list.js');
      const exitCode = await registrySourcesListCommand(options);
      process.exit(exitCode);
    });

  cli
    .command('registry sources inspect <source-id>', 'Inspect a registry source configuration and catalog status')
    .option('--json', 'Output report as strict JSON')
    .action(async (sourceId, options) => {
      const { registrySourcesInspectCommand } = await import('./commands/registry/sources/inspect.js');
      const exitCode = await registrySourcesInspectCommand(sourceId, options);
      process.exit(exitCode);
    });

  cli
    .command('registry sources verify <source-id>', 'Verify registry source catalog signature and schema compatibility')
    .option('--json', 'Output report as strict JSON')
    .action(async (sourceId, options) => {
      const { registrySourcesVerifyCommand } = await import('./commands/registry/sources/verify.js');
      const exitCode = await registrySourcesVerifyCommand(sourceId, options);
      process.exit(exitCode);
    });

  // 12. Policy Bundle Commands
  cli
    .command('bundle build <pack-id>', 'Build a portable policy pack bundle (.archpack)')
    .option('--json', 'Output report as strict JSON')
    .action(async (packId, options) => {
      const { bundleBuildCommand } = await import('./commands/bundle/build.js');
      const exitCode = await bundleBuildCommand(packId, options);
      process.exit(exitCode);
    });

  cli
    .command('bundle inspect <bundle-path>', 'Inspect a portable policy pack bundle')
    .option('--json', 'Output report as strict JSON')
    .action(async (bundlePath, options) => {
      const { bundleInspectCommand } = await import('./commands/bundle/inspect.js');
      const exitCode = await bundleInspectCommand(bundlePath, options);
      process.exit(exitCode);
    });

  cli
    .command('bundle verify <bundle-path>', 'Verify bundle signature and integrity')
    .option('--json', 'Output report as strict JSON')
    .action(async (bundlePath, options) => {
      const { bundleVerifyCommand } = await import('./commands/bundle/verify.js');
      const exitCode = await bundleVerifyCommand(bundlePath, options);
      process.exit(exitCode);
    });

  cli
    .command('bundle load <bundle-path>', 'Load and validate a bundle for execution')
    .option('--json', 'Output report as strict JSON')
    .action(async (bundlePath, options) => {
      const { bundleLoadCommand } = await import('./commands/bundle/load.js');
      const exitCode = await bundleLoadCommand(bundlePath, options);
      process.exit(exitCode);
    });

  cli
    .command('pack init <pack-id>', 'Scaffold a new policy pack directory')
    .option('--json', 'Output report as strict JSON')
    .action(async (packId, options) => {
      const { packInitCommand } = await import('./commands/pack/init.js');
      const exitCode = await packInitCommand(packId, options);
      process.exit(exitCode);
    });

  cli
    .command('pack validate <pack-path>', 'Validate a policy pack against registry schemas')
    .option('--json', 'Output report as strict JSON')
    .action(async (packPath, options) => {
      const { packValidateCommand } = await import('./commands/pack/validate.js');
      const exitCode = await packValidateCommand(packPath, options);
      process.exit(exitCode);
    });

  cli
    .command('capability list', 'List available capabilities')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { capabilityListCommand } = await import('./commands/docs/capability.js');
      await capabilityListCommand(options);
    });

  cli
    .command('capability explain <capability-id>', 'Explain a specific capability')
    .option('--json', 'Output report as strict JSON')
    .action(async (capabilityId, options) => {
      const { capabilityExplainCommand } = await import('./commands/docs/capability.js');
      await capabilityExplainCommand(capabilityId, options);
    });

  cli
    .command('dataset-schemas list', 'List available dataset schemas')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { datasetSchemasListCommand } = await import('./commands/docs/dataset.js');
      await datasetSchemasListCommand(options);
    });

  cli
    .command('dataset-schemas explain <schema-id>', 'Explain a dataset schema')
    .option('--json', 'Output report as strict JSON')
    .action(async (schemaId, options) => {
      const { datasetSchemasExplainCommand } = await import('./commands/docs/dataset.js');
      await datasetSchemasExplainCommand(schemaId, options);
    });

  cli
    .command('execution-modes list', 'List execution modes')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { executionModesListCommand } = await import('./commands/docs/executionMode.js');
      await executionModesListCommand(options);
    });

  cli
    .command('execution-modes explain <mode-id>', 'Explain an execution mode')
    .option('--json', 'Output report as strict JSON')
    .action(async (modeId, options) => {
      const { executionModesExplainCommand } = await import('./commands/docs/executionMode.js');
      await executionModesExplainCommand(modeId, options);
    });

  cli
    .command('pack docs <pack-id>', 'Generate policy pack documentation')
    .option('--json', 'Output report as strict JSON')
    .option('--markdown', 'Output as Markdown')
    .action(async (packId, options) => {
      const { packDocsCommand } = await import('./commands/docs/pack.js');
      await packDocsCommand(packId, options);
    });

  cli
    .command('bundle docs <bundle-path>', 'Generate bundle documentation')
    .option('--json', 'Output report as strict JSON')
    .option('--markdown', 'Output as Markdown')
    .action(async (bundlePath, options) => {
      const { bundleDocsCommand } = await import('./commands/docs/bundle.js');
      await bundleDocsCommand(bundlePath, options);
    });

  cli
    .command('registry docs [pack-id]', 'Generate registry documentation')
    .option('--json', 'Output report as strict JSON')
    .option('--markdown', 'Output as Markdown')
    .action(async (packId, options) => {
      const { registryDocsCommand } = await import('./commands/docs/registry.js');
      await registryDocsCommand(packId, options);
    });

  cli
    .command('capability graph', 'Generate capability compatibility graph')
    .option('--json', 'Output report as strict JSON')
    .option('--mermaid', 'Output as Mermaid diagram')
    .action(async (options) => {
      const { capabilityGraphCommand } = await import('./commands/docs/capabilityGraph.js');
      await capabilityGraphCommand(options);
    });

  cli
    .command('pack graph <pack-id>', 'Generate policy pack dependency graph')
    .option('--json', 'Output report as strict JSON')
    .option('--mermaid', 'Output as Mermaid diagram')
    .action(async (packId, options) => {
      const { packGraphCommand } = await import('./commands/docs/packGraph.js');
      await packGraphCommand(packId, options);
    });

  cli
    .command('bundle publish <bundle-path>', 'Publish a bundle to a registry catalog')
    .option('--json', 'Output report as strict JSON')
    .action(async (bundlePath, options) => {
      const { bundlePublishCommand } = await import('./commands/bundle/publish.js');
      await bundlePublishCommand(bundlePath, options);
    });

  cli
    .command('evaluate explain-capability <capability-id>', 'Explain capability gating trace')
    .option('--json', 'Output report as strict JSON')
    .action(async (capabilityId, options) => {
      const { explainCapabilityCommand } = await import('./commands/evaluate/explain.js');
      await explainCapabilityCommand(capabilityId, options);
    });

  cli
    .command('evaluate explain-dataset <schema-id>', 'Explain dataset eligibility trace')
    .option('--json', 'Output report as strict JSON')
    .action(async (schemaId, options) => {
      const { explainDatasetCommand } = await import('./commands/evaluate/explain.js');
      await explainDatasetCommand(schemaId, options);
    });

  cli
    .command('evaluate explain-identity <node-id>', 'Explain identity resolution trace')
    .option('--json', 'Output report as strict JSON')
    .action(async (nodeId, options) => {
      const { explainIdentityCommand } = await import('./commands/evaluate/explain.js');
      await explainIdentityCommand(nodeId, options);
    });

  cli
    .command('evaluate explain-finding <finding-id>', 'Explain finding generation trace')
    .option('--json', 'Output report as strict JSON')
    .action(async (findingId, options) => {
      const { explainFindingCommand } = await import('./commands/evaluate/explain.js');
      await explainFindingCommand(findingId, options);
    });

  cli
    .command('evaluate explain-merge', 'Explain federation merge trace')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { explainMergeCommand } = await import('./commands/evaluate/explain.js');
      await explainMergeCommand(options);
    });

  cli
    .command('evaluate trace', 'Execute evaluation and output trace')
    .option('--providers <providers...>', 'List of providers')
    .option('--packs <packs...>', 'List of policy packs')
    .option('--json', 'Output report as strict JSON')
    .option('--mermaid', 'Output as Mermaid diagram')
    .action(async (options) => {
      const { evaluateTraceCommand } = await import('./commands/evaluate/explain.js');
      await evaluateTraceCommand(options);
    });

  cli
    .command('pack regression-test <pack-id>', 'Run policy-pack regression test against a baseline')
    .option('--baseline <path>', 'Baseline snapshot path')
    .option('--json', 'Output report as strict JSON')
    .action(async (packId, options) => {
      const { packRegressionTestCommand } = await import('./commands/pack/regression.js');
      const exitCode = await packRegressionTestCommand(packId, options);
      process.exit(exitCode);
    });

  cli
    .command('replay diff', 'Compare baseline vs candidate evaluation')
    .option('--capabilities', 'Detect capability drift')
    .option('--datasets', 'Detect dataset compatibility drift')
    .option('--identity', 'Detect identity resolution drift')
    .option('--merge', 'Detect federation merge drift')
    .option('--findings', 'Detect finding drift')
    .option('--execution-modes', 'Detect execution mode drift')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { replayDiffCommand } = await import('./commands/replay/diff.js');
      await replayDiffCommand(options);
    });

  cli
    .command('replay lockfile', 'Generate lockfile replay diff')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { replayLockfileCommand } = await import('./commands/replay/diff.js');
      await replayLockfileCommand(options);
    });

  cli
    .command('replay bundle <bundleA> <bundleB>', 'Generate bundle replay diff')
    .option('--json', 'Output report as strict JSON')
    .action(async (bundleA, bundleB, options) => {
      const { replayBundleCommand } = await import('./commands/replay/diff.js');
      await replayBundleCommand(bundleA, bundleB, options);
    });

  cli
    .command('annotate github', 'Generate GitHub PR annotations')
    .option('--providers <providers...>', 'List of providers')
    .option('--packs <packs...>', 'List of policy packs')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { annotateGithubCommand } = await import('./commands/annotate/index.js');
      await annotateGithubCommand(options);
    });

  cli
    .command('annotate gitlab', 'Generate GitLab MR annotations')
    .option('--providers <providers...>', 'List of providers')
    .option('--packs <packs...>', 'List of policy packs')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { annotateGitlabCommand } = await import('./commands/annotate/index.js');
      await annotateGitlabCommand(options);
    });

  cli
    .command('report evaluate', 'Generate governance evaluation report')
    .option('--providers <providers...>', 'List of providers')
    .option('--packs <packs...>', 'List of policy packs')
    .option('--format <format>', 'Report format (markdown, html)')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { reportEvaluateCommand } = await import('./commands/report/index.js');
      await reportEvaluateCommand(options);
    });

  cli
    .command('report export', 'Export CI attachment surfaces')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { reportExportCommand } = await import('./commands/report/index.js');
      await reportExportCommand(options);
    });

  cli
    .command('diagnostics workspace', 'Output LSP-compatible diagnostics')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { diagnosticsWorkspaceCommand } = await import('./commands/diagnostics/index.js');
      await diagnosticsWorkspaceCommand(options);
    });

  cli
    .command('diagnostics report', 'Generate workspace diagnostics report')
    .option('--format <format>', 'Report format (markdown, html)')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { diagnosticsReportCommand } = await import('./commands/diagnostics/index.js');
      await diagnosticsReportCommand(options);
    });

  cli
    .command('hooks install', 'Install pre-commit governance hook')
    .option('--fail-on <expression>', 'Severity threshold expression (e.g. severity>=high)')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { hooksInstallCommand } = await import('./commands/hooks/install.js');
      await hooksInstallCommand(options);
    });

  cli
    .command('gate local', 'Local governance gate mode for evaluation')
    .option('--fail-on <expression>', 'Severity threshold expression (e.g. severity>=high)')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { gateLocalCommand } = await import('./commands/gate/local.js');
      const exitCode = await gateLocalCommand(options);
      process.exit(exitCode);
    });

  cli
    .command('simulate topology-change', 'Predict impact of topology mutations')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { simulateTopologyChangeCommand } = await import('./commands/simulate/index.js');
      await simulateTopologyChangeCommand(options);
    });

  cli
    .command('simulate capability', 'Predict capability rollout impact')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { simulateCapabilityCommand } = await import('./commands/simulate/index.js');
      await simulateCapabilityCommand(options);
    });

  cli
    .command('simulate dataset', 'Predict dataset schema evolution impact')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { simulateDatasetCommand } = await import('./commands/simulate/index.js');
      await simulateDatasetCommand(options);
    });

  cli
    .command('simulate pack', 'Predict policy-pack rollout impact')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { simulatePackCommand } = await import('./commands/simulate/index.js');
      await simulatePackCommand(options);
    });

  cli
    .command('simulate bundle', 'Predict bundle promotion impact')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { simulateBundleCommand } = await import('./commands/simulate/index.js');
      await simulateBundleCommand(options);
    });

  cli
    .command('simulate federation', 'Predict federation merge behavior impact')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { simulateFederationCommand } = await import('./commands/simulate/index.js');
      await simulateFederationCommand(options);
    });

  cli
    .command('simulate identity', 'Predict identity resolution forecast outcome')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { simulateIdentityCommand } = await import('./commands/simulate/index.js');
      await simulateIdentityCommand(options);
    });

  cli
    .command('history graph', 'Export architecture knowledge graph')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { historyGraphCommand } = await import('./commands/history/index.js');
      await historyGraphCommand(options);
    });

  cli
    .command('history timeline', 'Export topology evolution timeline')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { historyTimelineCommand } = await import('./commands/history/index.js');
      await historyTimelineCommand(options);
    });

  cli
    .command('history bundle-lineage', 'Export bundle promotion lineage graph')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { historyBundleLineageCommand } = await import('./commands/history/index.js');
      await historyBundleLineageCommand(options);
    });

  cli
    .command('history registry-trust', 'Export registry trust evolution timeline')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { historyRegistryTrustCommand } = await import('./commands/history/index.js');
      await historyRegistryTrustCommand(options);
    });

  cli
    .command('metrics capability-adoption', 'Compute capability adoption metrics')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { metricsCapabilityAdoptionCommand } = await import('./commands/metrics/index.js');
      await metricsCapabilityAdoptionCommand(options);
    });

  cli
    .command('metrics dataset-evolution', 'Compute dataset evolution metrics')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { metricsDatasetEvolutionCommand } = await import('./commands/metrics/index.js');
      await metricsDatasetEvolutionCommand(options);
    });

  cli
    .command('metrics identity-lifecycle', 'Compute identity lifecycle metrics')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { metricsIdentityLifecycleCommand } = await import('./commands/metrics/index.js');
      await metricsIdentityLifecycleCommand(options);
    });

  cli
    .command('metrics stability', 'Compute architecture stability metrics')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { metricsStabilityCommand } = await import('./commands/metrics/index.js');
      await metricsStabilityCommand(options);
    });

  cli
    .command('metrics drift', 'Compute architecture drift velocity metrics')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { metricsDriftCommand } = await import('./commands/metrics/index.js');
      await metricsDriftCommand(options);
    });

  cli
    .command('metrics policy-effectiveness', 'Compute policy effectiveness metrics')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { metricsPolicyEffectivenessCommand } = await import('./commands/metrics/index.js');
      await metricsPolicyEffectivenessCommand(options);
    });

  cli
    .command('gate evaluate', 'CI enforcement gate mode for evaluation')
    .option('--providers <providers...>', 'List of providers')
    .option('--packs <packs...>', 'List of policy packs')
    .option('--fail-on <expression>', 'Severity threshold expression (e.g. severity>=high)')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { gateEvaluateCommand } = await import('./commands/gate/evaluate.js');
      const exitCode = await gateEvaluateCommand(options);
      process.exit(exitCode);
    });

  cli
    .command('bundle promote <bundle-path>', 'Promote a bundle through lifecycle stages')
    .option('--stage <stage>', 'Target promotion stage (e.g. verified)')
    .option('--json', 'Output report as strict JSON')
    .action(async (bundlePath, options) => {
      const { bundlePromoteCommand } = await import('./commands/bundle/promote.js');
      const exitCode = await bundlePromoteCommand(bundlePath, options);
      process.exit(exitCode);
    });

  cli
    .command('bundle propagate <bundle-path>', 'Propagate a bundle across registry mirrors')
    .option('--json', 'Output report as strict JSON')
    .action(async (bundlePath, options) => {
      const { bundlePropagateCommand } = await import('./commands/bundle/propagate.js');
      const exitCode = await bundlePropagateCommand(bundlePath, options);
      process.exit(exitCode);
    });

  cli
    .command('bundle export-snapshot', 'Export an offline registry snapshot')
    .option('--output <path>', 'Path to save snapshot payload')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { bundleExportSnapshotCommand } = await import('./commands/bundle/exportSnapshot.js');
      const exitCode = await bundleExportSnapshotCommand(options);
      process.exit(exitCode);
    });

  // ─── Error Handling ────────────────────────────────────────

  cli.on('command:*', () => {
    console.error(pc.red(`Invalid command: ${cli.args.join(' ')}`));
    cli.outputHelp();
    process.exit(1);
  });

  const require = createRequire(import.meta.url);
  const pkg = require('../package.json');

  try {
    cli.help();
    cli.version(pkg.version);
    cli.parse(process.argv, { run: false });
    
    if (!cli.matchedCommandName && !cli.options.help && !cli.options.version) {
      cli.outputHelp();
      process.exit(1);
    }
    
    await cli.runMatchedCommand();
  } catch (error) {
    if (error instanceof Error) {
      console.error(pc.red(`Fatal: ${error.message}`));
      if (process.env.DEBUG) console.error(error.stack);
    }
    // Exit code 1: CLI/runtime/internal failure
    process.exit(1);
  }
}
