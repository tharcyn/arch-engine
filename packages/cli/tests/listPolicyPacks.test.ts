import { describe, test, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { listPolicyPacks } from '../src/listPolicyPacks';

// ═══════════════════════════════════════════════════════════
//  Phase 9B — Policy-Pack Discovery Surface
// ═══════════════════════════════════════════════════════════

describe('Phase 9B Policy-Pack Discovery Surface', () => {

  const entrySource = fs.readFileSync(
    path.resolve(__dirname, '../src/index.ts'),
    'utf-8'
  );

  test('policies_list_returns_known_pack_ids', async () => {
    const packs = await listPolicyPacks();
    expect(packs.length).toBeGreaterThan(0);
    expect(packs).toContain('authority-boundaries');
    expect(packs).toContain('rest-contract');
    expect(packs).toContain('journey-regression');
    expect(packs).toContain('naming-grammar');
    expect(packs).toContain('deployment-cascade');
  });

  test('policies_list_preserves_order', async () => {
    const packs = await listPolicyPacks();
    // Must preserve exact registry order (no sorting)
    expect(packs).toEqual([
      'authority-boundaries',
      'rest-contract',
      'journey-regression',
      'naming-grammar',
      'deployment-cascade'
    ]);
  });

  test('policies_list_prints_one_per_line', () => {
    // Verify index.ts correctly iterates and prints each
    expect(entrySource).toContain('for (const pack of packs) {');
    expect(entrySource).toContain('console.log(pack);');
    expect(entrySource).toContain('process.exit(0);');
  });
});
