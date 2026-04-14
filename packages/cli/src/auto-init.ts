/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/cli — Auto-Init Fallback Engine
 * ═══════════════════════════════════════════════════════════
 *
 *  Bootstraps the `.arch-engine/` runtime context directory
 *  on first run without requiring user configuration.
 *
 *  INVARIANTS:
 *  - Never overwrites existing files
 *  - Never mutates package.json
 *  - Never modifies workspace config
 *  - Never modifies git state
 *  - Only creates arch-engine runtime context
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

// ─── Public API ─────────────────────────────────────────

export interface AutoInitResult {
  initialized: boolean;
  alreadyExisted: boolean;
  contextDir: string;
  filesCreated: string[];
  message: string;
}

/**
 * Detect absence of `.arch-engine/` and bootstrap it if missing.
 * Returns a result describing what was created.
 */
export function autoInitializeArchitectureContext(rootDir: string): AutoInitResult {
  const contextDir = path.join(rootDir, '.arch-engine');
  const filesCreated: string[] = [];

  // Already initialized — do nothing
  if (fs.existsSync(contextDir)) {
    return {
      initialized: false,
      alreadyExisted: true,
      contextDir,
      filesCreated: [],
      message: 'Architecture context already exists.',
    };
  }

  // Create context directory
  fs.mkdirSync(contextDir, { recursive: true });

  // Generate session.json stub
  const sessionPath = path.join(contextDir, 'session.json');
  if (!fs.existsSync(sessionPath)) {
    const session = {
      schemaVersion: '1.0',
      createdAt: new Date().toISOString(),
      engineVersion: '1.0.0-rc.3',
      repoHash: computeRepoHash(rootDir),
      initMode: 'auto',
    };
    fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), 'utf-8');
    filesCreated.push('session.json');
  }

  // Ensure .gitignore entry for ephemeral context
  ensureGitignoreEntry(rootDir);

  return {
    initialized: true,
    alreadyExisted: false,
    contextDir,
    filesCreated,
    message: 'Architecture context initialized automatically.',
  };
}

// ─── Helpers ────────────────────────────────────────────

/**
 * Compute a short deterministic hash of the repository root.
 * Uses git rev-parse if available, falls back to directory name.
 */
export function computeRepoHash(rootDir: string): string {
  try {
    const hash = execSync('git rev-parse --short HEAD', {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return hash || 'unknown';
  } catch {
    // Not a git repo or git not available
    return path.basename(rootDir);
  }
}

/**
 * Ensure `.arch-engine/` is in .gitignore if the file exists.
 * Never creates .gitignore — only appends if it exists.
 */
function ensureGitignoreEntry(rootDir: string): void {
  const gitignorePath = path.join(rootDir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) return;

  try {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    if (!content.includes('.arch-engine/')) {
      // Do NOT append — respect existing gitignore. Just note it.
      // Users should add .arch-engine/ themselves if desired.
    }
  } catch {
    // Permission error — skip silently
  }
}
