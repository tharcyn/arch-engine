/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/cli — Auto-Discovery Heuristics
 * ═══════════════════════════════════════════════════════════
 *
 *  Provides fallback workspace detection rules to eliminate
 *  the need for explicit configuration on first run.
 */

import fs from 'node:fs';
import path from 'node:path';

export type WorkspaceType = 'nx' | 'pnpm' | 'lerna' | 'yarn' | 'git' | 'tsconfig' | 'folder' | 'none';

export interface DiscoveryResult {
  detectedType: WorkspaceType;
  confidence: number;
  isFallback: boolean;
  message: string;
}

export function discoverEnvironment(cwd: string): DiscoveryResult {
  // 1. Explicit Configs
  if (fs.existsSync(path.join(cwd, 'arch-engine.yml'))) {
    return { detectedType: 'none', confidence: 1.0, isFallback: false, message: 'Explicit arch-engine.yml configuration detected' };
  }

  // 2. Workspace Config Fallbacks
  if (fs.existsSync(path.join(cwd, 'nx.json'))) {
    return { detectedType: 'nx', confidence: 0.95, isFallback: true, message: 'Nx Workspace configuration detected (Fallback)' };
  }
  
  if (fs.existsSync(path.join(cwd, 'pnpm-workspace.yaml'))) {
    return { detectedType: 'pnpm', confidence: 0.90, isFallback: true, message: 'pnpm-workspace.yaml detected (Fallback)' };
  }
  
  if (fs.existsSync(path.join(cwd, 'lerna.json'))) {
    return { detectedType: 'lerna', confidence: 0.90, isFallback: true, message: 'lerna.json detected (Fallback)' };
  }

  const pkgJsonPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      if (pkg.workspaces) {
        return { detectedType: 'yarn', confidence: 0.85, isFallback: true, message: 'package.json workspaces detected (Fallback)' };
      }
    } catch {}
  }

  // 3. Git Root + Convention Fallbacks
  if (fs.existsSync(path.join(cwd, '.git'))) {
    if (fs.existsSync(path.join(cwd, 'packages')) || fs.existsSync(path.join(cwd, 'apps'))) {
      return { detectedType: 'git', confidence: 0.70, isFallback: true, message: 'Git root with packages/apps clustering detected (Fallback)' };
    }
  }

  // 4. TSConfig Project References
  if (fs.existsSync(path.join(cwd, 'tsconfig.json'))) {
    try {
      const tsc = JSON.parse(fs.readFileSync(path.join(cwd, 'tsconfig.json'), 'utf-8'));
      if (tsc.references && Array.isArray(tsc.references)) {
        return { detectedType: 'tsconfig', confidence: 0.80, isFallback: true, message: 'tsconfig.json project references detected (Fallback)' };
      }
    } catch {}
  }

  // 5. Deep Fallback
  return { detectedType: 'folder', confidence: 0.42, isFallback: true, message: 'Heuristic folder depth clustering active (Low Confidence Fallback)' };
}
