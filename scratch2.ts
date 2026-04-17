import { assessFederationExecutionPreflight } from './packages/core/dist/index.js';
const res = assessFederationExecutionPreflight(
    { version: '1.0.0', enforcementMode: 'permissive' },
    'policy-lock.json',
    undefined,
    [],
    undefined, {}, {}, {}, {}, undefined, []
);
console.log(JSON.stringify(res, null, 2));
