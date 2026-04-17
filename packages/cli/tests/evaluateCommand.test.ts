import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import { evaluateCommand } from '../src/evaluateCommand';

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
          requiredDatasetCapabilities: ['supports_foo']
        });
      }
      return actual.readFileSync(p as any, enc as any);
    }),
  };
});

describe('Phase 16A Evaluate CLI Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('outputs correct JSON for evaluation result', async () => {
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

    const exitCode = await evaluateCommand(['--json']);
    expect(exitCode).toBe(1); // blocked plan causes evaluate error

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const jsonOutput = JSON.parse(consoleSpy.mock.calls[0][0]);
    
    expect(jsonOutput.executionPermitted).toBe(false);
    expect(jsonOutput.overallResult).toBe('invalid'); // preflight fails globally

    consoleSpy.mockRestore();
  });
  
  test('outputs human readable successful evaluation', async () => {
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

      const exitCode = await evaluateCommand([]);
      expect(exitCode).toBe(0); // permissive allowed, mock evaluator returns success
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Evaluation Result: SUCCESS'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('  [execution-pack] - Execution succeeded.'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Highest severity: none'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Findings: 0 errors, 0 warnings, 0 info'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Severity policy source: default'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Severity policy: error'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Evaluation accepted: true'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Policy Summary: Evaluation accepted cleanly by severity policy gate.'));

      consoleSpy.mockRestore();
  });

  test('loads policy from evaluation-policy.json file', async () => {
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
                requiredDatasetCapabilities: []
            });
        }
        if (typeof p === 'string' && p.endsWith('evaluation-policy.json')) {
            return JSON.stringify({
                defaultProfile: 'ci',
                profiles: {
                    base: {
                        defaultThreshold: 'error'
                    },
                    ci: {
                        extends: 'base',
                        defaultThreshold: 'warning',
                        categoryOverrides: { trust: 'info' }
                    },
                    local: {
                        defaultThreshold: 'none'
                    }
                }
            });
        }
        return '';
      });

      vi.mocked(fs.existsSync).mockImplementation((p) => {
          if (typeof p === 'string' && p.endsWith('topology-export.json')) return true;
          if (typeof p === 'string' && p.endsWith('trust.json')) return false;
          if (typeof p === 'string' && p.includes('.arch-engine/policies')) return true;
          if (typeof p === 'string' && p.endsWith('evaluation-policy.json')) return true;
          return false;
      });

      const exitCode = await evaluateCommand([]);
      expect(exitCode).toBe(0);
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Severity policy source: file'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Severity policy profile: ci (Inherits from: base)'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Severity policy: warning, category overrides: {"trust":"info"}'));

      consoleSpy.mockRestore();
  });

  test('loads explicit profile from evaluation-policy.json file', async () => {
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
                requiredDatasetCapabilities: []
            });
        }
        if (typeof p === 'string' && p.endsWith('evaluation-policy.json')) {
            return JSON.stringify({
                defaultProfile: 'ci',
                profiles: {
                    base: {
                        defaultThreshold: 'error'
                    },
                    ci: {
                        extends: 'base',
                        defaultThreshold: 'warning',
                        categoryOverrides: { trust: 'info' }
                    },
                    local: {
                        defaultThreshold: 'none'
                    }
                }
            });
        }
        return '';
      });

      vi.mocked(fs.existsSync).mockImplementation((p) => {
          if (typeof p === 'string' && p.endsWith('topology-export.json')) return true;
          if (typeof p === 'string' && p.endsWith('trust.json')) return false;
          if (typeof p === 'string' && p.includes('.arch-engine/policies')) return true;
          if (typeof p === 'string' && p.endsWith('evaluation-policy.json')) return true;
          return false;
      });

      const exitCode = await evaluateCommand(['--policy-profile', 'local']);
      expect(exitCode).toBe(0);
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Severity policy source: file'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Severity policy profile: local'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Severity policy: none'));

      consoleSpy.mockRestore();
  });
});
