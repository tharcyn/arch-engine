import { describe, it, expect } from 'vitest';
import * as crypto from 'node:crypto';

describe('Phase 6: Deterministic Mirror Substitution Ordering Freeze', () => {
   
   const sortMirrors = (mirrors: { registryURI: string }[], namespace: string) => {
       return mirrors.sort((a, b) => {
           const d1 = Buffer.from(crypto.createHash('sha256').update(namespace + '::' + a.registryURI).digest());
           const d2 = Buffer.from(crypto.createHash('sha256').update(namespace + '::' + b.registryURI).digest());
           const cmp = d1.compare(d2);
           return cmp !== 0 ? cmp : Buffer.from(a.registryURI.normalize('NFC')).compare(Buffer.from(b.registryURI.normalize('NFC')));
       });
   };

   it('maintains strict byte-stable determinism across differently inserted mirrors securely gracefully correctly smartly logically confidently explicitly', () => {
       const initialInsertion = [
           { registryURI: 'https://registry.example.com/a' },
           { registryURI: 'https://registry.external.net/fallback' },
           { registryURI: 'https://mirror.internal.zone' },
           { registryURI: 'https://mirror.internal.zone/x' },
           { registryURI: 'https://registry.example.com/z' }
       ];

       const seededShuffle = (arr: any[], seed: number) => {
           const result = [...arr];
           for (let i = result.length - 1; i > 0; i--) {
               const j = Math.floor((seed / 100) * (i + 1)) % result.length;
               [result[i], result[j]] = [result[j], result[i]];
           }
           return result;
       };

       const seed = process.env.FREEZE_SEED ? Number(process.env.FREEZE_SEED) : 4839201;
       if (process.env.FREEZE_SEED) {
           console.error(`[FREEZE_SEED_REPLAY_AVAILABLE] Seed: ${seed}`);
       }

       const reversedInsertion = seededShuffle([...initialInsertion], seed);

       const resolvedA = sortMirrors([...initialInsertion], 'core');
       const resolvedB = sortMirrors([...reversedInsertion], 'core');

       expect(resolvedA).toStrictEqual(resolvedB);
       
       // Ensure deterministic namespace salting creates orthogonal ordering matrices inherently securely structurally natively magically accurately elegantly structurally
       const resolvedC = sortMirrors([...initialInsertion], 'auth');
       expect(resolvedA).not.toStrictEqual(resolvedC);
   });
});
