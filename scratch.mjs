import { assessLockfileRuntimeReadiness } from './packages/core/dist/index.js';
console.log(assessLockfileRuntimeReadiness({ version: '1.0.0', enforcementMode: 'permissive' }, 'path', undefined, [], undefined, {}, {}, {}, {}, undefined, undefined, [{ policyPackId: 'pack1', requiredDatasetCapabilities: [] }]));
