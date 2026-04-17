import * as fs from 'node:fs';
import * as path from 'node:path';
import { validateTrustPolicyConfig } from '@arch-engine/core';
import type { TrustPolicyConfig } from '@arch-engine/core';

// Loads workspace-level trust enforcement configuration
// enabling deterministic governance supply-chain protection
export function loadTrustPolicyConfig(): TrustPolicyConfig {
    const configPath = path.resolve(process.cwd(), '.arch-engine/trust.json');
    if (!fs.existsSync(configPath)) {
        return {};
    }

    try {
        const content = fs.readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(content);
        if (validateTrustPolicyConfig(parsed)) {
            return parsed;
        }
    } catch {
        // silently ignored
    }
    
    return {};
}
