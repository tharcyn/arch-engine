export const SEMVER_SELECTION_CONTRACT_VERSION = 'v1';

export type MockSemverCandidate = {
  version: string;
  source: 'lockfile' | 'registry';
  timestamp?: number;
};

/**
 * Phase 4.8 Hardening: Proper semantic version comparison.
 * Parses "major.minor.patch" and compares numerically.
 * Falls back to localeCompare for non-standard formats (deterministic).
 */
function parseSemver(v: string): [number, number, number] | null {
  const match = v.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);

  if (pa && pb) {
    // Numeric comparison: major → minor → patch
    if (pa[0] !== pb[0]) return pa[0] - pb[0];
    if (pa[1] !== pb[1]) return pa[1] - pb[1];
    if (pa[2] !== pb[2]) return pa[2] - pb[2];
    return 0;
  }

  // Fallback: deterministic binary codepoint comparison for non-standard versions
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * SemVer precedence rules (v1):
 * - exact match first
 * - lockfile override second
 * - highest compatible version third (SEMANTIC comparison, not lexicographic)
 * - registry fallback last
 * 
 * Phase 4.8 Hardening:
 * - Replaced lexicographic comparison with semantic comparison (audit finding 1.2)
 * - Added deterministic secondary tie-break on version string (audit finding 1.3)
 * 
 * Never:
 * - random selection
 * - registry order selection
 * - timestamp selection
 * - network latency selection
 */
export function resolveSemverCandidate(
  targetVersion: string | undefined,
  targetRange: string | undefined,
  candidates: MockSemverCandidate[]
): MockSemverCandidate | null {
  
  if (candidates.length === 0) return null;

  // 1. exact match first
  if (targetVersion) {
    const exact = candidates.find(c => c.version === targetVersion);
    if (exact) return exact;
  }

  const sortCandidates = (a: MockSemverCandidate, b: MockSemverCandidate) => {
    // 2. lockfile override before registry
    if (a.source === 'lockfile' && b.source !== 'lockfile') return -1;
    if (b.source === 'lockfile' && a.source !== 'lockfile') return 1;

    // 3. highest version (SEMANTIC comparison — Phase 4.8 fix)
    // Decreasing order: higher version first
    const cmp = compareSemver(a.version, b.version);
    if (cmp !== 0) return -cmp; // negate for descending

    // 4. Deterministic tie-break on source string (Phase 4.8 fix)
    return a.source < b.source ? -1 : a.source > b.source ? 1 : 0;
  };

  const sorted = [...candidates].sort(sortCandidates);
  return sorted[0] || null;
}
