import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import type { PolicyPackMetadata } from './PolicyPackMetadata';
import type { PolicyPackSignatureVerificationResult } from './PolicyPackSignatureVerificationResult';

// Verifies integrity of installed policy-pack.json
// using sha256 signatures declared in registry metadata
// enabling deterministic governance pack provenance validation
export function verifyPolicyPackSignature(
    metadata: PolicyPackMetadata,
    packagePath: string
): PolicyPackSignatureVerificationResult {
    if (!metadata.signature) {
        return { verified: true };
    }

    try {
        const content = fs.readFileSync(packagePath, 'utf8');
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        const actualSignature = `sha256:${hash}`;
        
        return {
            verified: actualSignature === metadata.signature,
            expectedSignature: metadata.signature,
            actualSignature
        };
    } catch {
        return {
            verified: false,
            expectedSignature: metadata.signature
        };
    }
}
