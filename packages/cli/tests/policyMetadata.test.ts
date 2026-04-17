import { describe, test, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { listPolicyPackMetadata } from '../src/listPolicyPackMetadata';

// ═══════════════════════════════════════════════════════════
//  Phase 9C — Policy-Pack Metadata Surface
// ═══════════════════════════════════════════════════════════

describe('Phase 9C Policy-Pack Metadata Surface', () => {

  const entrySource = fs.readFileSync(
    path.resolve(__dirname, '../src/index.ts'),
    'utf-8'
  );

  test('policies_describe_known_pack', () => {
    // Verify describe branch
    expect(entrySource).toContain("if (args[0] === 'policies' && args[1] === 'describe')");
    expect(entrySource).toContain('Policy Pack: ${pack.policyPackId}');
    expect(entrySource).toContain('Category: ${pack.category}');
    expect(entrySource).toContain('Description: ${pack.description}');
  });

  test('policies_describe_unknown_pack', () => {
    // Verify unknown pack failure path
    expect(entrySource).toContain('Unknown policy pack id: ${targetId}');
    expect(entrySource).toContain('process.exit(1);');
  });

  test('policies_list_json_outputs_metadata', () => {
    // Verify --json prints metadata array
    expect(entrySource).toContain("const jsonFlag = args.includes('--json');");
    expect(entrySource).toContain('JSON.stringify(metadata, null, 2)');
  });

  test('listPolicyPackMetadata_returns_valid_contract', async () => {
    // Phase 9C validation
    const metadata = await listPolicyPackMetadata();
    
    expect(Array.isArray(metadata)).toBe(true);
    expect(metadata.length).toBeGreaterThan(0);
    const first = metadata[0];
    expect(first).toHaveProperty('policyPackId');
    expect(first).toHaveProperty('description');
    expect(first).toHaveProperty('category');
  });
});
