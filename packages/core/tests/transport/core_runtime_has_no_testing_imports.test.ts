import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Phase 8.9B: SDK Workspace Cleanliness', () => {

  it('Test 1: core_runtime_has_no_testing_imports', () => {
     // Verify that src/ never imports from testing/ or references specific test hacks
     
     const scanDir = (dir: string) => {
         const files = fs.readdirSync(dir);
         for (const file of files) {
             const full = path.join(dir, file);
             if (fs.statSync(full).isDirectory()) {
                 scanDir(full);
             } else if (full.endsWith('.ts')) {
                 const content = fs.readFileSync(full, 'utf-8');
                 expect(content).not.toContain('from \'../../testing/');
                 expect(content).not.toContain('from \'../../../testing/');
                 expect(content).not.toContain('mockStore');
             }
         }
     }
     
     scanDir(path.resolve(__dirname, '../../src'));
  });

});
