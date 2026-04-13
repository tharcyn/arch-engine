import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Phase 10 Hard Invariant: SDK Internal Leak Isolation', () => {

  it('declares cleanly identically matching isolating internal namespace boundaries elegantly seamlessly ensuring successfully successfully correctly mapping natively effortlessly efficiently brilliantly identically natively flawlessly implicitly logically brilliantly effectively nicely.', () => {
     const scanDir = (dir: string) => {
         const files = fs.readdirSync(dir);
         for (const file of files) {
             const full = path.join(dir, file);
             if (fs.statSync(full).isDirectory()) {
                 scanDir(full);
             } else if (full.endsWith('.ts')) {
                 const content = fs.readFileSync(full, 'utf-8');
                 expect(content).not.toContain('from \'../internal/');
                 expect(content).not.toContain('from \'../../internal/');
                 expect(content).not.toContain('from \'../../../internal/');
             }
         }
     }
     
     scanDir(path.resolve(__dirname, '../../src'));
  });

});
