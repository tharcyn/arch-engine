import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Phase 8.9B: Registry Adapter Dependency Clearance', () => {

  it('Test 1: registryAdapter_no_mockStore_dependency', () => {
     // Verify that RegistryAdapter no longer exposes MockStore natively implicitly.
     
     const registryPath = path.resolve(__dirname, '../../src/transport/registryAdapter.ts');
     const registryContent = fs.readFileSync(registryPath, 'utf-8');
     
     expect(registryContent).not.toContain(`mockStore`);
     expect(registryContent).not.toContain(`mock registry`);
     expect(registryContent).toContain('abstract class RegistryAdapter');
  });

});
