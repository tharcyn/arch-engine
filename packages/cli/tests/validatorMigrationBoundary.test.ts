import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Phase 3A Final: Validator Migration Boundary', () => {
  it('Test 4: legacy checksum migration occurs only inside snapshot-validator.ts', () => {
    const rootDir = process.cwd();
    const validatorPath = path.join(rootDir, 'packages/cli/src/snapshot-validator.ts');
    const actionPath = path.join(rootDir, 'action/src/action.ts');
    const parserPath = path.join(rootDir, 'packages/core/src/policy/parser.ts');
    const resolverPath = path.join(rootDir, 'packages/core/src/policy/compositionResolver.ts');
    
    expect(fs.existsSync(validatorPath)).toBe(true);
    
    // Check that migration logic exists in snapshot-validator
    const validatorCode = fs.readFileSync(validatorPath, 'utf8');
    expect(validatorCode).toContain('legacyComputed === pe.stackOrderingChecksum');
    // Ensure "Auto-migrate in-memory" string is present as comment
    expect(validatorCode).toContain('Auto-migrate in-memory');

    // Check that such logic is completely absent in action, parser, resolver
    if (fs.existsSync(actionPath)) {
      expect(fs.readFileSync(actionPath, 'utf8')).not.toContain('legacyComputed ===');
    }
    if (fs.existsSync(parserPath)) {
      expect(fs.readFileSync(parserPath, 'utf8')).not.toContain('legacyComputed ===');
    }
    if (fs.existsSync(resolverPath)) {
      expect(fs.readFileSync(resolverPath, 'utf8')).not.toContain('legacyComputed ===');
    }
  });
});
