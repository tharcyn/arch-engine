import * as fs from 'node:fs';
import * as path from 'node:path';
import type { PolicyRegistryLockfile } from '@arch-engine/core';
import { verifyPolicyRegistryLockfileSignature, StaticLockfileTrustStore } from '@arch-engine/core';
import { loadTrustPolicyConfig } from './loadTrustPolicyConfig.js';

export function readPolicyRegistryLockfile(options?: { verifyLockfileSignature?: boolean; json?: boolean }): PolicyRegistryLockfile | undefined {
  const file = path.resolve(process.cwd(), '.arch-engine/policy-lock.json');
  if (!fs.existsSync(file)) return undefined;

  let parsed: any;
  try {
    const content = fs.readFileSync(file, 'utf8');
    parsed = JSON.parse(content);
  } catch {
    // missing or corrupt -> undefined silently
    return undefined;
  }
  
  if (
    parsed && 
    typeof parsed === 'object' && 
    parsed.lockfileSurfaceVersion === '1.0.0' &&
    Array.isArray(parsed.registries)
  ) {
    if (options?.verifyLockfileSignature && !parsed.signature) {
      const diag = {
        success: false,
        evaluatedOperation: 'verify',
        canonicalPayloadSurface: 'none',
        failureReason: 'MISSING_SIGNATURE',
        message: 'Policy lockfile missing signature'
      };
      if (options?.json) {
        console.log(JSON.stringify(diag, null, 2));
      } else {
        console.log('Policy lockfile missing signature');
      }
      process.exit(1);
    }
    
    if (parsed.signature) {
      const trustConfig = loadTrustPolicyConfig();
      const trustedKeys = trustConfig.trustedLockfileKeys || {};
      const structuredSigners = trustConfig.lockfileSigners || {};
      const trustStore = new StaticLockfileTrustStore(trustedKeys, structuredSigners);
      
      const result = verifyPolicyRegistryLockfileSignature(file, parsed.signature, trustStore);
      if (!result.verified) {
        if (options?.json) {
            console.log(JSON.stringify(result.diagnostic, null, 2));
        } else if (result.error) {
            console.log(result.error);
        } else {
            console.log('Policy lockfile signature verification failed');
        }
        process.exit(1);
      }
    }
    
    return parsed as PolicyRegistryLockfile;
  }

  return undefined;
}
