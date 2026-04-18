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
    .command('identity create', 'Create governance identity')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { identityCreateCommand } = await import('./commands/identity/index.js');
      await identityCreateCommand(options);
    });

  cli
    .command('identity inspect', 'Inspect governance identity')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { identityInspectCommand } = await import('./commands/identity/index.js');
      await identityInspectCommand(options);
    });

  cli
    .command('identity verify', 'Verify governance identity')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { identityVerifyCommand } = await import('./commands/identity/index.js');
      await identityVerifyCommand(options);
    });

  cli
    .command('pack sign', 'Sign policy pack')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { packSignCommand } = await import('./commands/pack/index.js');
      await packSignCommand(options);
    });

  cli
    .command('pack verify-signature', 'Verify policy pack signature')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { packVerifySignatureCommand } = await import('./commands/pack/index.js');
      await packVerifySignatureCommand(options);
    });

  cli
    .command('bundle verify-authority', 'Verify bundle authority certificate')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { bundleVerifyAuthorityCommand } = await import('./commands/bundle/verify-authority.js');
      await bundleVerifyAuthorityCommand(options);
    });

  cli
    .command('registry verify-authority', 'Verify registry trust anchor chain')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { registryVerifyAuthorityCommand } = await import('./commands/registry/verify-authority.js');
      await registryVerifyAuthorityCommand(options);
    });

  cli
    .command('trust graph', 'Resolve organization trust graph')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { trustGraphCommand } = await import('./commands/identity/index.js');
      await trustGraphCommand(options);
    });

  cli
    .command('marketplace list', 'List marketplace entries')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { marketplaceListCommand } = await import('./commands/marketplace/index.js');
      await marketplaceListCommand(options);
    });

  cli
    .command('marketplace inspect', 'Inspect marketplace entry')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { marketplaceInspectCommand } = await import('./commands/marketplace/index.js');
      await marketplaceInspectCommand(options);
    });

  cli
    .command('marketplace verified', 'List verified publishers and bundles')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { marketplaceVerifiedCommand } = await import('./commands/marketplace/index.js');
      await marketplaceVerifiedCommand(options);
    });

  cli
    .command('trust-score pack', 'Compute policy pack quality score')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { trustScorePackCommand } = await import('./commands/reputation/index.js');
      await trustScorePackCommand(options);
    });

  cli
    .command('trust-score bundle', 'Compute bundle reliability score')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { trustScoreBundleCommand } = await import('./commands/reputation/index.js');
      await trustScoreBundleCommand(options);
    });

  cli
    .command('trust-score registry', 'Compute registry credibility score')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { trustScoreRegistryCommand } = await import('./commands/reputation/index.js');
      await trustScoreRegistryCommand(options);
    });

  cli
    .command('trust-score publisher', 'Compute publisher trust score')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { trustScorePublisherCommand } = await import('./commands/reputation/index.js');
      await trustScorePublisherCommand(options);
    });

  cli
    .command('workspace create', 'Create multi-tenant workspace')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { workspaceCreateCommand } = await import('./commands/workspace/index.js');
      await workspaceCreateCommand(options);
    });

  cli
    .command('workspace list', 'List workspaces')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { workspaceListCommand } = await import('./commands/workspace/index.js');
      await workspaceListCommand(options);
    });

  cli
    .command('workspace inspect', 'Inspect workspace overlay')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { workspaceInspectCommand } = await import('./commands/workspace/index.js');
      await workspaceInspectCommand(options);
    });

  cli
    .command('workspace registry list', 'List tenant-scoped registry overlay sources')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { workspaceRegistryListCommand } = await import('./commands/workspace/index.js');
      await workspaceRegistryListCommand(options);
    });

  cli
    .command('workspace trust list', 'List tenant-scoped trust anchors')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { workspaceTrustListCommand } = await import('./commands/workspace/index.js');
      await workspaceTrustListCommand(options);
    });

  cli
    .command('workspace bundle promote', 'Promote bundle in isolated workspace scope')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { workspaceBundlePromoteCommand } = await import('./commands/workspace/index.js');
      await workspaceBundlePromoteCommand(options);
    });

  cli
    .command('sandbox evaluate', 'Execute pack sandboxed')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { sandboxEvaluateCommand } = await import('./commands/sandbox/index.js');
      await sandboxEvaluateCommand(options);
    });

  cli
    .command('sandbox simulate', 'Simulate pack sandboxed')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { sandboxSimulateCommand } = await import('./commands/sandbox/index.js');
      await sandboxSimulateCommand(options);
    });

  cli
    .command('sandbox simulate topology-change', 'Simulate topology-change sandboxed')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { sandboxSimulateTopologyChangeCommand } = await import('./commands/sandbox/index.js');
      await sandboxSimulateTopologyChangeCommand(options);
    });

  cli
    .command('cost evaluate', 'Estimate policy execution cost')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { costEvaluateCommand } = await import('./commands/cost/index.js');
      await costEvaluateCommand(options);
    });

  cli
    .command('cost federation', 'Estimate federation merge cost')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { costFederationCommand } = await import('./commands/cost/index.js');
      await costFederationCommand(options);
    });

  cli
    .command('cost simulation', 'Estimate remote simulation cost')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { costSimulationCommand } = await import('./commands/cost/index.js');
      await costSimulationCommand(options);
    });

  cli
    .command('profile evaluate', 'Profile evaluation runtime')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { profileEvaluateCommand } = await import('./commands/profile/index.js');
      await profileEvaluateCommand(options);
    });

  cli
    .command('plugin register', 'Register an enforcement plugin')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { pluginRegisterCommand } = await import('./commands/plugin/index.js');
      await pluginRegisterCommand(options);
    });

  cli
    .command('plugin list', 'List registered plugins')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { pluginListCommand } = await import('./commands/plugin/index.js');
      await pluginListCommand(options);
    });

  cli
    .command('plugin inspect', 'Inspect a registered plugin')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { pluginInspectCommand } = await import('./commands/plugin/index.js');
      await pluginInspectCommand(options);
    });

  cli
    .command('enforce deploy', 'Evaluate before deploy')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { enforceDeployCommand } = await import('./commands/enforce/index.js');
      await enforceDeployCommand(options);
    });

  cli
    .command('enforce merge', 'Evaluate before merge')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { enforceMergeCommand } = await import('./commands/enforce/index.js');
      await enforceMergeCommand(options);
    });

  cli
    .command('enforce schema', 'Evaluate before schema change')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { enforceSchemaCommand } = await import('./commands/enforce/index.js');
      await enforceSchemaCommand(options);
    });

  cli
    .command('enforce kubernetes', 'Evaluate via Kubernetes Admission Controller')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { enforceKubernetesCommand } = await import('./commands/enforce/index.js');
      await enforceKubernetesCommand(options);
    });

  cli
    .command('enforce ci', 'Evaluate via CI Pipeline Gate')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { enforceCiCommand } = await import('./commands/enforce/index.js');
      await enforceCiCommand(options);
    });

  cli
    .command('enforce git', 'Evaluate via Git Provider Hooks')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { enforceGitCommand } = await import('./commands/enforce/index.js');
      await enforceGitCommand(options);
    });

  cli
    .command('enforce cloud', 'Evaluate via Cloud Deployment Gate')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { enforceCloudCommand } = await import('./commands/enforce/index.js');
      await enforceCloudCommand(options);
    });

  cli
    .command('controller start', 'Start governance controller runtime')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { controllerStartCommand } = await import('./commands/controller/index.js');
      await controllerStartCommand(options);
    });

  cli
    .command('controller status', 'Get status of governance controller runtime')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { controllerStatusCommand } = await import('./commands/controller/index.js');
      await controllerStatusCommand(options);
    });

  cli
    .command('exchange peer add', 'Add exchange peer')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { exchangePeerAddCommand } = await import('./commands/exchange/index.js');
      await exchangePeerAddCommand(options);
    });

  cli
    .command('exchange peer list', 'List exchange peers')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { exchangePeerListCommand } = await import('./commands/exchange/index.js');
      await exchangePeerListCommand(options);
    });

  cli
    .command('exchange subscribe', 'Subscribe to exchange')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { exchangeSubscribeCommand } = await import('./commands/exchange/index.js');
      await exchangeSubscribeCommand(options);
    });

  cli
    .command('exchange subscribe publisher', 'Subscribe to publisher')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { exchangeSubscribePublisherCommand } = await import('./commands/exchange/index.js');
      await exchangeSubscribePublisherCommand(options);
    });

  cli
    .command('exchange subscribe registry', 'Subscribe to registry')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { exchangeSubscribeRegistryCommand } = await import('./commands/exchange/index.js');
      await exchangeSubscribeRegistryCommand(options);
    });

  cli
    .command('exchange subscribe bundle-channel', 'Subscribe to bundle channel')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { exchangeSubscribeBundleChannelCommand } = await import('./commands/exchange/index.js');
      await exchangeSubscribeBundleChannelCommand(options);
    });

  cli
    .command('exchange sync', 'Sync exchange session')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { exchangeSyncCommand } = await import('./commands/exchange/index.js');
      await exchangeSyncCommand(options);
    });

  cli
    .command('exchange propagate bundles', 'Propagate bundles')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { exchangePropagateBundlesCommand } = await import('./commands/exchange/index.js');
      await exchangePropagateBundlesCommand(options);
    });

  cli
    .command('exchange telemetry sync', 'Sync exchange telemetry')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { exchangeTelemetrySyncCommand } = await import('./commands/exchange/index.js');
      await exchangeTelemetrySyncCommand(options);
    });

  cli
    .command('agent start', 'Start remediation agent')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { agentStartCommand } = await import('./commands/agent/index.js');
      await agentStartCommand(options);
    });

  cli
    .command('agent plan', 'Plan remediation')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { agentPlanCommand } = await import('./commands/agent/index.js');
      await agentPlanCommand(options);
    });

  cli
    .command('agent apply', 'Apply remediation')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { agentApplyCommand } = await import('./commands/agent/index.js');
      await agentApplyCommand(options);
    });

  cli
    .command('agent preview', 'Preview remediation')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { agentPreviewCommand } = await import('./commands/agent/index.js');
      await agentPreviewCommand(options);
    });

  cli
    .command('workflow start', 'Start governance workflow')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { workflowStartCommand } = await import('./commands/workflow/index.js');
      await workflowStartCommand(options);
    });

  cli
    .command('workflow list', 'List governance workflows')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { workflowListCommand } = await import('./commands/workflow/index.js');
      await workflowListCommand(options);
    });

  cli
    .command('workflow inspect', 'Inspect governance workflow')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { workflowInspectCommand } = await import('./commands/workflow/index.js');
      await workflowInspectCommand(options);
    });

  cli
    .command('workflow plan', 'Plan governance workflow DAG')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { workflowPlanCommand } = await import('./commands/workflow/index.js');
      await workflowPlanCommand(options);
    });

  cli
    .command('workflow trigger list', 'List event triggers')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { workflowTriggerListCommand } = await import('./commands/workflow/index.js');
      await workflowTriggerListCommand(options);
    });

  cli
    .command('app install', 'Install policy app')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { appInstallCommand } = await import('./commands/app/index.js');
      await appInstallCommand(options);
    });

  cli
    .command('app run', 'Run policy app')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { appRunCommand } = await import('./commands/app/index.js');
      await appRunCommand(options);
    });

  cli
    .command('app inspect', 'Inspect policy app')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { appInspectCommand } = await import('./commands/app/index.js');
      await appInspectCommand(options);
    });

  cli
    .command('operator init', 'Init governance operator')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { operatorInitCommand } = await import('./commands/operator/index.js');
      await operatorInitCommand(options);
    });

  cli
    .command('operator validate', 'Validate governance operator')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { operatorValidateCommand } = await import('./commands/operator/index.js');
      await operatorValidateCommand(options);
    });

  cli
    .command('operator publish', 'Publish governance operator')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { operatorPublishCommand } = await import('./commands/operator/index.js');
      await operatorPublishCommand(options);
    });

  cli
    .command('simulate workflow', 'Simulate workflow execution')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { simulateWorkflowCommand } = await import('./commands/workflow/index.js');
      await simulateWorkflowCommand(options);
    });

  cli
    .command('copilot explain topology', 'Explain topology')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { copilotExplainTopologyCommand } = await import('./commands/copilot/index.js');
      await copilotExplainTopologyCommand(options);
    });

  cli
    .command('copilot explain policy', 'Explain policy')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { copilotExplainPolicyCommand } = await import('./commands/copilot/index.js');
      await copilotExplainPolicyCommand(options);
    });

  cli
    .command('copilot explain drift', 'Explain drift')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { copilotExplainDriftCommand } = await import('./commands/copilot/index.js');
      await copilotExplainDriftCommand(options);
    });

  cli
    .command('copilot reason topology', 'Reason topology')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { copilotReasonTopologyCommand } = await import('./commands/copilot/index.js');
      await copilotReasonTopologyCommand(options);
    });

  cli
    .command('copilot optimize policy', 'Optimize policy')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { copilotOptimizePolicyCommand } = await import('./commands/copilot/index.js');
      await copilotOptimizePolicyCommand(options);
    });

  cli
    .command('migration plan', 'Plan migration')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { migrationPlanCommand } = await import('./commands/migration/index.js');
      await migrationPlanCommand(options);
    });

  cli
    .command('migration campaign start', 'Start migration campaign')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { migrationCampaignStartCommand } = await import('./commands/migration/index.js');
      await migrationCampaignStartCommand(options);
    });

  cli
    .command('migration campaign inspect', 'Inspect migration campaign')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { migrationCampaignInspectCommand } = await import('./commands/migration/index.js');
      await migrationCampaignInspectCommand(options);
    });

  cli
    .command('simulate migration campaign', 'Simulate migration campaign')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { simulateMigrationCampaignCommand } = await import('./commands/migration/index.js');
      await simulateMigrationCampaignCommand(options);
    });

  cli
    .command('dataset exchange publish', 'Publish dataset')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { datasetExchangePublishCommand } = await import('./commands/dataset/index.js');
      await datasetExchangePublishCommand(options);
    });

  cli
    .command('dataset exchange subscribe', 'Subscribe dataset')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { datasetExchangeSubscribeCommand } = await import('./commands/dataset/index.js');
      await datasetExchangeSubscribeCommand(options);
    });

  cli
    .command('dataset learning aggregate', 'Aggregate federated learning')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { datasetLearningAggregateCommand } = await import('./commands/dataset/index.js');
      await datasetLearningAggregateCommand(options);
    });

  cli
    .command('dataset benchmark aggregate', 'Aggregate benchmark')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { datasetBenchmarkAggregateCommand } = await import('./commands/dataset/index.js');
      await datasetBenchmarkAggregateCommand(options);
    });

  cli
    .command('maturity score', 'Compute maturity score')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { maturityScoreCommand } = await import('./commands/maturity/index.js');
      await maturityScoreCommand(options);
    });

  cli
    .command('maturity explain', 'Explain maturity score')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { maturityExplainCommand } = await import('./commands/maturity/index.js');
      await maturityExplainCommand(options);
    });

  cli
    .command('maturity gaps', 'Analyze capability gaps')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { maturityGapsCommand } = await import('./commands/maturity/index.js');
      await maturityGapsCommand(options);
    });

  cli
    .command('ledger append', 'Append ledger')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { ledgerAppendCommand } = await import('./commands/ledger/index.js');
      await ledgerAppendCommand(options);
    });

  cli
    .command('ledger inspect', 'Inspect ledger')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { ledgerInspectCommand } = await import('./commands/ledger/index.js');
      await ledgerInspectCommand(options);
    });

  cli
    .command('ledger prove execution', 'Prove execution')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { ledgerProveExecutionCommand } = await import('./commands/ledger/index.js');
      await ledgerProveExecutionCommand(options);
    });

  cli
    .command('attest decision', 'Attest decision')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { attestDecisionCommand } = await import('./commands/ledger/index.js');
      await attestDecisionCommand(options);
    });

  cli
    .command('notarize fingerprint', 'Notarize fingerprint')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { notarizeFingerprintCommand } = await import('./commands/ledger/index.js');
      await notarizeFingerprintCommand(options);
    });

  cli
    .command('ledger campaign-lineage', 'Campaign lineage')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { ledgerCampaignLineageCommand } = await import('./commands/ledger/index.js');
      await ledgerCampaignLineageCommand(options);
    });

  cli
    .command('transparency explore bundle', 'Explore bundle transparency')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { transparencyExploreBundleCommand } = await import('./commands/transparency/index.js');
      await transparencyExploreBundleCommand(options);
    });

  cli
    .command('transparency explore policy', 'Explore policy transparency')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { transparencyExplorePolicyCommand } = await import('./commands/transparency/index.js');
      await transparencyExplorePolicyCommand(options);
    });

  cli
    .command('transparency explore campaign', 'Explore campaign transparency')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { transparencyExploreCampaignCommand } = await import('./commands/transparency/index.js');
      await transparencyExploreCampaignCommand(options);
    });

  cli
    .command('registry-network list', 'List registry network')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { registryNetworkListCommand } = await import('./commands/registry-network/index.js');
      await registryNetworkListCommand(options);
    });

  cli
    .command('registry-network mirrors', 'List registry mirrors')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { registryNetworkMirrorsCommand } = await import('./commands/registry-network/index.js');
      await registryNetworkMirrorsCommand(options);
    });

  cli
    .command('discover packs', 'Discover policy packs')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { discoverPacksCommand } = await import('./commands/discover/index.js');
      await discoverPacksCommand(options);
    });

  cli
    .command('discover datasets', 'Discover datasets')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { discoverDatasetsCommand } = await import('./commands/discover/index.js');
      await discoverDatasetsCommand(options);
    });

  cli
    .command('discover bundles', 'Discover bundles')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { discoverBundlesCommand } = await import('./commands/discover/index.js');
      await discoverBundlesCommand(options);
    });

  cli
    .command('recommend baseline', 'Recommend policy baseline')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { recommendBaselineCommand } = await import('./commands/recommend/index.js');
      await recommendBaselineCommand(options);
    });

  cli
    .command('recommend datasets', 'Recommend datasets')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { recommendDatasetsCommand } = await import('./commands/recommend/index.js');
      await recommendDatasetsCommand(options);
    });

  cli
    .command('recommend migration', 'Recommend migration strategy')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { recommendMigrationCommand } = await import('./commands/recommend/index.js');
      await recommendMigrationCommand(options);
    });

  cli
    .command('search governance', 'Search governance registry')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { searchGovernanceCommand } = await import('./commands/search/index.js');
      await searchGovernanceCommand(options);
    });

  cli
    .command('observe topology', 'Observe topology signals')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { observeTopologyCommand } = await import('./commands/observe/index.js');
      await observeTopologyCommand(options);
    });

  cli
    .command('observe datasets', 'Observe dataset signals')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { observeDatasetsCommand } = await import('./commands/observe/index.js');
      await observeDatasetsCommand(options);
    });

  cli
    .command('observe capabilities', 'Observe capability signals')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { observeCapabilitiesCommand } = await import('./commands/observe/index.js');
      await observeCapabilitiesCommand(options);
    });

  cli
    .command('observe drift-risk', 'Observe drift risk')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { observeDriftRiskCommand } = await import('./commands/observe/index.js');
      await observeDriftRiskCommand(options);
    });

  cli
    .command('observe ecosystem-risk', 'Observe ecosystem risk')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { observeEcosystemRiskCommand } = await import('./commands/observe/index.js');
      await observeEcosystemRiskCommand(options);
    });

  cli
    .command('forecast topology-stability', 'Forecast topology stability')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { forecastTopologyStabilityCommand } = await import('./commands/forecast/index.js');
      await forecastTopologyStabilityCommand(options);
    });

  cli
    .command('forecast capability-regression', 'Forecast capability regression')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { forecastCapabilityRegressionCommand } = await import('./commands/forecast/index.js');
      await forecastCapabilityRegressionCommand(options);
    });

  cli
    .command('scorecard generate', 'Generate governance scorecard')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { scorecardGenerateCommand } = await import('./commands/scorecard/index.js');
      await scorecardGenerateCommand(options);
    });

  cli
    .command('scorecard roi', 'Measure policy ROI')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { scorecardRoiCommand } = await import('./commands/scorecard/index.js');
      await scorecardRoiCommand(options);
    });

  cli
    .command('scorecard capability-impact', 'Measure capability impact')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { scorecardCapabilityImpactCommand } = await import('./commands/scorecard/index.js');
      await scorecardCapabilityImpactCommand(options);
    });

  cli
    .command('benchmark maturity', 'Benchmark maturity')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { benchmarkMaturityCommand } = await import('./commands/benchmark/index.js');
      await benchmarkMaturityCommand(options);
    });

  cli
    .command('benchmark percentile', 'Benchmark percentile')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { benchmarkPercentileCommand } = await import('./commands/benchmark/index.js');
      await benchmarkPercentileCommand(options);
    });

  cli
    .command('standards list', 'List governance standards')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { standardsListCommand } = await import('./commands/standards/index.js');
      await standardsListCommand(options);
    });

  cli
    .command('standards inspect', 'Inspect governance standard')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { standardsInspectCommand } = await import('./commands/standards/index.js');
      await standardsInspectCommand(options);
    });

  cli
    .command('standards capabilities', 'List capabilities')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { standardsCapabilitiesCommand } = await import('./commands/standards/index.js');
      await standardsCapabilitiesCommand(options);
    });

  cli
    .command('standards datasets', 'List datasets')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { standardsDatasetsCommand } = await import('./commands/standards/index.js');
      await standardsDatasetsCommand(options);
    });

  cli
    .command('standards migration-tiers', 'List migration tiers')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { standardsMigrationTiersCommand } = await import('./commands/standards/index.js');
      await standardsMigrationTiersCommand(options);
    });

  cli
    .command('standards compliance-profiles', 'List compliance profiles')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { standardsComplianceProfilesCommand } = await import('./commands/standards/index.js');
      await standardsComplianceProfilesCommand(options);
    });

  cli
    .command('standards maturity-tiers', 'List maturity tiers')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { standardsMaturityTiersCommand } = await import('./commands/standards/index.js');
      await standardsMaturityTiersCommand(options);
    });

  cli
    .command('certify list', 'List certifications')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { certifyListCommand } = await import('./commands/certify/index.js');
      await certifyListCommand(options);
    });

  cli
    .command('certify inspect', 'Inspect certification')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { certifyInspectCommand } = await import('./commands/certify/index.js');
      await certifyInspectCommand(options);
    });

  cli
    .command('certify conformance', 'Test conformance')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { certifyConformanceCommand } = await import('./commands/certify/index.js');
      await certifyConformanceCommand(options);
    });

  cli
    .command('certify dataset', 'Certify dataset')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { certifyDatasetCommand } = await import('./commands/certify/index.js');
      await certifyDatasetCommand(options);
    });

  cli
    .command('certify policy-pack', 'Certify policy pack')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { certifyPolicyPackCommand } = await import('./commands/certify/index.js');
      await certifyPolicyPackCommand(options);
    });

  cli
    .command('certify migration', 'Certify migration')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { certifyMigrationCommand } = await import('./commands/certify/index.js');
      await certifyMigrationCommand(options);
    });

  cli
    .command('certify maturity', 'Certify maturity')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { certifyMaturityCommand } = await import('./commands/certify/index.js');
      await certifyMaturityCommand(options);
    });

  cli
    .command('certify badges', 'Generate badges')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { certifyBadgesCommand } = await import('./commands/certify/index.js');
      await certifyBadgesCommand(options);
    });

  cli
    .command('trust-federation list', 'List trust federation')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { trustFederationListCommand } = await import('./commands/trust-federation/index.js');
      await trustFederationListCommand(options);
    });

  cli
    .command('trust-federation inspect', 'Inspect trust federation')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { trustFederationInspectCommand } = await import('./commands/trust-federation/index.js');
      await trustFederationInspectCommand(options);
    });

  cli
    .command('trust resolve-chain', 'Resolve certification chain')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { trustResolveChainCommand } = await import('./commands/trust/index.js');
      await trustResolveChainCommand(options);
    });

  cli
    .command('trust revoke', 'Revoke trust')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { trustRevokeCommand } = await import('./commands/trust/index.js');
      await trustRevokeCommand(options);
    });

  cli
    .command('trust delegate', 'Delegate trust')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { trustDelegateCommand } = await import('./commands/trust/index.js');
      await trustDelegateCommand(options);
    });

  cli
    .command('verify certification', 'Verify certification')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { verifyCertificationCommand } = await import('./commands/verify/index.js');
      await verifyCertificationCommand(options);
    });

  cli
    .command('transparency certification-log', 'Certification transparency log')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { transparencyCertificationLogCommand } = await import('./commands/transparency/index.js');
      await transparencyCertificationLogCommand(options);
    });

  cli
    .command('treaty list', 'List treaties')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { treatyListCommand } = await import('./commands/treaty/index.js');
      await treatyListCommand(options);
    });

  cli
    .command('treaty inspect', 'Inspect treaty')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { treatyInspectCommand } = await import('./commands/treaty/index.js');
      await treatyInspectCommand(options);
    });

  cli
    .command('treaty negotiate', 'Negotiate treaty')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { treatyNegotiateCommand } = await import('./commands/treaty/index.js');
      await treatyNegotiateCommand(options);
    });

  cli
    .command('verify portable', 'Portable verification')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { verifyPortableCommand } = await import('./commands/verify/index.js');
      await verifyPortableCommand(options);
    });

  cli
    .command('verify offline', 'Offline verification')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { verifyOfflineCommand } = await import('./commands/verify/index.js');
      await verifyOfflineCommand(options);
    });

  cli
    .command('verify external', 'External verification')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { verifyExternalCommand } = await import('./commands/verify/index.js');
      await verifyExternalCommand(options);
    });

  cli
    .command('semantic list', 'List semantic equivalences')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { semanticListCommand } = await import('./commands/semantic/index.js');
      await semanticListCommand(options);
    });

  cli
    .command('semantic inspect', 'Inspect semantic equivalence')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { semanticInspectCommand } = await import('./commands/semantic/index.js');
      await semanticInspectCommand(options);
    });

  cli
    .command('semantic translate-policy', 'Translate policy intent')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { semanticTranslatePolicyCommand } = await import('./commands/semantic/index.js');
      await semanticTranslatePolicyCommand(options);
    });

  cli
    .command('semantic translate-dataset', 'Translate dataset meaning')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { semanticTranslateDatasetCommand } = await import('./commands/semantic/index.js');
      await semanticTranslateDatasetCommand(options);
    });

  cli
    .command('semantic translate-capability', 'Translate capability ontology')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { semanticTranslateCapabilityCommand } = await import('./commands/semantic/index.js');
      await semanticTranslateCapabilityCommand(options);
    });

  cli
    .command('agl parse', 'Parse AGL document')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { aglParseCommand } = await import('./commands/agl/index.js');
      await aglParseCommand(options);
    });

  cli
    .command('agl validate', 'Validate AGL document')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { aglValidateCommand } = await import('./commands/agl/index.js');
      await aglValidateCommand(options);
    });

  cli
    .command('agl translate', 'Translate AGL compatibility')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { aglTranslateCommand } = await import('./commands/agl/index.js');
      await aglTranslateCommand(options);
    });

  cli
    .command('ontology list', 'List ontology descriptors')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { ontologyListCommand } = await import('./commands/ontology/index.js');
      await ontologyListCommand(options);
    });

  cli
    .command('ontology inspect', 'Inspect ontology descriptor')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { ontologyInspectCommand } = await import('./commands/ontology/index.js');
      await ontologyInspectCommand(options);
    });

  cli
    .command('prove intent', 'Prove architecture intent')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { proveIntentCommand } = await import('./commands/prove/index.js');
      await proveIntentCommand(options);
    });

  cli
    .command('prove policy', 'Prove policy satisfiability')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { provePolicyCommand } = await import('./commands/prove/index.js');
      await provePolicyCommand(options);
    });

  cli
    .command('prove dataset', 'Prove dataset compatibility')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { proveDatasetCommand } = await import('./commands/prove/index.js');
      await proveDatasetCommand(options);
    });

  cli
    .command('prove migration', 'Prove migration safety')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { proveMigrationCommand } = await import('./commands/prove/index.js');
      await proveMigrationCommand(options);
    });

  cli
    .command('prove authority', 'Prove authority boundary')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { proveAuthorityCommand } = await import('./commands/prove/index.js');
      await proveAuthorityCommand(options);
    });

  cli
    .command('assurance create', 'Create assurance case')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { assuranceCreateCommand } = await import('./commands/assurance/index.js');
      await assuranceCreateCommand(options);
    });

  cli
    .command('assurance inspect', 'Inspect assurance case')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { assuranceInspectCommand } = await import('./commands/assurance/index.js');
      await assuranceInspectCommand(options);
    });

  cli
    .command('assurance graph', 'Graph claim evidence and proof')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { assuranceGraphCommand } = await import('./commands/assurance/index.js');
      await assuranceGraphCommand(options);
    });

  cli
    .command('assurance export-submission', 'Export regulatory submission bundle')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { assuranceExportSubmissionCommand } = await import('./commands/assurance/index.js');
      await assuranceExportSubmissionCommand(options);
    });

  cli
    .command('assurance export-review-pack', 'Export review board evidence pack')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { assuranceExportReviewPackCommand } = await import('./commands/assurance/index.js');
      await assuranceExportReviewPackCommand(options);
    });

  cli
    .command('assurance counterexample', 'Generate counterexample')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { assuranceCounterexampleCommand } = await import('./commands/assurance/index.js');
      await assuranceCounterexampleCommand(options);
    });

  cli
    .command('assurance residual-risk', 'Analyze residual risk')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { assuranceResidualRiskCommand } = await import('./commands/assurance/index.js');
      await assuranceResidualRiskCommand(options);
    });

  cli
    .command('assurance monitor', 'Monitor continuous assurance')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { assuranceMonitorCommand } = await import('./commands/assurance/index.js');
      await assuranceMonitorCommand(options);
    });

  cli
    .command('assurance freshness', 'Check evidence freshness')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { assuranceFreshnessCommand } = await import('./commands/assurance/index.js');
      await assuranceFreshnessCommand(options);
    });

  cli
    .command('assurance drift', 'Detect submission drift')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { assuranceDriftCommand } = await import('./commands/assurance/index.js');
      await assuranceDriftCommand(options);
    });

  cli
    .command('assurance replay', 'Replay temporal evidence')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { assuranceReplayCommand } = await import('./commands/assurance/index.js');
      await assuranceReplayCommand(options);
    });

  cli
    .command('assurance reconstruct', 'Reconstruct decision context')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { assuranceReconstructCommand } = await import('./commands/assurance/index.js');
      await assuranceReconstructCommand(options);
    });

  cli
    .command('assurance orchestrate', 'Orchestrate governance assurance')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { assuranceOrchestrateCommand } = await import('./commands/assurance/index.js');
      await assuranceOrchestrateCommand(options);
    });

  cli
    .command('assurance regenerate', 'Regenerate evidence')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { assuranceRegenerateCommand } = await import('./commands/assurance/index.js');
      await assuranceRegenerateCommand(options);
    });

  cli
    .command('assurance renew-certifications', 'Renew certifications')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { assuranceRenewCertificationsCommand } = await import('./commands/assurance/index.js');
      await assuranceRenewCertificationsCommand(options);
    });

  cli
    .command('agent maintain-assurance', 'Maintain evidence autonomy')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { agentMaintainAssuranceCommand } = await import('./commands/agent/index.js');
      await agentMaintainAssuranceCommand(options);
    });

  cli
    .command('approval create', 'Create approval')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { approvalCreateCommand } = await import('./commands/approval/index.js');
      await approvalCreateCommand(options);
    });

  cli
    .command('approval inspect', 'Inspect approval')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { approvalInspectCommand } = await import('./commands/approval/index.js');
      await approvalInspectCommand(options);
    });

  cli
    .command('approval workflow start', 'Start approval workflow')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { approvalWorkflowStartCommand } = await import('./commands/approval/index.js');
      await approvalWorkflowStartCommand(options);
    });

  cli
    .command('approval workflow inspect', 'Inspect approval workflow')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { approvalWorkflowInspectCommand } = await import('./commands/approval/index.js');
      await approvalWorkflowInspectCommand(options);
    });

  cli
    .command('approval quorum evaluate', 'Evaluate approval quorum')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { approvalQuorumEvaluateCommand } = await import('./commands/approval/index.js');
      await approvalQuorumEvaluateCommand(options);
    });

  cli
    .command('approval validate-separation', 'Validate separation of duties')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { approvalValidateSeparationCommand } = await import('./commands/approval/index.js');
      await approvalValidateSeparationCommand(options);
    });

  cli
    .command('approval waive', 'Issue approval waiver')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { approvalWaiveCommand } = await import('./commands/approval/index.js');
      await approvalWaiveCommand(options);
    });

  cli
    .command('approval list-waivers', 'List approval waivers')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { approvalListWaiversCommand } = await import('./commands/approval/index.js');
      await approvalListWaiversCommand(options);
    });

  cli
    .command('approval expiry', 'Check approval expiry')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { approvalExpiryCommand } = await import('./commands/approval/index.js');
      await approvalExpiryCommand(options);
    });

  cli
    .command('approval revalidate', 'Revalidate approval')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { approvalRevalidateCommand } = await import('./commands/approval/index.js');
      await approvalRevalidateCommand(options);
    });

  cli
    .command('approval sign', 'Sign decision packet')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { approvalSignCommand } = await import('./commands/approval/index.js');
      await approvalSignCommand(options);
    });

  cli
    .command('approval verify-signature', 'Verify decision signature')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { approvalVerifySignatureCommand } = await import('./commands/approval/index.js');
      await approvalVerifySignatureCommand(options);
    });

  cli
    .command('kernel inspect', 'Inspect execution kernel')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { kernelInspectCommand } = await import('./commands/kernel/index.js');
      await kernelInspectCommand(options);
    });

  cli
    .command('kernel compatibility', 'Resolve kernel compatibility')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { kernelCompatibilityCommand } = await import('./commands/kernel/index.js');
      await kernelCompatibilityCommand(options);
    });

  cli
    .command('kernel freeze-surface', 'Freeze execution surface')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { kernelFreezeSurfaceCommand } = await import('./commands/kernel/index.js');
      await kernelFreezeSurfaceCommand(options);
    });

  cli
    .command('capsule export', 'Export governance state capsule')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { capsuleExportCommand } = await import('./commands/capsule/index.js');
      await capsuleExportCommand(options);
    });

  cli
    .command('capsule inspect', 'Inspect governance state capsule')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { capsuleInspectCommand } = await import('./commands/capsule/index.js');
      await capsuleInspectCommand(options);
    });

  cli
    .command('capsule verify', 'Verify governance state capsule')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { capsuleVerifyCommand } = await import('./commands/capsule/index.js');
      await capsuleVerifyCommand(options);
    });

  cli
    .command('capsule replay', 'Replay governance state capsule')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { capsuleReplayCommand } = await import('./commands/capsule/index.js');
      await capsuleReplayCommand(options);
    });

  cli
    .command('capsule sign', 'Sign capsule')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { capsuleSignCommand } = await import('./commands/capsule/index.js');
      await capsuleSignCommand(options);
    });

  cli
    .command('capsule verify-signature', 'Verify capsule signature')
    .option('--json', 'Output report as strict JSON')
    .action(async (options) => {
      const { capsuleVerifySignatureCommand } = await import('./commands/capsule/index.js');
      await capsuleVerifySignatureCommand(options);
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
