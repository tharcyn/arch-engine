/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/agp-verifier — Issue Code Vocabulary
 * ═══════════════════════════════════════════════════════════
 *
 *  Each verifier issue carries a stable `AGP_VERIFIER_*` code.
 *  Codes are namespaced separately from the emitter's
 *  `AGP_EMITTER_*` codes so a downstream consumer can distinguish
 *  "this bundle failed to emit" from "this bundle was successfully
 *  emitted but fails verification".
 *
 *  Code → verdict mapping (consulted by verifyAgpBundle.ts):
 *
 *    parse failures, missing files            → invalid
 *    unsupported schema/agpVersion            → unsupported_schema
 *    schema validation                        → invalid
 *    payloadHash mismatch                     → tampered
 *    record id mismatch                       → tampered
 *    snapshot digest mismatch                 → tampered
 *    manifest ↔ records bijection mismatch    → tampered (set diff) /
 *                                                invalid (cross-ref disagreement)
 *    sort order invalid                       → invalid
 *    plane invariant failed                   → invalid (schema/format) /
 *                                                tampered (content tampering)
 *    absolute path leak                       → invalid
 *    unsupported hash algorithm prefix        → invalid
 *    attestation subject mismatch             → tampered
 */

export type AgpVerifierIssueCode =
  // Bundle discovery / IO
  | 'AGP_VERIFIER_BUNDLE_NOT_FOUND'
  | 'AGP_VERIFIER_BUNDLE_NOT_DIRECTORY'
  | 'AGP_VERIFIER_SNAPSHOT_NOT_FOUND'
  | 'AGP_VERIFIER_RECORDS_NOT_FOUND'
  // Parsing
  | 'AGP_VERIFIER_SNAPSHOT_PARSE_FAILED'
  | 'AGP_VERIFIER_RECORD_PARSE_FAILED'
  // Versioning
  | 'AGP_VERIFIER_UNSUPPORTED_SCHEMA_VERSION'
  | 'AGP_VERIFIER_UNSUPPORTED_AGP_VERSION'
  // Schema validation
  | 'AGP_VERIFIER_SCHEMA_VALIDATION_FAILED'
  // Identity / hashing
  | 'AGP_VERIFIER_PAYLOAD_HASH_MISMATCH'
  | 'AGP_VERIFIER_RECORD_ID_MISMATCH'
  | 'AGP_VERIFIER_RECORD_ID_FORMAT_INVALID'
  | 'AGP_VERIFIER_DUPLICATE_RECORD_ID'
  // Manifest ↔ records bijection
  | 'AGP_VERIFIER_MANIFEST_RECORD_MISSING'
  | 'AGP_VERIFIER_RECORD_NOT_IN_MANIFEST'
  | 'AGP_VERIFIER_MANIFEST_CROSS_REF_MISMATCH'
  | 'AGP_VERIFIER_DUPLICATE_MANIFEST_ID'
  | 'AGP_VERIFIER_COUNT_MISMATCH'
  // Snapshot digest
  | 'AGP_VERIFIER_SNAPSHOT_DIGEST_MISMATCH'
  // Sort
  | 'AGP_VERIFIER_SORT_ORDER_INVALID'
  // Plane invariants
  | 'AGP_VERIFIER_PLANE_INVARIANT_FAILED'
  // Path scan
  | 'AGP_VERIFIER_ABSOLUTE_PATH_LEAK'
  // Algorithms
  | 'AGP_VERIFIER_UNSUPPORTED_HASH_ALGORITHM'
  // Attestation
  | 'AGP_VERIFIER_ATTESTATION_SUBJECT_MISMATCH'
  | 'AGP_VERIFIER_ATTESTATION_ENVELOPE_UNVERIFIED'
  // Internal
  | 'AGP_VERIFIER_INTERNAL_ERROR';

export interface AgpVerifierErrorDetails {
  readonly path?: string;
  readonly observed?: unknown;
  readonly expected?: unknown;
  readonly recordId?: string;
  readonly lineNumber?: number;
}

/**
 * Hard error thrown when the verifier itself cannot continue
 * (e.g. bundle path missing). Normal verification *issues* are
 * returned via the result; this class is for IO/parse problems
 * that the CLI surfaces specially.
 */
export class AgpVerifierError extends Error {
  public readonly code: AgpVerifierIssueCode;
  public readonly fix?: string;
  public readonly details?: AgpVerifierErrorDetails;

  constructor(args: {
    code: AgpVerifierIssueCode;
    message: string;
    fix?: string;
    details?: AgpVerifierErrorDetails;
  }) {
    super(args.message);
    this.name = 'AgpVerifierError';
    this.code = args.code;
    this.fix = args.fix;
    this.details = args.details;
  }

  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      ...(this.fix !== undefined ? { fix: this.fix } : {}),
      ...(this.details !== undefined ? { details: this.details } : {}),
    };
  }
}

export function isAgpVerifierError(value: unknown): value is AgpVerifierError {
  return value instanceof AgpVerifierError;
}
