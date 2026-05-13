/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/agp-emitter — Filesystem wrapper
 * ═══════════════════════════════════════════════════════════
 *
 *  Reads an Arch-Engine JSON v2 envelope from disk, runs the pure
 *  `emitAgpBundle` function, and writes `snapshot.json` +
 *  `records.ndjson` into the output directory.
 *
 *  Refuses non-empty output dirs unless `force: true`.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { emitAgpBundle } from './emitAgpBundle.js';
import { AgpEmitterError } from './errors.js';
import type { AgpBundleResult, AgpEmitterOptions } from './types.js';

export interface EmitAgpBundleToDirectoryOptions extends AgpEmitterOptions {
  readonly force?: boolean;
}

export interface EmitAgpBundleToDirectoryResult extends AgpBundleResult {
  readonly outputDir: string;
  readonly snapshotPath: string;
  readonly recordsPath: string;
}

export function emitAgpBundleToDirectory(args: {
  readonly inputPath: string;
  readonly outputDir: string;
  readonly options?: EmitAgpBundleToDirectoryOptions;
}): EmitAgpBundleToDirectoryResult {
  const { inputPath, outputDir } = args;
  const options = args.options ?? {};

  if (!fs.existsSync(inputPath)) {
    throw new AgpEmitterError({
      code: 'AGP_EMITTER_INPUT_PARSE_FAILED',
      message: `Input file not found: ${path.basename(inputPath)}`,
      fix: 'Pass an existing Arch-Engine JSON v2 report path via --from.',
    });
  }
  let raw: Buffer;
  try {
    raw = fs.readFileSync(inputPath);
  } catch (err) {
    throw new AgpEmitterError({
      code: 'AGP_EMITTER_INPUT_PARSE_FAILED',
      message: `Failed to read input: ${(err as Error).message}`,
    });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString('utf8'));
  } catch (err) {
    throw new AgpEmitterError({
      code: 'AGP_EMITTER_INPUT_PARSE_FAILED',
      message: `Input is not valid JSON: ${(err as Error).message}`,
      fix: 'The input must be a valid JSON file containing an Arch-Engine JSON v2 envelope.',
    });
  }

  // Pre-flight on the output directory.
  if (fs.existsSync(outputDir)) {
    const stat = fs.statSync(outputDir);
    if (!stat.isDirectory()) {
      throw new AgpEmitterError({
        code: 'AGP_EMITTER_OUTPUT_DIR_NOT_EMPTY',
        message: `Output path exists and is not a directory: ${path.basename(outputDir)}`,
      });
    }
    const entries = fs.readdirSync(outputDir).filter((n) => n !== '.' && n !== '..');
    if (entries.length > 0 && options.force !== true) {
      throw new AgpEmitterError({
        code: 'AGP_EMITTER_OUTPUT_DIR_NOT_EMPTY',
        message: `Output directory is not empty: ${path.basename(outputDir)}`,
        fix: 'Empty the directory or pass --force to overwrite.',
        details: { observed: entries.slice(0, 5) },
      });
    }
  }

  const bundle = emitAgpBundle(parsed, raw, options);

  fs.mkdirSync(outputDir, { recursive: true });
  const snapshotPath = path.join(outputDir, 'snapshot.json');
  const recordsPath = path.join(outputDir, 'records.ndjson');
  fs.writeFileSync(snapshotPath, bundle.snapshotJson, { encoding: 'utf8' });
  fs.writeFileSync(recordsPath, bundle.recordsNdjson, { encoding: 'utf8' });

  return {
    ...bundle,
    outputDir,
    snapshotPath,
    recordsPath,
  };
}
