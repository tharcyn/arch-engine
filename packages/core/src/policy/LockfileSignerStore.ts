import * as fs from 'node:fs';
import type { LockfileSignerConfig, ResolvedSignerIdentity } from './LockfileSignerConfig';

export interface LockfileSignerStore {
  /**
   * Resolves a private key by its declared ID.
   * Return undefined if the key is unknown.
   */
  getPrivateKey(keyId: string): ResolvedSignerIdentity | undefined;
}

export class StaticLockfileSignerStore implements LockfileSignerStore {
  private readonly structuredSigners: Record<string, LockfileSignerConfig> = {};

  constructor(
    signerKeys?: Record<string, string>,
    structuredSigners?: Record<string, LockfileSignerConfig>
  ) {
    if (signerKeys) {
      for (const [keyId, key] of Object.entries(signerKeys)) {
        this.structuredSigners[keyId] = {
          key,
          algorithm: 'ed25519',
          enabled: true,
          allowedOperations: ['sign']
        };
      }
    }
    
    if (structuredSigners) {
      for (const [keyId, config] of Object.entries(structuredSigners)) {
        this.structuredSigners[keyId] = config;
      }
    }
  }

  getPrivateKey(keyId: string): ResolvedSignerIdentity | undefined {
    const config = this.structuredSigners[keyId];
    if (!config) return undefined;
    
    let pem: string | undefined;
    if (config.key.startsWith('-----BEGIN PRIVATE KEY-----')) {
        pem = config.key;
    } else {
        // Treat as path
        try {
            pem = fs.readFileSync(config.key, 'utf8');
        } catch {
            return undefined;
        }
    }

    return {
        pem,
        algorithm: config.algorithm || 'ed25519',
        enabled: config.enabled !== false,
        allowedOperations: config.allowedOperations || ['verify', 'sign'],
        role: config.role,
        status: config.status || 'active',
        replacementKeyId: config.replacementKeyId,
        note: config.note
    };
  }
}
