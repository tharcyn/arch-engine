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
    .command('bundle publish <bundle-path>', 'Publish a bundle to a registry catalog')
    .option('--json', 'Output report as strict JSON')
    .action(async (bundlePath, options) => {
      const { bundlePublishCommand } = await import('./commands/bundle/publish.js');
      const exitCode = await bundlePublishCommand(bundlePath, options);
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
