import { cac } from 'cac';
import pc from 'picocolors';
import { createRequire } from 'module';
import {
  PRODUCT_PROMISE,
  DOCS_URL,
  FIRST_RUN_PATH,
  SUPPORTED_EXPLAIN_TARGETS,
} from './help-text.js';
import {
  diagnosticFromUnknownError,
  emitDiagnosticHuman,
  exitCodeForDiagnostic,
} from './format-error.js';
import {
  parseAndValidateCliOptions,
  attachOutputOptions,
} from './cli-options.js';
import { installHumanCaptureIfNeeded } from './output-writer.js';

export async function run() {
  const cli = cac('arch-engine');

  // ─── Global Options ────────────────────────────────────────

  cli.option('--json', 'Output results as JSON (alias for `--format json`).');
  cli.option('--no-color', 'Disable colorized output.');
  // Phase 4 (v1.1.0) — new flag surface. Each is documented at the
  // root help level here and elaborated in `--format`/`--json-schema`
  // help below.
  cli.option(
    '--json-schema <version>',
    'JSON schema version when output is JSON: `v1` (default) or `v2`.',
  );
  cli.option(
    '--format <format>',
    'Output format: `human` (default), `json`, or `markdown`.',
  );
  cli.option(
    '--output <path>',
    'Write the formatted output to <path> instead of stdout.',
  );
  cli.option('--ci', 'Deterministic CI-friendly output (forces no-color).');
  cli.option('--verbose', 'Include extra diagnostic detail.');
  cli.option('--quiet', 'Suppress non-essential human output.');

  // ─── The Progressive Trust Ladder ──────────────────────────
  //
  // Per the CLI Experience Specification §3, the v1.0.x command
  // surface is frozen at exactly five commands. Each gets a
  // plain-English description (no jargon before value, P1) and
  // at least one example via .example().

  // 1. Doctor
  cli
    .command('doctor', 'Check workspace readiness and adapter signal.')
    .example('  $ arch-engine doctor')
    .example('  $ arch-engine doctor --json')
    .example('  $ arch-engine doctor --json --json-schema=v2')
    .example('  $ arch-engine doctor --format markdown')
    .example('')
    .example('  Next: review the topology with `arch-engine inspect`.')
    .example('  Docs: ' + DOCS_URL + '/getting-started')
    .action(async (options) => {
      const outputOptions = parseAndValidateCliOptions(options);
      attachOutputOptions(options, outputOptions);
      installHumanCaptureIfNeeded(outputOptions);
      const { doctorCommand } = await import('./commands/doctor.js');
      await doctorCommand(options);
    });

  // 2. Inspect
  cli
    .command('inspect', 'Summarize the extracted topology. Does not enforce policy.')
    .example('  $ arch-engine inspect')
    .example('  $ arch-engine inspect --json')
    .example('  $ arch-engine inspect --json --json-schema=v2')
    .example('')
    .example('  Inspect is read-only — it never blocks CI.')
    .example('  Docs: ' + DOCS_URL + '/cli/inspect')
    .action(async (options) => {
      const outputOptions = parseAndValidateCliOptions(options);
      attachOutputOptions(options, outputOptions);
      installHumanCaptureIfNeeded(outputOptions);
      const { inspectCommand } = await import('./commands/inspect.js');
      await inspectCommand(options);
    });

  // 3. Analyze
  cli
    .command('analyze', 'Score architecture signal and risk. Informational; never blocks CI.')
    .example('  $ arch-engine analyze')
    .example('  $ arch-engine analyze --json --json-schema=v2')
    .example('  $ arch-engine analyze --format markdown')
    .example('')
    .example('  Without a policy file, analyze is informational only.')
    .example('  Docs: ' + DOCS_URL + '/cli/analyze')
    .action(async (options) => {
      const outputOptions = parseAndValidateCliOptions(options);
      attachOutputOptions(options, outputOptions);
      installHumanCaptureIfNeeded(outputOptions);
      const { analyzeCommand } = await import('./commands/analyze.js');
      await analyzeCommand(options);
    });

  // 4. Check
  cli
    .command('check', 'Enforce policy and report blocking architecture violations.')
    .option('--min-coverage <percentage>', 'Require a minimum topology coverage percentage (0.0-1.0)')
    .option('--sync', 'Emit SaaS synchronization session locally')
    .example('  $ arch-engine check')
    .example('  $ arch-engine check --ci')
    .example('  $ arch-engine check --json --json-schema=v2')
    .example('  $ arch-engine check --format markdown --output arch-engine-report.md')
    .example('  $ arch-engine check --min-coverage 0.80')
    .example('')
    .example('  Exit codes:')
    .example('    0  No blocking architecture violations')
    .example('    1  Blocking architecture violations found')
    .example('    2  Invalid input or configuration')
    .example('    3  Adapter/workspace failure')
    .example('    5  Internal invariant failure')
    .example('')
    .example('  Without a policy file, check runs informationally and exits 0.')
    .example('  Docs: ' + DOCS_URL + '/cli/check')
    .action(async (options) => {
      const outputOptions = parseAndValidateCliOptions(options);
      attachOutputOptions(options, outputOptions);
      installHumanCaptureIfNeeded(outputOptions);
      const { checkCommand } = await import('./commands/check.js');
      await checkCommand(options);
    });

  // 5. Explain
  cli
    .command('explain <target>', 'Explain a topology inference, regression, or policy decision.')
    .example('  $ arch-engine explain regression')
    .example('  $ arch-engine explain policy')
    .example('  $ arch-engine explain shared')
    .example('  $ arch-engine explain regression --json --json-schema=v2')
    .example('')
    .example('  Supported targets:')
    .example(
      SUPPORTED_EXPLAIN_TARGETS.map(
        (t) => `    ${t.keyword.padEnd(12)} ${t.description}`,
      ).join('\n'),
    )
    .example('    <name>       any node or edge identifier — substring match')
    .example('')
    .example('  Docs: ' + DOCS_URL + '/cli/explain')
    .action(async (target, options) => {
      const outputOptions = parseAndValidateCliOptions(options);
      attachOutputOptions(options, outputOptions);
      installHumanCaptureIfNeeded(outputOptions);
      const { explainCommand } = await import('./commands/explain.js');
      await explainCommand(target, options);
    });

  // ─── Root Help Customisation ───────────────────────────────
  //
  // The cac help callback runs for both the global help (when no
  // command is matched) and per-command help. We detect "global
  // help" by the presence of the auto-generated "Commands"
  // section, and only there inject the product-promise subtitle
  // and the recommended first-run path.

  cli.help((sections) => {
    const isGlobalHelp = sections.some((s) => s.title === 'Commands');
    if (!isGlobalHelp) return sections;

    // Find the title section (no `title` key, body is `name/version`).
    // Insert the promise immediately after it.
    const next = sections.slice();
    const titleIdx = next.findIndex((s) => !s.title && /^arch-engine/.test(s.body));
    const promiseSection = { body: pc.dim(PRODUCT_PROMISE) };
    if (titleIdx >= 0) {
      next.splice(titleIdx + 1, 0, promiseSection);
    } else {
      next.unshift(promiseSection);
    }

    // Append a "First-run path" section after the auto-generated
    // "For more info" block.
    const firstRunBody = FIRST_RUN_PATH.map(
      (entry, i) => `  ${i + 1}. ${entry.step.padEnd(22)} ${entry.description}`,
    ).join('\n');
    next.push({ title: 'First-run path', body: firstRunBody });
    next.push({ body: `Docs: ${DOCS_URL}` });

    return next;
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
    // Note: `cli.help(callback)` was already called above to register
    // the root-help customisation. Calling `cli.help()` again here
    // (as v1.0.1 did) would overwrite that callback with undefined.
    cli.version(pkg.version);
    cli.parse(process.argv, { run: false });

    if (!cli.matchedCommandName && !cli.options.help && !cli.options.version) {
      cli.outputHelp();
      process.exit(1);
    }

    await cli.runMatchedCommand();
  } catch (error) {
    // Phase 5 (v1.0.3): structured error rendering for any
    // uncaught throw. Per spec §11.4, unknown errors map to
    // ARCH_ENGINE_INTERNAL_INVARIANT_FAILED with exit code 5.
    // Stack traces are hidden by default; visible only when
    // DEBUG=arch-engine:* is set (handled inside emitDiagnosticHuman).
    const diagnostic = diagnosticFromUnknownError(error);
    emitDiagnosticHuman(diagnostic, error);
    process.exit(exitCodeForDiagnostic(diagnostic));
  }
}
