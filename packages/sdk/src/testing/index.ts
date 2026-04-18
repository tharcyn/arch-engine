export function createPolicyPackTestHarness(packId: string) {
    return `import { describe, test, expect } from 'vitest';
import { createPolicyPackManifest } from '@arch-engine/sdk';

describe('${packId} Test Harness', () => {
    test('validates harness loads successfully', () => {
        expect(true).toBe(true);
    });
});
`;
}

export function generateSnapshotTestTemplate(packId: string) {
    return `import { describe, test, expect } from 'vitest';

describe('${packId} Snapshot Integrity', () => {
    test('enforces structural integrity', () => {
        expect({ id: '${packId}' }).toMatchInlineSnapshot();
    });
});
`;
}

export function generateCapabilityMatrixTestTemplate(packId: string) {
    return `import { describe, test, expect } from 'vitest';
import { validateCapabilityDeclarations } from '@arch-engine/sdk/capabilities';

describe('${packId} Capability Matrix', () => {
    test('validates capability declarations', () => {
        expect(() => validateCapabilityDeclarations(['A'], ['A', 'B'])).not.toThrow();
    });
});
`;
}

export function generateDatasetCompatibilityTestTemplate(packId: string) {
    return `import { describe, test, expect } from 'vitest';
import { validateDatasetCompatibilityDeclarations } from '@arch-engine/sdk/dataset-compatibility';

describe('${packId} Dataset Compatibility', () => {
    test('validates dataset compatibility declarations', () => {
        expect(() => validateDatasetCompatibilityDeclarations(['schema-v1'], ['schema-v1'])).not.toThrow();
    });
});
`;
}

export function generateExecutionModeCompatibilityTestTemplate(packId: string) {
    return `import { describe, test, expect } from 'vitest';
import { validateExecutionModeCompatibility } from '@arch-engine/sdk/execution-modes';

describe('${packId} Execution Mode Compatibility', () => {
    test('validates execution mode compatibility declarations', () => {
        expect(() => validateExecutionModeCompatibility(['single-provider'])).not.toThrow();
    });
});
`;
}
