/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/agp-emitter — Error Vocabulary
 * ═══════════════════════════════════════════════════════════
 *
 *  Structured errors thrown / surfaced by the emitter. Each error
 *  carries an AGP_EMITTER_* code that maps onto a documented
 *  rejection rule from
 *  `docs/agp/conformance/v1/README.md`.
 *
 *  The CLI catches these and prints a `{code, message, fix}` block
 *  without a stack trace by default.
 */

export type AgpEmitterErrorCode =
  | 'AGP_EMITTER_INPUT_PARSE_FAILED'
  | 'AGP_EMITTER_UNSUPPORTED_SCHEMA_VERSION'
  | 'AGP_EMITTER_UNSUPPORTED_COMMAND'
  | 'AGP_EMITTER_MISSING_TOPOLOGY'
  | 'AGP_EMITTER_INVALID_ADAPTER_METADATA'
  | 'AGP_EMITTER_INVALID_DRIFT_BLOCK'
  | 'AGP_EMITTER_ABSOLUTE_PATH_REJECTED'
  | 'AGP_EMITTER_OUTPUT_VALIDATION_FAILED'
  | 'AGP_EMITTER_OUTPUT_DIR_NOT_EMPTY';

export interface AgpEmitterErrorDetails {
  readonly path?: string;
  readonly field?: string;
  readonly observed?: unknown;
  readonly expected?: unknown;
  readonly examples?: ReadonlyArray<string>;
}

/**
 * The single error type the emitter surfaces. Carries a canonical
 * `code` and an optional `fix` message.
 */
export class AgpEmitterError extends Error {
  public readonly code: AgpEmitterErrorCode;
  public readonly fix?: string;
  public readonly details?: AgpEmitterErrorDetails;

  constructor(args: {
    code: AgpEmitterErrorCode;
    message: string;
    fix?: string;
    details?: AgpEmitterErrorDetails;
  }) {
    super(args.message);
    this.name = 'AgpEmitterError';
    this.code = args.code;
    this.fix = args.fix;
    this.details = args.details;
  }

  /**
   * JSON-friendly serialisation for CLI error output.
   */
  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      ...(this.fix !== undefined ? { fix: this.fix } : {}),
      ...(this.details !== undefined ? { details: this.details } : {}),
    };
  }
}

export function isAgpEmitterError(value: unknown): value is AgpEmitterError {
  return value instanceof AgpEmitterError;
}
