import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import { planCommand } from '../src/planCommand';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn((p) => {
      if (typeof p === 'string' && p.includes('.arch-engine/policies')) return true;
      if (typeof p === 'string' && p.includes('.arch-engine/registry.json')) return false;
      return actual.existsSync(p);
    }),
    statSync: vi.fn((p) => {
      if (typeof p === 'string' && p.includes('.arch-engine/policies')) return { isDirectory: () => true };
      return actual.statSync(p as any);
    }),
    readdirSync: vi.fn((p) => {
      if (typeof p === 'string' && p.includes('.arch-engine/policies')) {
        return ['execution.policy.json'];
      }
      return actual.readdirSync(p as any);
    }),
    readFileSync: vi.fn((p, enc) => {
      if (typeof p === 'string' && p.endsWith('execution.policy.json')) {
        return JSON.stringify({
          policyPackId: 'execution-pack',
          description: 'desc',
          category: 'cat',
          requiredDatasetCapabilities: ['supports_foo'],
          requiredMutationClasses: ['required_mutation_class']
        });
      }
      return actual.readFileSync(p as any, enc as any);
    }),
  };
});

describe('Phase 15B Plan CLI Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('outputs correct JSON for blocked plan', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    vi.mocked(fs.readFileSync).mockImplementation((p, enc) => {
        if (typeof p === 'string' && p.endsWith('topology-export.json')) {
            return JSON.stringify({ topology_dataset_identity: { dataset_id: 'test' } });
        }
        if (typeof p === 'string' && p.endsWith('execution.policy.json')) {
            return JSON.stringify({
                policyPackId: 'execution-pack',
                description: 'desc',
                category: 'cat',
                requiredDatasetCapabilities: ['supports_foo']
            });
        }
        if (typeof p === 'string' && p.endsWith('trust.json')) {
            return JSON.stringify({ 
                version: '1.0.0',
                enforcementMode: 'require-signature',
                lockfileSigners: { 'test': { key: 'foo', allowedOperations: ['verify'] } }
            });
        }
        return '';
    });
    vi.mocked(fs.existsSync).mockImplementation((p) => {
        if (typeof p === 'string' && p.endsWith('topology-export.json')) return true;
        if (typeof p === 'string' && p.includes('.arch-engine/policies')) return true;
        if (typeof p === 'string' && p.endsWith('trust.json')) return true;
        return false;
    });

    const exitCode = await planCommand(['--json']);
    expect(exitCode).toBe(1);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const jsonOutput = JSON.parse(consoleSpy.mock.calls[0][0]);
    
    expect(jsonOutput.allowed).toBe(false);
    expect(jsonOutput.overallPlanStatus).toBe('invalid');
    expect(jsonOutput.packResults[0].executionStatus).toBe('blocked');

    consoleSpy.mockRestore();
  });
  
  test('outputs human readable complete plan', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      vi.mocked(fs.readFileSync).mockImplementation((p, enc) => {
        if (typeof p === 'string' && p.endsWith('topology-export.json')) {
            return JSON.stringify({ topology_dataset_identity: { dataset_id: 'test' } });
        }
        if (typeof p === 'string' && p.endsWith('execution.policy.json')) {
            return JSON.stringify({
                policyPackId: 'execution-pack',
                description: 'desc',
                category: 'cat',
                requiredDatasetCapabilities: [] // no requirements -> compatible
            });
        }
        return '';
      });

      vi.mocked(fs.existsSync).mockImplementation((p) => {
          if (typeof p === 'string' && p.endsWith('topology-export.json')) return true;
          if (typeof p === 'string' && p.endsWith('trust.json')) return false; // Missing trust means permissive
          if (typeof p === 'string' && p.includes('.arch-engine/policies')) return true;
          return false;
      });

      const exitCode = await planCommand([]);
      expect(exitCode).toBe(0); // permissive allowed
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Execution Plan: COMPLETE'));

      consoleSpy.mockRestore();
  });
});
