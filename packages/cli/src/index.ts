/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/cli — Check Command Entry
 * ═══════════════════════════════════════════════════════════
 *
 *  Minimal CLI adapter for the `check` command.
 *  Parses arguments, delegates to runCheckCommand, and
 *  translates the returned exit code into process.exit().
 *
 *  Usage:
 *    arch-engine check <datasetPath> [--baseline <path>] [--write-baseline <path>] [--json] [--explain]
 *
 *  Phase 6F — CLI Command Adapter Layer
 *  Phase 7A — Baseline Comparison Surface
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { preflightCommand } from './preflightCommand.js';
import { planCommand } from './planCommand.js';
import { evaluateCommand } from './evaluateCommand.js';
import { inspectFindingsCommand } from './inspectFindingsCommand.js';
import { suggestPolicyCommand } from './suggestPolicyCommand.js';
import { lintFindingsCommand } from './lintFindingsCommand.js';
import { generatePolicyPatchCommand } from './generatePolicyPatchCommand.js';
import { applyPolicyPatchCommand } from './applyPolicyPatchCommand.js';
import { exportPolicyPatchCommand } from './exportPolicyPatchCommand.js';

export { runCheckCommand, selectOutputFormat, isSnapshotInput } from './runCheckCommand';
export type { ExecutionInputMode } from './ExecutionInputMode';
export { detectExecutionInputMode } from './detectExecutionInputMode';

// ─── CLI Entry Logic ─────────────────────────────────────
// Only executes when this module is run as a script.

function parseCheckArgs(argv: string[]): {
  datasetPath: string | undefined;
  baseline: string | undefined;
  writeBaseline: string | undefined;
  json: boolean;
  explain: boolean;
  baselineMissingValue: boolean;
  writeBaselineMissingValue: boolean;
  policy: string[];
  writeLockfile: boolean;
  useLockfile: boolean;
  refreshLockfile: boolean;
  diffLockfile: boolean;
  verifyLockfileSignature: boolean;
} {
  // Skip node binary and script path
  const args = argv.slice(2);

  // Remove "check" command name if present
  const commandArgs = args[0] === 'check' ? args.slice(1) : args;

  let datasetPath: string | undefined;
  let baseline: string | undefined;
  let writeBaseline: string | undefined;
  let json = false;
  let explain = false;
  let driftGate = false;
  let baselineMissingValue = false;
  let writeBaselineMissingValue = false;
  const policy: string[] = [];
  let writeLockfile = false;
  let useLockfile = false;
  let refreshLockfile = false;
  let diffLockfile = false;
  let verifyLockfileSignature = false;

  for (let i = 0; i < commandArgs.length; i++) {
    const arg = commandArgs[i];

    if (arg === '--json') {
      json = true;
    } else if (arg === '--explain') {
      explain = true;
    } else if (arg === '--drift-gate') {
      driftGate = true;
    } else if (arg === '--baseline') {
      const next = commandArgs[i + 1];
      if (next && !next.startsWith('-')) {
        baseline = next;
        i++; // skip consumed value
      } else {
        baselineMissingValue = true;
      }
    } else if (arg.startsWith('--baseline=')) {
      const value = arg.slice('--baseline='.length);
      if (value) {
        baseline = value;
      } else {
        baselineMissingValue = true;
      }
    } else if (arg === '--write-baseline') {
      const next = commandArgs[i + 1];
      if (next && !next.startsWith('-')) {
        writeBaseline = next;
        i++; // skip consumed value
      } else {
        writeBaselineMissingValue = true;
      }
    } else if (arg.startsWith('--write-baseline=')) {
      const value = arg.slice('--write-baseline='.length);
      if (value) {
        writeBaseline = value;
      } else {
        writeBaselineMissingValue = true;
      }
    } else if (arg === '--policy') {
      const next = commandArgs[i + 1];
      if (next && !next.startsWith('-')) {
        policy.push(next);
        i++; // skip consumed value
      }
    } else if (arg.startsWith('--policy=')) {
      const value = arg.slice('--policy='.length);
      if (value) {
        policy.push(value);
      }
    } else if (arg === '--write-lockfile') {
      writeLockfile = true;
    } else if (arg === '--use-lockfile') {
      useLockfile = true;
    } else if (arg === '--refresh-lockfile') {
      refreshLockfile = true;
    } else if (arg === '--diff-lockfile') {
      diffLockfile = true;
    } else if (arg === '--verify-lockfile-signature') {
      verifyLockfileSignature = true;
    } else if (!arg.startsWith('-') && !datasetPath) {
      datasetPath = arg;
    }
  }

  if (verifyLockfileSignature && (writeLockfile || refreshLockfile)) {
    console.log('Cannot use --verify-lockfile-signature with --write-lockfile or --refresh-lockfile');
    process.exit(1);
  }

  if (diffLockfile && (writeLockfile || refreshLockfile || useLockfile)) {
    console.log('Cannot use --diff-lockfile with --write-lockfile, --refresh-lockfile, or --use-lockfile');
    process.exit(1);
  }

  if (useLockfile && refreshLockfile) {
    console.log('Cannot use --refresh-lockfile and --use-lockfile together');
    process.exit(1);
  }

  return { datasetPath, baseline, writeBaseline, json, explain, driftGate, baselineMissingValue, writeBaselineMissingValue, policy, writeLockfile, useLockfile, refreshLockfile, diffLockfile, verifyLockfileSignature };
}

/**
 * CLI entry function.
 * Parses process.argv and calls process.exit with the
 * returned exit code from runCheckCommand.
 *
 * This is the ONLY location where process.exit() is permitted.
 */
export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args[0] === 'policies' && args[1] === 'sign-lockfile') {
    const keyId = args[2];
    const jsonFlag = args.includes('--json');
    if (!keyId) {
      if (jsonFlag) {
        console.log(JSON.stringify({
          success: false,
          evaluatedOperation: 'sign',
          canonicalPayloadSurface: 'none',
          failureReason: 'UNKNOWN_SIGNER',
          message: 'Usage: arch-engine policies sign-lockfile <keyId>'
        }, null, 2));
      } else {
        console.log('Usage: arch-engine policies sign-lockfile <keyId>');
      }
      process.exit(1);
      return;
    }

    const { readPolicyRegistryLockfile } = await import('./readPolicyRegistryLockfile.js');
    // Load without verification just to sign it
    const lockfile = readPolicyRegistryLockfile({ json: jsonFlag });
    if (!lockfile) {
      if (jsonFlag) {
        console.log(JSON.stringify({
          success: false,
          evaluatedOperation: 'sign',
          canonicalPayloadSurface: 'none',
          failureReason: 'MISSING_SIGNATURE',
          message: 'Policy lockfile not found or corrupt'
        }, null, 2));
      } else {
        console.log('Policy lockfile not found or corrupt');
      }
      process.exit(1);
      return;
    }

    const { signPolicyRegistryLockfile, StaticLockfileSignerStore } = await import('@arch-engine/core');
    const { loadTrustPolicyConfig } = await import('./loadTrustPolicyConfig.js');
    const trustConfig = loadTrustPolicyConfig();
    const signerStore = new StaticLockfileSignerStore(
        trustConfig.signerLockfileKeys || {},
        trustConfig.lockfileSigners || {}
    );

    const signResult = signPolicyRegistryLockfile(lockfile, keyId, signerStore);
    if (!signResult.success) {
      if (jsonFlag) {
        console.log(JSON.stringify(signResult.diagnostic, null, 2));
      } else {
        console.log(signResult.error);
      }
      process.exit(1);
      return;
    }

    const dir = path.resolve(process.cwd(), '.arch-engine');
    const dest = path.join(dir, 'policy-lock.json');
    const tempFile = path.join(dir, `policy-lock.json.tmp.${Date.now()}`);
    fs.writeFileSync(tempFile, JSON.stringify(signResult.lockfile, null, 2) + '\n', 'utf8');
    fs.renameSync(tempFile, dest);
    
    if (jsonFlag) {
        console.log(JSON.stringify(signResult.diagnostic, null, 2));
    } else {
        console.log(`Successfully signed policy-lock.json with key ${keyId}`);
    }
    process.exit(0);
    return;
  }

  if (args[0] === 'policies' && args[1] === 'assess-lockfile') {
    const jsonFlag = args.includes('--json');
    const { loadRemotePolicyPackMetadata } = await import('./loadRemotePolicyPackMetadata.js');
    const { readPolicyRegistryLockfile } = await import('./readPolicyRegistryLockfile.js');
    const { assessPolicyRegistryLockfileFreshness, verifyPolicyRegistryLockfileSignature, StaticLockfileTrustStore } = await import('@arch-engine/core');
    const { loadTrustPolicyConfig } = await import('./loadTrustPolicyConfig.js');

    const remoteResult = await loadRemotePolicyPackMetadata({ useLockfile: false, verifyLockfileSignature: false });
    const lockfile = readPolicyRegistryLockfile({ verifyLockfileSignature: false }); // don't abort on verification fail

    const diagnostic = assessPolicyRegistryLockfileFreshness(remoteResult.lockEntries, lockfile);
    
    // Supplement with trust status if lockfile is present
    let isTrusted = false;
    let trustDiagnostic = null;
    let finalMessage = diagnostic.message;

    if (lockfile && lockfile.signature) {
        const trustConfig = loadTrustPolicyConfig();
        const trustStore = new StaticLockfileTrustStore(trustConfig.trustedLockfileKeys || {}, trustConfig.lockfileSigners || {});
        const verifyResult = verifyPolicyRegistryLockfileSignature(
            require('path').resolve(process.cwd(), '.arch-engine/policy-lock.json'), 
            lockfile.signature, 
            trustStore
        );
        isTrusted = verifyResult.verified;
        trustDiagnostic = verifyResult.diagnostic;

        if (!isTrusted) {
            finalMessage = 'Lockfile is untrusted or invalid signature';
        } else {
            finalMessage = diagnostic.isFresh ? 'Lockfile is signed, trusted, and fresh' : 'Lockfile is signed and trusted, but stale';
        }
    } else if (lockfile && !lockfile.signature) {
        finalMessage = diagnostic.isFresh ? 'Lockfile is unsigned but fresh' : 'Lockfile is unsigned and stale';
    }

    const output = {
        ...diagnostic,
        message: finalMessage,
        isTrusted,
        trustDiagnostic
    };

    if (jsonFlag) {
        console.log(JSON.stringify(output, null, 2));
    } else {
        console.log(finalMessage);
        if (output.driftSummary) {
            console.log(`Drift: ${output.driftSummary}`);
        }
        if (trustDiagnostic && !trustDiagnostic.success && lockfile?.signature) {
            console.log(`Trust Error: ${trustDiagnostic.message}`);
        }
    }

    // Exit code 1 if missing, invalid, or stale
    if (!diagnostic.lockfilePresent || diagnostic.changeDetected || (lockfile?.signature && !isTrusted)) {
        process.exit(1);
    } else {
        process.exit(0);
    }
    return;
  }

  if (args[0] === 'policies' && args[1] === 'preflight') {
    const exitCode = await preflightCommand(args.slice(2));
    process.exit(exitCode);
    return;
  }

  if (args[0] === 'policies' && args[1] === 'plan') {
    const exitCode = await planCommand(args.slice(2));
    process.exit(exitCode);
    return;
  }

  if (args[0] === 'policies' && args[1] === 'evaluate') {
    const exitCode = await evaluateCommand(args.slice(2));
    process.exit(exitCode);
    return;
  }

  if (args[0] === 'policies' && args[1] === 'inspect-findings') {
    await inspectFindingsCommand(args.slice(2));
    process.exit(0);
    return;
  }

  if (args[0] === 'policies' && args[1] === 'suggest-policy') {
    await suggestPolicyCommand(args.slice(2));
    process.exit(0);
    return;
  }

  if (args[0] === 'policies' && args[1] === 'lint-findings') {
    await lintFindingsCommand(args.slice(2));
    process.exit(0);
    return;
  }

  if (args[0] === 'policies' && args[1] === 'generate-policy-patch') {
    await generatePolicyPatchCommand(args.slice(2));
    process.exit(0);
    return;
  }

  if (args[0] === 'policies' && args[1] === 'apply-policy-patch') {
    await applyPolicyPatchCommand(args.slice(2));
    process.exit(0);
    return;
  }

  if (args[0] === 'policies' && args[1] === 'export-policy-patch') {
    const { exportPolicyPatchCommand } = await import('./exportPolicyPatchCommand.js');
    await exportPolicyPatchCommand(args.slice(2));
    process.exit(0);
    return;
  }

  if (args[0] === 'policies' && args[1] === 'emit-policy-pr') {
    const { emitPolicyPrCommand } = await import('./emitPolicyPrCommand.js');
    await emitPolicyPrCommand(args.slice(2));
    process.exit(0);
    return;
  }

  if (args[0] === 'github' && args[1] === 'create-policy-pr') {
    const { githubCreatePolicyPrCommand } = await import('./githubCreatePolicyPrCommand.js');
    await githubCreatePolicyPrCommand(args.slice(2));
    process.exit(0);
    return;
  }

  if (args[0] === 'gitlab' && args[1] === 'create-policy-mr') {
    const { gitlabCreatePolicyMrCommand } = await import('./gitlabCreatePolicyMrCommand.js');
    await gitlabCreatePolicyMrCommand(args.slice(2));
    process.exit(0);
    return;
  }

  if (args[0] === 'policies' && args[1] === 'status') {
    const jsonFlag = args.includes('--json');
    const { loadTrustPolicyConfig } = await import('./loadTrustPolicyConfig.js');
    const { readPolicyRegistryLockfile } = await import('./readPolicyRegistryLockfile.js');
    const { loadRemotePolicyPackMetadata } = await import('./loadRemotePolicyPackMetadata.js');
    const { assessLockfileRuntimeReadiness } = await import('@arch-engine/core');
    const path = await import('node:path');
    
    const trustConfig = loadTrustPolicyConfig();
    const lockfilePath = path.resolve(process.cwd(), '.arch-engine/policy-lock.json');
    const lockfile = readPolicyRegistryLockfile({ verifyLockfileSignature: false, json: jsonFlag });
    
    // Load remote entries purely to test freshness (options are permissive here because we want to see live state)
    const remoteResult = await loadRemotePolicyPackMetadata({ useLockfile: false, verifyLockfileSignature: false, json: jsonFlag });
    const { listPolicyPackMetadata } = await import('./listPolicyPackMetadata.js');
    const allMetadata = await listPolicyPackMetadata({ useLockfile: false, verifyLockfileSignature: false, json: jsonFlag });
    const { extractLockfileDatasetIdentity } = await import('@arch-engine/core');
    let activeDatasetIdentity = undefined;
    let activeCapabilityManifest = undefined;
    let activeMutationClassRegistry = undefined;
    let activeAuthorityScopeRegistry = undefined;
    let activeSurfaceConfidenceRegistry = undefined;
    let activeTrustBoundaryRules = undefined;
    let activeDataset = undefined;
    const datasetPath = require('node:path').resolve(process.cwd(), 'topology-export.json');
    if (require('node:fs').existsSync(datasetPath)) {
        try {
            const ds = JSON.parse(require('node:fs').readFileSync(datasetPath, 'utf8'));
            if (ds.topology_dataset_identity) {
                const extracted = extractLockfileDatasetIdentity(ds);
                activeDatasetIdentity = extracted.identity;
                activeCapabilityManifest = extracted.capabilityManifest;
                activeMutationClassRegistry = extracted.mutationClassRegistry;
                activeAuthorityScopeRegistry = extracted.authorityScopeRegistry;
                activeSurfaceConfidenceRegistry = extracted.surfaceConfidenceRegistry;
                activeTrustBoundaryRules = extracted.trustBoundaryRules;
                activeDataset = ds;
            }
        } catch {}
    }

    const result = assessLockfileRuntimeReadiness(trustConfig, lockfilePath, lockfile, remoteResult.lockEntries, activeDatasetIdentity, activeCapabilityManifest, activeMutationClassRegistry, activeAuthorityScopeRegistry, activeSurfaceConfidenceRegistry, activeTrustBoundaryRules, activeDataset, allMetadata);
    
    if (jsonFlag) {
        console.log(JSON.stringify(result, null, 2));
    } else {
        console.log(result.summaryMessage);
        
        if (result.trustDoctor.readiness !== 'healthy') {
            console.log('\nTrust Policy Findings:');
            for (const f of result.trustDoctor.findings) {
                console.log(`[${f.severity.toUpperCase()}] ${f.code}: ${f.message}`);
            }
        }
        
        if (result.enforcement) {
            console.log(`\nEnforcement Mode: ${result.enforcement.mode}`);
            console.log(`Install/Replay Allowed: ${result.enforcement.allowed}`);
        }
        
        if (result.freshness) {
            console.log(`\nFreshness Status: ${result.freshness.isFresh ? 'Fresh' : 'Stale'}`);
            if (!result.freshness.isFresh) {
                console.log(`Drift Summary: ${result.freshness.driftSummary}`);
            }
        }
        
        if (result.migrationAdvisory && result.migrationAdvisory.migrationRecommended) {
            console.log(`\nMigration Advisory: ${result.migrationAdvisory.recommendationStrength === 'strongly-recommended' ? 'Strongly Recommended' : 'Optional'}`);
            if (result.migrationAdvisory.suggestedCommand) {
                console.log(`Run \`${result.migrationAdvisory.suggestedCommand}\` to update.`);
            } else {
                console.log(`Run \`arch-engine policies advise-migration\` for details.`);
            }
        }
        
        if (result.datasetCompatibility) {
            const dc = result.datasetCompatibility;
            console.log(`\nDataset runtime compatibility: ${dc.overallStatus}`);
            console.log(`Dataset schema compatibility: ${dc.schemaCompatible ? 'compatible' : dc.schemaCompatible === false ? 'incompatible' : 'unknown'}`);
            console.log(`Dataset adapter compatibility: ${dc.formatCompatible ? 'compatible' : dc.formatCompatible === false ? 'incompatible' : 'unknown'}`);
            console.log(`Dataset policy-pack compatibility: ${dc.policyPackCompatible ? 'compatible' : dc.policyPackCompatible === false ? 'incompatible' : 'unknown'}`);
            console.log(`Dataset capability compatibility: ${dc.capabilityCompatible ? 'compatible' : dc.capabilityCompatible === false ? 'incompatible' : 'unknown'}`);
        }

        if (result.policyPackExecutionCompatibility) {
            const exec = result.policyPackExecutionCompatibility;
            console.log(`\nPolicy-pack execution compatibility: ${exec.overallStatus}`);
            if (exec.overallStatus !== 'compatible') {
                for (const packResult of exec.packResults) {
                    if (packResult.executionStatus !== 'compatible') {
                        console.log(`Incompatible pack: ${packResult.policyPackId}`);
                        for (const cf of packResult.capabilityFindings) {
                            if (cf.status !== 'compatible') {
                                console.log(`  Missing required dataset capability: ${cf.capability}`);
                            }
                        }
                        for (const gf of packResult.governanceFindings) {
                            if (gf.missingFrom === 'mutation_class_registry') {
                                console.log(`  Missing required mutation class: ${gf.requiredKey}`);
                            } else if (gf.missingFrom === 'authority_scope_registry') {
                                console.log(`  Missing required authority scope: ${gf.requiredKey}`);
                            } else if (gf.missingFrom === 'surface_confidence_registry') {
                                console.log(`  Missing required surface confidence key: ${gf.requiredKey}`);
                            } else if (gf.missingFrom === 'trust_boundary_rules') {
                                console.log(`  Missing required trust boundary rule: ${gf.requiredKey}`);
                            }
                        }
                    }
                }
            }
        }
    }
    
    if (result.status === 'blocked' || result.status === 'invalid') {
        process.exit(1);
    } else {
        process.exit(0);
    }
    return;
  }

  if (args[0] === 'policies' && args[1] === 'doctor-trust') {
    const jsonFlag = args.includes('--json');
    const { loadTrustPolicyConfig } = await import('./loadTrustPolicyConfig.js');
    const { auditTrustPolicyConfig } = await import('@arch-engine/core');
    
    const trustConfig = loadTrustPolicyConfig();
    const result = auditTrustPolicyConfig(trustConfig);
    
    if (jsonFlag) {
        console.log(JSON.stringify(result, null, 2));
    } else {
        console.log(`Trust Policy Readiness: ${result.readiness.toUpperCase()}`);
        console.log(`Total Signers: ${result.totalSigners} (Verifiers: ${result.enabledVerifiers}, Signers: ${result.enabledSigners})`);
        console.log(`Strict Enforcement: ${result.strictEnforcement}`);
        if (result.findings.length > 0) {
            console.log('\nFindings:');
            for (const finding of result.findings) {
                const prefix = finding.severity.toUpperCase().padEnd(7, ' ');
                console.log(`[${prefix}] ${finding.code}: ${finding.message}`);
            }
        }
    }
    
    if (result.readiness === 'invalid') {
        process.exit(1);
    } else {
        process.exit(0);
    }
    return;
  }

  if (args[0] === 'policies' && args[1] === 'refresh-lockfile') {
    const jsonFlag = args.includes('--json');
    const signFlagIndex = args.indexOf('--sign');
    const signKeyId = signFlagIndex !== -1 ? args[signFlagIndex + 1] : undefined;

    const { loadRemotePolicyPackMetadata } = await import('./loadRemotePolicyPackMetadata.js');
    const { readPolicyRegistryLockfile } = await import('./readPolicyRegistryLockfile.js');
    const { refreshPolicyRegistryLockfile, StaticLockfileSignerStore } = await import('@arch-engine/core');
    const { loadTrustPolicyConfig } = await import('./loadTrustPolicyConfig.js');

    const remoteResult = await loadRemotePolicyPackMetadata({ useLockfile: false, verifyLockfileSignature: false });
    const lockfile = readPolicyRegistryLockfile({ verifyLockfileSignature: false }); // don't abort

    let signOptions = undefined;
    if (signKeyId) {
      const trustConfig = loadTrustPolicyConfig();
      const signerStore = new StaticLockfileSignerStore(trustConfig.signerLockfileKeys || {}, trustConfig.lockfileSigners || {});
      signOptions = { signatureKeyId: signKeyId, signerStore };
    }

    const { extractLockfileDatasetIdentity } = await import('@arch-engine/core');
    let activeDatasetIdentity = undefined;
    let activeCapabilityManifest = undefined;
    let activeMutationClassRegistry = undefined;
    let activeAuthorityScopeRegistry = undefined;
    let activeSurfaceConfidenceRegistry = undefined;
    let activeTrustBoundaryRules = undefined;
    const datasetPath = require('node:path').resolve(process.cwd(), 'topology-export.json');
    if (require('node:fs').existsSync(datasetPath)) {
        try {
            const ds = JSON.parse(require('node:fs').readFileSync(datasetPath, 'utf8'));
            if (ds.topology_dataset_identity) {
                const extracted = extractLockfileDatasetIdentity(ds);
                activeDatasetIdentity = extracted.identity;
                activeCapabilityManifest = extracted.capabilityManifest;
                activeMutationClassRegistry = extracted.mutationClassRegistry;
                activeAuthorityScopeRegistry = extracted.authorityScopeRegistry;
                activeSurfaceConfidenceRegistry = extracted.surfaceConfidenceRegistry;
                activeTrustBoundaryRules = extracted.trustBoundaryRules;
            }
        } catch {}
    }

    const result = refreshPolicyRegistryLockfile(remoteResult.lockEntries, lockfile, signOptions, activeDatasetIdentity, activeCapabilityManifest, activeMutationClassRegistry, activeAuthorityScopeRegistry, activeSurfaceConfidenceRegistry, activeTrustBoundaryRules);

    if (jsonFlag) {
        console.log(JSON.stringify(result.diagnostic, null, 2));
    } else {
        console.log(result.diagnostic.message);
    }

    if (result.success && result.diagnostic.lockfileRewritten) {
        const dir = require('node:path').resolve(process.cwd(), '.arch-engine');
        const dest = require('node:path').join(dir, 'policy-lock.json');
        const tempFile = require('node:path').join(dir, `policy-lock.json.tmp.${Date.now()}`);
        require('node:fs').writeFileSync(tempFile, JSON.stringify(result.lockfile, null, 2) + '\n', 'utf8');
        require('node:fs').renameSync(tempFile, dest);
    }
    
    if (!result.success) {
        process.exit(1);
    } else {
        process.exit(0);
    }
    return;
  }

  if (args[0] === 'policies' && args[1] === 'advise-migration') {
    const jsonFlag = args.includes('--json');
    const { loadTrustPolicyConfig } = await import('./loadTrustPolicyConfig.js');
    const { readPolicyRegistryLockfile } = await import('./readPolicyRegistryLockfile.js');
    const { adviseLockfileMigration, StaticLockfileTrustStore } = await import('@arch-engine/core');

    const lockfile = readPolicyRegistryLockfile({ verifyLockfileSignature: false, json: jsonFlag });
    const trustConfig = loadTrustPolicyConfig();
    const trustStore = new StaticLockfileTrustStore(trustConfig.trustedLockfileKeys || {}, trustConfig.lockfileSigners || {});

    const advisory = adviseLockfileMigration(lockfile, trustStore);

    if (jsonFlag) {
        console.log(JSON.stringify(advisory, null, 2));
    } else {
        if (!advisory.migrationRecommended) {
            console.log('No migration recommended.');
            console.log(advisory.rationale);
        } else {
            if (advisory.recommendationStrength === 'strongly-recommended') {
                console.log('Migration Strongly Recommended');
            } else {
                console.log('Migration Optional');
            }
            console.log(`Rationale: ${advisory.rationale}`);
            console.log(`Legacy Identities: ${advisory.legacyIdentitiesInUse.join(', ')}`);
            if (advisory.availableReplacements.length > 0) {
                console.log(`Available Replacements: ${advisory.availableReplacements.join(', ')}`);
            }
            if (advisory.suggestedCommand) {
                console.log(`Suggested Action: ${advisory.suggestedCommand}`);
            }
        }
    }

    process.exit(0);
    return;
  }


  if (args[0] === 'policies' && args[1] === 'list') {
    const jsonFlag = args.includes('--json');
    const writeLockfile = args.includes('--write-lockfile');
    const useLockfile = args.includes('--use-lockfile');
    const refreshLockfile = args.includes('--refresh-lockfile');
    const diffLockfile = args.includes('--diff-lockfile');
    const verifyLockfileSignature = args.includes('--verify-lockfile-signature');
    
    if (verifyLockfileSignature && (writeLockfile || refreshLockfile)) {
      console.log('Cannot use --verify-lockfile-signature with --write-lockfile or --refresh-lockfile');
      process.exit(1);
      return;
    }

    if (diffLockfile && (writeLockfile || refreshLockfile || useLockfile)) {
      console.log('Cannot use --diff-lockfile with --write-lockfile, --refresh-lockfile, or --use-lockfile');
      process.exit(1);
      return;
    }

    if (useLockfile && refreshLockfile) {
      console.log('Cannot use --refresh-lockfile and --use-lockfile together');
      process.exit(1);
      return;
    }

    if (jsonFlag) {
      const { listPolicyPackMetadata } = await import('./listPolicyPackMetadata.js');
      const metadata = await listPolicyPackMetadata({ writeLockfile, useLockfile, refreshLockfile, diffLockfile, verifyLockfileSignature, json: jsonFlag });
      console.log(JSON.stringify(metadata, null, 2));
      process.exit(0);
      return;
    }
    const { listPolicyPacks } = await import('./listPolicyPacks.js');
    const packs = await listPolicyPacks({ writeLockfile, useLockfile, refreshLockfile, diffLockfile, verifyLockfileSignature });
    for (const pack of packs) {
      console.log(pack);
    }
    process.exit(0);
    return;
  }

  if (args[0] === 'policies' && args[1] === 'describe') {
    const targetId = args[2];
    const writeLockfile = args.includes('--write-lockfile');
    const useLockfile = args.includes('--use-lockfile');
    const refreshLockfile = args.includes('--refresh-lockfile');
    const diffLockfile = args.includes('--diff-lockfile');
    const verifyLockfileSignature = args.includes('--verify-lockfile-signature');
    
    if (verifyLockfileSignature && (writeLockfile || refreshLockfile)) {
      console.log('Cannot use --verify-lockfile-signature with --write-lockfile or --refresh-lockfile');
      process.exit(1);
      return;
    }

    if (diffLockfile && (writeLockfile || refreshLockfile || useLockfile)) {
      console.log('Cannot use --diff-lockfile with --write-lockfile, --refresh-lockfile, or --use-lockfile');
      process.exit(1);
      return;
    }

    if (useLockfile && refreshLockfile) {
      console.log('Cannot use --refresh-lockfile and --use-lockfile together');
      process.exit(1);
      return;
    }

    const jsonFlag = args.includes('--json');
    const { listPolicyPackMetadata } = require('./listPolicyPackMetadata');
    const metadataList = await listPolicyPackMetadata({ writeLockfile, useLockfile, refreshLockfile, diffLockfile, verifyLockfileSignature, json: jsonFlag });
    const pack = metadataList.find((m: any) => m.policyPackId === targetId);

    if (pack) {
      console.log(`Policy Pack: ${pack.policyPackId}`);
      console.log(`Category: ${pack.category}`);
      console.log(`Description: ${pack.description}`);
      process.exit(0);
    } else {
      console.log(`Unknown policy pack id: ${targetId}`);
      process.exit(1);
    }
    return;
  }

  // Installs remote policy-pack via npm
  // promoting registry metadata into executable pack surface
  if (args[0] === 'policies' && args[1] === 'install') {
    const targetId = args[2];
    const writeLockfile = args.includes('--write-lockfile');
    const useLockfile = args.includes('--use-lockfile');
    const refreshLockfile = args.includes('--refresh-lockfile');
    const verifyLockfileSignature = args.includes('--verify-lockfile-signature');
    
    if (verifyLockfileSignature && (writeLockfile || refreshLockfile)) {
      console.log('Cannot use --verify-lockfile-signature with --write-lockfile or --refresh-lockfile');
      process.exit(1);
      return;
    }
    
    if (useLockfile && refreshLockfile) {
      console.log('Cannot use --refresh-lockfile and --use-lockfile together');
      process.exit(1);
      return;
    }

    const jsonFlag = args.includes('--json');
    const { listPolicyPackMetadata } = await import('./listPolicyPackMetadata.js');
    const { loadExternalPolicyPackMetadata } = await import('./loadExternalPolicyPackMetadata.js');
    const metadataList = await listPolicyPackMetadata({ writeLockfile, useLockfile, refreshLockfile, verifyLockfileSignature, json: jsonFlag });
    const pack = metadataList.find((m: any) => m.policyPackId === targetId);

    if (!pack) {
      console.log(`Unknown policy pack id: ${targetId}`);
      process.exit(1);
      return;
    }

    const { loadTrustPolicyConfig } = await import('./loadTrustPolicyConfig.js');
    const trustConfig = loadTrustPolicyConfig();

    if (trustConfig.requireSignatures === true && !pack.signature) {
      console.log('Policy pack requires signature but none provided');
      process.exit(1);
      return;
    }

    if (trustConfig.allowedNamespaces && pack.packageName) {
      if (!trustConfig.allowedNamespaces.some((ns: string) => pack.packageName!.startsWith(ns))) {
        console.log('Package namespace not trusted');
        process.exit(1);
        return;
      }
    }

    if (!pack.packageName) {
      console.log(`Policy pack is metadata-only and cannot be installed`);
      process.exit(1);
      return;
    }

    const { spawnSync } = await import('node:child_process');
    spawnSync('npm', ['install', pack.packageName], { stdio: 'inherit' });

    const externalPacks = loadExternalPolicyPackMetadata();
    if (!externalPacks.find((m: any) => m.policyPackId === targetId)) {
      console.log('Installation failed');
      process.exit(1);
      return;
    }

    const { verifyPolicyPackSignature } = await import('@arch-engine/core');
    const path = await import('node:path');
    const packagePath = path.resolve(process.cwd(), 'node_modules', pack.packageName, 'policy-pack.json');
    const result = verifyPolicyPackSignature(pack, packagePath);
    if (!result.verified) {
      console.log(`Signature verification failed for policy pack: ${targetId}`);
      process.exit(1);
      return;
    }

    process.exit(0);
    return;
  }

  const { datasetPath, baseline, writeBaseline, json, explain, driftGate, baselineMissingValue, writeBaselineMissingValue, policy, writeLockfile, useLockfile, refreshLockfile, diffLockfile, verifyLockfileSignature } = parseCheckArgs(process.argv);

  if (!datasetPath || baselineMissingValue || writeBaselineMissingValue) {
    console.log('Usage: arch-engine check <datasetPath> [--baseline <path>] [--write-baseline <path>] [--json] [--explain]');
    process.exit(1);
    return;
  }

  const { runCheckCommand } = require('./runCheckCommand');
  const exitCode = await runCheckCommand(datasetPath, {
    json,
    explain,
    driftGate,
    baseline,
    writeBaseline,
    policy,
    useLockfile,
    writeLockfile,
    refreshLockfile,
    diffLockfile,
    verifyLockfileSignature,
  });
  process.exit(exitCode);
}
