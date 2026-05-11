/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/cli — Output options + flag validation
 * ═══════════════════════════════════════════════════════════
 *
 *  Central place where the v1.1.0 flag surface is parsed and
 *  validated:
 *
 *    --json
 *    --no-color
 *    --json-schema=v1|v2     (new in v1.1.0)
 *    --ci                    (new in v1.1.0)
 *    --format human|json|markdown   (new in v1.1.0)
 *    --output <path>         (new in v1.1.0)
 *    --verbose               (new in v1.1.0)
 *    --quiet                 (new in v1.1.0)
 *
 *  Validation rules (per docs/cli/json-v2-ci-flags-spec.md §9):
 *
 *    - Invalid `--format` value → exit 2.
 *    - Invalid `--json-schema` value → exit 2.
 *    - `--json-schema=v2` without JSON output → exit 2.
 *    - `--json` + `--format human|markdown` → exit 2.
 *    - `--output` with trailing `/` or `\` → exit 2.
 *    - `--quiet` + `--verbose` → allowed; `--quiet` wins for human output.
 *    - `--ci` is orthogonal (does NOT imply `--json`); always allowed.
 *
 *  Conflict errors are reported via the structured
 *  ARCH_ENGINE_INVALID_CONFIG diagnostic — same renderer used by
 *  the rest of the v1.0.3 error layer — so machine consumers see
 *  a `diagnostics: []` JSON output and human consumers see the
 *  `Title / Problem / Fix / Exit` template.
 */

import {
  buildDiagnostic,
  emitDiagnosticHuman,
  emitDiagnosticJson,
  exitCodeForDiagnostic,
} from './format-error.js';

export type OutputFormat = 'human' | 'json' | 'markdown';
export type JsonSchemaVersion = 'v1' | 'v2';

export interface CliOutputOptions {
  /**
   * True iff JSON output is requested (via `--json` or `--format json`).
   * The existing v1.0.x boolean carries forward.
   */
  readonly json: boolean;
  /**
   * Canonical format token. `'json'` is set both for `--json` and for
   * `--format json`. `'markdown'` only for `--format markdown`.
   */
  readonly format: OutputFormat;
  /**
   * JSON schema version. Default `'v1'`. Only meaningful when
   * `format === 'json'`.
   */
  readonly jsonSchema: JsonSchemaVersion;
  /**
   * `--ci` flag — deterministic, no-color, no-decoration mode.
   */
  readonly ci: boolean;
  /**
   * `--output <path>` — when set, writes formatted output to the path
   * instead of stdout. Always either undefined or a non-empty string
   * without a trailing slash.
   */
  readonly output: string | undefined;
  /**
   * `--verbose` flag — adds detail in human/markdown; in JSON v2 also
   * includes `artifacts[].absolutePath`.
   */
  readonly verbose: boolean;
  /**
   * `--quiet` flag — suppresses non-essential human output. Has no
   * effect on JSON or markdown content. Wins over `--verbose` for the
   * human render.
   */
  readonly quiet: boolean;
  /**
   * `--no-color` (or implicit via `--ci`).
   */
  readonly noColor: boolean;
}

/**
 * Default options — used by tests and as a typed reference shape.
 */
export const DEFAULT_OUTPUT_OPTIONS: CliOutputOptions = {
  json: false,
  format: 'human',
  jsonSchema: 'v1',
  ci: false,
  output: undefined,
  verbose: false,
  quiet: false,
  noColor: false,
};

/**
 * Parse and validate the raw cac options into a typed
 * `CliOutputOptions`. Calls `process.exit(2)` with a structured
 * `ARCH_ENGINE_INVALID_CONFIG` diagnostic on any conflict.
 *
 * `process.exit` is a process-level effect; callers in command code
 * should never see this function return when validation fails.
 */
export function parseAndValidateCliOptions(raw: any): CliOutputOptions {
  const rawJson = raw?.json === true;
  const rawFormatRaw = raw?.format;
  const rawJsonSchemaRaw = raw?.jsonSchema;
  const rawCi = raw?.ci === true;
  const rawVerbose = raw?.verbose === true;
  const rawQuiet = raw?.quiet === true;
  const rawOutput = typeof raw?.output === 'string' ? raw.output : undefined;
  // cac maps `--no-color` → `options.color === false`.
  const rawNoColor = raw?.color === false;

  // ── Validate --format value ───────────────────────────────────
  let rawFormat: string | undefined = undefined;
  if (rawFormatRaw !== undefined) {
    if (typeof rawFormatRaw !== 'string') {
      failInvalidConfig(
        `Invalid --format value: ${JSON.stringify(rawFormatRaw)}.`,
        'Use one of: human, json, markdown.',
        rawJson || (typeof rawFormatRaw === 'string' && rawFormatRaw === 'json'),
      );
    }
    if (!['human', 'json', 'markdown'].includes(rawFormatRaw)) {
      failInvalidConfig(
        `Invalid --format value: "${rawFormatRaw}".`,
        'Use one of: human, json, markdown.',
        rawJson,
      );
    }
    rawFormat = rawFormatRaw;
  }

  // ── Validate --json-schema value ──────────────────────────────
  let rawJsonSchema: string | undefined = undefined;
  if (rawJsonSchemaRaw !== undefined) {
    if (typeof rawJsonSchemaRaw !== 'string') {
      failInvalidConfig(
        `Invalid --json-schema value: ${JSON.stringify(rawJsonSchemaRaw)}.`,
        'Use one of: v1, v2.',
        rawJson || rawFormat === 'json',
      );
    }
    if (!['v1', 'v2'].includes(rawJsonSchemaRaw)) {
      failInvalidConfig(
        `Invalid --json-schema value: "${rawJsonSchemaRaw}".`,
        'Use one of: v1, v2.',
        rawJson || rawFormat === 'json',
      );
    }
    rawJsonSchema = rawJsonSchemaRaw;
  }

  // ── Compute canonical format ──────────────────────────────────
  let format: OutputFormat;
  if (rawFormat) {
    format = rawFormat as OutputFormat;
  } else if (rawJson) {
    format = 'json';
  } else {
    format = 'human';
  }

  // Conflict: --json + --format human|markdown
  if (rawJson && format !== 'json') {
    failInvalidConfig(
      `Conflicting options: --json with --format ${format}.`,
      `Use either --json or --format ${format}, not both.`,
      false,
    );
  }

  const json = format === 'json';

  // ── jsonSchema default + scope ────────────────────────────────
  const jsonSchema: JsonSchemaVersion = (rawJsonSchema as JsonSchemaVersion) || 'v1';

  if (rawJsonSchemaRaw !== undefined && !json) {
    failInvalidConfig(
      `--json-schema=${rawJsonSchema} requires --json (or --format json).`,
      'Either drop --json-schema or pass --json (e.g. `--json --json-schema=v2`).',
      false,
    );
  }

  // ── Validate --output path ────────────────────────────────────
  if (rawOutput !== undefined) {
    if (rawOutput === '') {
      failInvalidConfig(
        `--output requires a non-empty path.`,
        'Pass a target file path, e.g. `--output report.md`.',
        json,
      );
    }
    if (rawOutput.endsWith('/') || rawOutput.endsWith('\\')) {
      failInvalidConfig(
        `--output must point to a file, not a directory: "${rawOutput}".`,
        'Drop the trailing slash and provide a filename, e.g. `--output report.md`.',
        json,
      );
    }
  }

  // ── noColor (union: explicit --no-color OR --ci) ──────────────
  const noColor = rawNoColor || rawCi;

  return {
    json,
    format,
    jsonSchema,
    ci: rawCi,
    output: rawOutput,
    verbose: rawVerbose,
    quiet: rawQuiet,
    noColor,
  };
}

/**
 * Apply the canonical `json` decision back onto the raw options
 * object so existing command code that reads `options.json` keeps
 * working (e.g. `--format json` → `options.json = true`).
 *
 * Mutates the passed object. Returns nothing.
 */
export function attachOutputOptions(raw: any, options: CliOutputOptions): void {
  if (raw === null || typeof raw !== 'object') return;
  raw.outputOptions = options;
  raw.json = options.json;
  // Mirror noColor onto the cac-style `color: false` flag if needed
  // so picocolors-using helpers downstream see the right state.
  if (options.noColor && raw.color !== false) {
    raw.color = false;
  }
}

/**
 * Internal: emit a structured diagnostic and exit 2.
 *
 * `jsonOutput` controls whether the diagnostic is emitted as JSON
 * (`{ diagnostics: [...] }`) or as the structured human template.
 * When the user already asked for JSON output, an emitted error in
 * human form would mix render modes — so we honour the chosen mode
 * even for the validation error itself.
 */
function failInvalidConfig(
  message: string,
  fix: string,
  jsonOutput: boolean,
): never {
  const diagnostic = buildDiagnostic({
    code: 'ARCH_ENGINE_INVALID_CONFIG',
    title: 'Invalid CLI options.',
    message,
    fix,
  });
  if (jsonOutput) {
    emitDiagnosticJson(diagnostic);
  } else {
    emitDiagnosticHuman(diagnostic);
  }
  process.exit(exitCodeForDiagnostic(diagnostic));
}
