/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/agp-verifier — JSON Schema loader
 * ═══════════════════════════════════════════════════════════
 *
 *  Loads the 13 AGP v1 JSON Schemas from `docs/agp/schemas/v1/`
 *  using Ajv 2020-12 and exposes compiled validators for:
 *    - snapshot.json   → snapshot.schema.json
 *    - each record     → record.schema.json
 *
 *  The base record schema dispatches by `family` via `$ref` to the
 *  per-family schemas; Ajv resolves them automatically once all
 *  schemas are pre-loaded with `addSchema()`.
 *
 *  Schema-root resolution:
 *    1. Explicit options.schemaRoot
 *    2. Sibling `docs/agp/schemas/v1/` two levels above this file
 *       (works when running from a `dist/` build at
 *       packages/agp-verifier/dist).
 *    3. Walk up from the package root searching for
 *       `docs/agp/schemas/v1/`.
 *
 *  The repo always ships the schemas; we never need network access.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as AjvModule from 'ajv/dist/2020.js';

// Ajv's package exposes `Ajv2020` as both a named export and a
// default. With NodeNext + esModuleInterop the interop layer can
// surface either; pick whichever is constructable.
type AjvCtor = new (opts?: Record<string, unknown>) => {
  addSchema: (schema: unknown) => void;
  getSchema: (id: string) => unknown;
};
const AjvCtor: AjvCtor =
  ((AjvModule as unknown as { Ajv2020?: AjvCtor }).Ajv2020 as AjvCtor) ??
  ((AjvModule as unknown as { default?: AjvCtor }).default as AjvCtor);
type AjvInstance = InstanceType<AjvCtor>;

export interface LoadedSchemas {
  readonly ajv: AjvInstance;
  readonly validateSnapshot: (data: unknown) => boolean;
  readonly validateRecord: (data: unknown) => boolean;
  readonly snapshotErrors: () => ReadonlyArray<{ readonly instancePath: string; readonly message?: string; readonly schemaPath?: string; readonly params?: Record<string, unknown> }>;
  readonly recordErrors: () => ReadonlyArray<{ readonly instancePath: string; readonly message?: string; readonly schemaPath?: string; readonly params?: Record<string, unknown> }>;
  readonly schemaRoot: string;
}

// ESM-compatible __dirname.
const HERE = path.dirname(fileURLToPath(import.meta.url));

const SNAPSHOT_SCHEMA_ID =
  'https://arch-engine.dev/agp/v1/snapshot.schema.json';
const RECORD_SCHEMA_ID =
  'https://arch-engine.dev/agp/v1/record.schema.json';

let cached: LoadedSchemas | undefined;
let cachedRoot: string | undefined;

export function loadSchemas(schemaRootOverride?: string): LoadedSchemas {
  const schemaRoot = schemaRootOverride ?? resolveSchemaRoot();
  if (cached && cachedRoot === schemaRoot) return cached;

  const ajv = new AjvCtor({
    strict: false,
    allErrors: true,
    // We deliberately do NOT pass `validateFormats: true` so that
    // missing optional ajv-formats does not become a runtime
    // failure. The schemas pin format-like behaviour via `pattern`
    // already (e.g. Timestamp has a strict regex), so disabling
    // format assertion does not weaken validation.
    validateFormats: false,
  });

  for (const entry of fs.readdirSync(schemaRoot)) {
    if (!entry.endsWith('.schema.json')) continue;
    const obj = JSON.parse(
      fs.readFileSync(path.join(schemaRoot, entry), 'utf8'),
    );
    ajv.addSchema(obj);
  }

  type AjvValidate = {
    (data: unknown): boolean;
    errors?: ReadonlyArray<{
      instancePath: string;
      message?: string;
      schemaPath?: string;
      params?: Record<string, unknown>;
    }>;
  };
  const validateSnapshot = ajv.getSchema(SNAPSHOT_SCHEMA_ID) as AjvValidate | undefined;
  const validateRecord = ajv.getSchema(RECORD_SCHEMA_ID) as AjvValidate | undefined;
  if (!validateSnapshot || !validateRecord) {
    throw new Error(
      `AGP v1 schemas could not be resolved from ${schemaRoot}; missing snapshot or record schema id`,
    );
  }

  cached = {
    ajv,
    validateSnapshot: (d) => validateSnapshot(d),
    validateRecord: (d) => validateRecord(d),
    snapshotErrors: () => validateSnapshot.errors ?? [],
    recordErrors: () => validateRecord.errors ?? [],
    schemaRoot,
  };
  cachedRoot = schemaRoot;
  return cached;
}

function resolveSchemaRoot(): string {
  // Allow opt-in env override.
  const envRoot = process.env.AGP_VERIFIER_SCHEMA_ROOT;
  if (envRoot && fs.existsSync(envRoot)) return envRoot;

  const candidates: string[] = [
    // From src/ (running tests via vitest).
    path.resolve(HERE, '..', '..', '..', 'docs', 'agp', 'schemas', 'v1'),
    // From dist/ (running the built CLI).
    path.resolve(HERE, '..', '..', '..', '..', 'docs', 'agp', 'schemas', 'v1'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isDirectory()) return c;
  }
  // Walk up from this module's directory looking for the docs root.
  let cur = HERE;
  for (let i = 0; i < 8; i++) {
    const guess = path.join(cur, 'docs', 'agp', 'schemas', 'v1');
    if (fs.existsSync(guess) && fs.statSync(guess).isDirectory()) return guess;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  throw new Error(
    'AGP v1 schemas directory not found. Pass options.schemaRoot or set AGP_VERIFIER_SCHEMA_ROOT.',
  );
}
