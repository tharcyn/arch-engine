import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * ═══════════════════════════════════════════════════════════
 *  Public Types Surface — Declaration File Freeze Contract
 * ═══════════════════════════════════════════════════════════
 *
 *  Runtime exports and type exports can drift independently.
 *  Since this is a governance engine, type-surface drift
 *  equals contract drift.
 *
 *  This test snapshots the .d.ts signature files for all
 *  approved export entry points, converting the API freeze
 *  contract from documented to enforced.
 */

const DIST_DIR = path.resolve(__dirname, '../dist');

const APPROVED_DECLARATION_SURFACES = [
  'index.d.ts',
  'analysis.d.ts',
  'parsers.d.ts',
];

const FORBIDDEN_DECLARATION_SURFACES = [
  'identity.d.ts',
  'identity.d.cts',
];

describe('public types surface — declaration file freeze contract', () => {

  for (const dtsFile of APPROVED_DECLARATION_SURFACES) {
    it(`${dtsFile} exists and snapshot is stable`, () => {
      const filePath = path.join(DIST_DIR, dtsFile);
      expect(fs.existsSync(filePath), `Missing declaration file: ${dtsFile}`).toBe(true);

      const contents = fs.readFileSync(filePath, 'utf-8');
      expect(contents).toMatchSnapshot();
    });
  }

  for (const dtsFile of FORBIDDEN_DECLARATION_SURFACES) {
    it(`${dtsFile} must not exist (identity surface sealed)`, () => {
      const filePath = path.join(DIST_DIR, dtsFile);
      expect(
        fs.existsSync(filePath),
        `IDENTITY TYPE SURFACE LEAK: dist/${dtsFile} exists`
      ).toBe(false);
    });
  }

  it('declaration files do not export identity symbols', () => {
    const indexDts = fs.readFileSync(path.join(DIST_DIR, 'index.d.ts'), 'utf-8');
    const analysisDts = fs.readFileSync(path.join(DIST_DIR, 'analysis.d.ts'), 'utf-8');
    const parsersDts = fs.readFileSync(path.join(DIST_DIR, 'parsers.d.ts'), 'utf-8');

    const allDts = indexDts + analysisDts + parsersDts;

    // These identity symbols must never appear as exports in any approved .d.ts
    const forbiddenExports = [
      'generateEntityId',
      'EntityResolver',
      'RouteIdentityBuilder',
      'IndexedEntity',
    ];

    for (const symbol of forbiddenExports) {
      // Match export declarations specifically — not internal type references
      const exportPattern = new RegExp(`export\\s+.*\\b${symbol}\\b`);
      expect(
        exportPattern.test(allDts),
        `Identity symbol '${symbol}' leaked into approved declaration surface`
      ).toBe(false);
    }
  });
});
