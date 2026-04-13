import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Phase 8.9B: Protocol Version Single Source of Truth', () => {

  it('Test 1: protocolVersion_single_source_of_truth', () => {
     // Verify that exactly ONE export const _VERSION = 'X.X' exists across transport protocols explicitly.
     // In this case, we'll verify federation overlay does not hardcode '4.13' anymore
     
     const federationPath = path.resolve(__dirname, '../../src/adapters/federation-overlay-adapter.ts');
     const federationContent = fs.readFileSync(federationPath, 'utf-8');
     
     expect(federationContent).not.toContain(`!== '4.13'`);
     expect(federationContent).toContain('!== LOADER_PROTOCOL_VERSION');
  });

});
