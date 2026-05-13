/**
 * ═══════════════════════════════════════════════════════════
 *  Schema validation tests for @arch-engine/agp-emitter
 * ═══════════════════════════════════════════════════════════
 *
 *  Loads the AGP v1 JSON Schemas from `docs/agp/schemas/v1/`
 *  via Ajv (Draft 2020-12) and validates every emitter output
 *  against:
 *    - snapshot.schema.json (snapshot.json contents)
 *    - record.schema.json (each record from records.ndjson)
 *
 *  The base record.schema.json uses `$ref` to dispatch to per-family
 *  schemas; Ajv resolves them automatically once all schemas are
 *  added with `addSchema()`.
 */

import { describe, expect, test } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';

import { emitAgpBundle } from '../src/index.js';

const SCHEMAS_DIR = path.resolve(__dirname, '..', '..', '..', 'docs', 'agp', 'schemas', 'v1');
const FIX_DIR = path.join(__dirname, 'fixtures', 'input');

function loadSchemas(): Ajv2020 {
  const ajv = new Ajv2020({
    strict: false,
    allErrors: true,
    validateFormats: true,
  });
  for (const entry of fs.readdirSync(SCHEMAS_DIR)) {
    if (!entry.endsWith('.schema.json')) continue;
    const obj = JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, entry), 'utf8'));
    ajv.addSchema(obj);
  }
  return ajv;
}

const ajv = loadSchemas();
const validateSnapshot = ajv.getSchema('https://arch-engine.dev/agp/v1/snapshot.schema.json');
const validateRecord = ajv.getSchema('https://arch-engine.dev/agp/v1/record.schema.json');

function readInput(name: string): { parsed: unknown; raw: Buffer } {
  const raw = fs.readFileSync(path.join(FIX_DIR, name));
  return { parsed: JSON.parse(raw.toString('utf8')), raw };
}

describe('emitAgpBundle — schema validation', () => {
  test('Ajv loads all 13 v1 schemas', () => {
    expect(validateSnapshot).toBeDefined();
    expect(validateRecord).toBeDefined();
  });

  const fixtures = [
    'minimal-monorepo.json',
    'pnpm-workspace.json',
    'yarn-pnp-workspace.json',
    'check-with-finding.json',
    'check-with-drift.json',
  ] as const;

  for (const name of fixtures) {
    test(`${name}: snapshot.json validates against snapshot.schema.json`, () => {
      const { parsed, raw } = readInput(name);
      const bundle = emitAgpBundle(parsed, raw, { deterministic: true });
      const ok = validateSnapshot!(bundle.snapshot);
      if (!ok) {
        console.error(`Snapshot validation errors for ${name}:`, validateSnapshot!.errors);
      }
      expect(ok).toBe(true);
    });

    test(`${name}: every record validates against record.schema.json`, () => {
      const { parsed, raw } = readInput(name);
      const bundle = emitAgpBundle(parsed, raw, { deterministic: true });
      for (const r of bundle.records) {
        const ok = validateRecord!(r);
        if (!ok) {
          console.error(`Record validation errors for ${name} / ${r.id}:`, validateRecord!.errors);
        }
        expect(ok).toBe(true);
      }
    });
  }
});
