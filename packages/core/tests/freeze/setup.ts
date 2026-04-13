/**
 * Global test setup for arch-engine freeze tests.
 *
 * F-6: Enable ALLOW_LEGACY_SIGNATURES during test runs to maintain backward
 * compatibility with existing tests that use the F-3 "sig:" prefix format.
 *
 * New F-6 tests explicitly disable this flag to validate envelope-based
 * signature verification.
 */
import { setAllowLegacySignatures } from '../../src/topology/overlaySignatureVerifier.js';

// Enable legacy signature support for all existing tests
setAllowLegacySignatures(true);
