import { assessFederationExecutionPreflight } from './packages/core/dist/index.js';
const res = assessFederationExecutionPreflight(
    { version: '1.0.0', enforcementMode: 'permissive' },
    'policy-lock.json',
    undefined,
    [],
    undefined, {}, {}, {}, {}, undefined, 
    [{ policyPackId: 'pack', requiredDatasetCapabilities: ['missing_cap'] } as any]
);
console.log(JSON.stringify(res, null, 2));
