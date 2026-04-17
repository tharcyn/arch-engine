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
