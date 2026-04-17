import * as fs from 'node:fs';
import * as path from 'node:path';
import { normalizeRepositoryHint } from './normalizeRepositoryHint.js';

export interface RepositoryHintResolution {
    hint?: string;
    source: 'env' | 'package-json' | 'undefined';
}

export function resolveRepositoryHint(): RepositoryHintResolution {
    if (process.env.ARCH_ENGINE_REPOSITORY_HINT) {
        return {
            hint: normalizeRepositoryHint(process.env.ARCH_ENGINE_REPOSITORY_HINT),
            source: 'env'
        };
    }
    
    try {
        const pkgPath = path.resolve(process.cwd(), 'package.json');
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            if (pkg && pkg.name) {
                return {
                    hint: normalizeRepositoryHint(pkg.name),
                    source: 'package-json'
                };
            }
        }
    } catch {
        // ignore errors
    }
    
    return { source: 'undefined' };
}
