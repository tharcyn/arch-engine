import { describe, it, expect } from 'vitest';
import { normalizeURI, serializeURI, URI_RESOLUTION_CONTRACT_VERSION } from '../src/policy/contracts/uriResolutionContract.js';

describe('Phase 3D: URI Parsing Determinism Freeze', () => {

  it('Test 1: exact namespace preservation', () => {
    const res = normalizeURI('policy://MySpace/Id123');
    expect(res.namespace).toBe('MySpace'); // No lowercasing
  });

  it('Test 2: exact id preservation', () => {
    const res = normalizeURI('policy://ns/ MyId ');
    expect(res.id).toBe(' MyId '); // No trimming
  });

  it('Test 3: exact version preservation', () => {
    const res = normalizeURI('policy://ns/id@v1.0.0-rc.1');
    expect(res.version).toBe('v1.0.0-rc.1');
    expect(res.range).toBeUndefined();
  });

  it('Test 4: range preservation', () => {
    const res = normalizeURI('policy://ns/id@^1.2.0');
    expect(res.range).toBe('^1.2.0');
    expect(res.version).toBeUndefined();
  });

  it('Test 5: round-trip serialization stability', () => {
    const str = 'policy://MyNS/MyId@>=2.0.0';
    const res = normalizeURI(str);
    const roundtrip = serializeURI(res);
    expect(roundtrip).toBe(str);
  });

  it('Test 6: Contract version matches exported constant', () => {
    expect(URI_RESOLUTION_CONTRACT_VERSION).toBe('v1');
  });

});
