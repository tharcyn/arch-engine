/**
 * ═══════════════════════════════════════════════════════════
 *  Badge Artifact Pipeline — Shields.io Endpoint Format
 * ═══════════════════════════════════════════════════════════
 *
 *  Week 5.5: Extended with theme overrides and endpoint metadata.
 *
 *  Generates JSON badge artifacts compatible with Shields.io
 *  /endpoint badge format for README embedding. Supports
 *  theme override via ARCH_ENGINE_BADGE_THEME environment var.
 *
 *  Output:
 *    .arch-engine/badges/stability.json
 *    .arch-engine/badges/confidence.json
 *    .arch-engine/badges/coverage.json
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ─── Types ──────────────────────────────────────────────

type StabilityTier = 'STABLE' | 'HEALTHY' | 'WARNING' | 'CRITICAL';
type ConfidenceLabel = 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
export type BadgeTheme = 'default' | 'dark' | 'mono' | 'enterprise';

export interface ShieldsBadge {
  schemaVersion: 1;
  label: string;
  message: string;
  color: string;
  // Endpoint metadata for dashboard ingestion
  generatedAt: string;
  engineVersion: string;
}

// ─── Theme Color Maps ───────────────────────────────────

interface ThemeColors {
  tier: Record<StabilityTier, string>;
  confidence: Record<ConfidenceLabel, string>;
  coverage: { high: string; medium: string; low: string; critical: string };
}

const THEMES: Record<BadgeTheme, ThemeColors> = {
  default: {
    tier: { STABLE: 'brightgreen', HEALTHY: 'green', WARNING: 'yellow', CRITICAL: 'red' },
    confidence: { HIGH: 'blue', MODERATE: 'purple', LOW: 'lightgrey', VERY_LOW: 'lightgrey' },
    coverage: { high: 'brightgreen', medium: 'green', low: 'yellow', critical: 'red' },
  },
  dark: {
    tier: { STABLE: '00e676', HEALTHY: '66bb6a', WARNING: 'ffc107', CRITICAL: 'ff5252' },
    confidence: { HIGH: '42a5f5', MODERATE: 'ab47bc', LOW: '9e9e9e', VERY_LOW: '757575' },
    coverage: { high: '00e676', medium: '66bb6a', low: 'ffc107', critical: 'ff5252' },
  },
  mono: {
    tier: { STABLE: 'e0e0e0', HEALTHY: 'bdbdbd', WARNING: '9e9e9e', CRITICAL: '616161' },
    confidence: { HIGH: 'e0e0e0', MODERATE: 'bdbdbd', LOW: '9e9e9e', VERY_LOW: '757575' },
    coverage: { high: 'e0e0e0', medium: 'bdbdbd', low: '9e9e9e', critical: '616161' },
  },
  enterprise: {
    tier: { STABLE: '009688', HEALTHY: '26a69a', WARNING: 'ff8f00', CRITICAL: 'd32f2f' },
    confidence: { HIGH: '1565c0', MODERATE: '6a1b9a', LOW: '78909c', VERY_LOW: '546e7a' },
    coverage: { high: '009688', medium: '26a69a', low: 'ff8f00', critical: 'd32f2f' },
  },
};

// ─── Theme Resolution ───────────────────────────────────

export function resolveTheme(): BadgeTheme {
  const env = process.env['ARCH_ENGINE_BADGE_THEME']?.toLowerCase();
  if (env && env in THEMES) return env as BadgeTheme;
  return 'default';
}

function getTheme(theme: BadgeTheme): ThemeColors {
  return THEMES[theme] ?? THEMES.default;
}

// ─── Badge Generators ───────────────────────────────────

export function createStabilityBadge(
  tier: StabilityTier,
  score: number,
  theme: BadgeTheme = 'default',
): ShieldsBadge {
  const colors = getTheme(theme);
  return {
    schemaVersion: 1,
    label: 'Architecture Stability',
    message: `${tier} (${(score * 100).toFixed(0)}%)`,
    color: colors.tier[tier] ?? 'lightgrey',
    generatedAt: new Date().toISOString(),
    engineVersion: '4.0.0',
  };
}

export function createConfidenceBadge(
  label: ConfidenceLabel,
  confidence: number,
  theme: BadgeTheme = 'default',
): ShieldsBadge {
  const colors = getTheme(theme);
  return {
    schemaVersion: 1,
    label: 'Topology Confidence',
    message: `${label} (${(confidence * 100).toFixed(0)}%)`,
    color: colors.confidence[label] ?? 'lightgrey',
    generatedAt: new Date().toISOString(),
    engineVersion: '4.0.0',
  };
}

export function createCoverageBadge(
  coverage: number,
  theme: BadgeTheme = 'default',
): ShieldsBadge {
  const colors = getTheme(theme);
  let color: string;
  if (coverage >= 0.80) color = colors.coverage.high;
  else if (coverage >= 0.60) color = colors.coverage.medium;
  else if (coverage >= 0.40) color = colors.coverage.low;
  else color = colors.coverage.critical;

  return {
    schemaVersion: 1,
    label: 'Topology Coverage',
    message: `${(coverage * 100).toFixed(0)}%`,
    color,
    generatedAt: new Date().toISOString(),
    engineVersion: '4.0.0',
  };
}

// ─── Badge Writer ───────────────────────────────────────

export interface BadgeWriteResult {
  stabilityPath: string;
  confidencePath: string;
  coveragePath: string;
}

/**
 * Write all badge JSON files to .arch-engine/badges/.
 * Resolves theme from ARCH_ENGINE_BADGE_THEME env var.
 */
export function writeBadges(
  rootDir: string,
  tier: StabilityTier,
  score: number,
  confLabel: ConfidenceLabel,
  confidence: number,
  coverage: number,
): BadgeWriteResult {
  const theme = resolveTheme();
  const badgeDir = path.join(rootDir, '.arch-engine', 'badges');
  if (!fs.existsSync(badgeDir)) {
    fs.mkdirSync(badgeDir, { recursive: true });
  }

  const stabilityBadge = createStabilityBadge(tier, score, theme);
  const confidenceBadge = createConfidenceBadge(confLabel, confidence, theme);
  const coverageBadge = createCoverageBadge(coverage, theme);

  const stabilityPath = path.join(badgeDir, 'stability.json');
  const confidencePath = path.join(badgeDir, 'confidence.json');
  const coveragePath = path.join(badgeDir, 'coverage.json');

  fs.writeFileSync(stabilityPath, JSON.stringify(stabilityBadge, null, 2), 'utf-8');
  fs.writeFileSync(confidencePath, JSON.stringify(confidenceBadge, null, 2), 'utf-8');
  fs.writeFileSync(coveragePath, JSON.stringify(coverageBadge, null, 2), 'utf-8');

  return { stabilityPath, confidencePath, coveragePath };
}
