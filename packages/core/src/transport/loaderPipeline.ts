import * as crypto from 'node:crypto';
import { PolicyStackEntry } from '../policy/types.js';
import { LoaderPipelineOptions, SnapshotEnvelope, SNAPSHOT_ENVELOPE_VERSION, LOADER_PROTOCOL_VERSION, RegistryProvenanceEntry } from './types.js';
import { resolvePolicyURI } from './resolvePolicyURI.js';
import { RegistryAdapter } from './registryAdapter.js';
import { selectPolicyVersion } from './selectPolicyVersion.js';
import { hydratePolicyManifest } from './hydratePolicyManifest.js';
import { resolvePolicyDependencyGraph } from './resolvePolicyDependencies.js';
import { propagateRequiredCapabilities } from './propagateRequiredCapabilities.js';
import { applyCapabilityClosureCache } from './capabilityClosureCache.js';
import { NAMESPACE_TRUST_POLICY_SNAPSHOT_VERSION, computeNamespaceTrustPolicyHash, validateTrustPolicySnapshot } from './namespaceTrustPolicySnapshotBinding.js';
import { computeNamespaceTrustScopeHash, ScopedNamespaceTrustPolicy, validateTrustScopeSnapshot } from './namespaceTrustScopePolicy.js';
import { attachCapabilityExplainabilityGraph } from './capabilityExplainabilityGraph.js';
import { SNAPSHOT_CLOSURE_GRAPH_HASH_VERSION, computeSnapshotClosureGraphHash, validateSnapshotClosureGraphDivergence } from './snapshotClosureGraphHash.js';
import { computeManifestContentHash as computeCanonicalManifestHash } from './mirrorContentVerifier.js';
import { resolveRegistryTrustRoot } from '../topology/registryTrustStore.js';
import { parseOverlaySignatureEnvelope } from '../topology/overlaySignatureEnvelope.js';
import { OverlayAuthorityTier } from '../topology/seamContracts.js';
import { applyCompositionHints } from './extractCompositionHints.js';
import { LoaderRuntimeCapabilities } from './validateManifestCapabilities.js';
import { computePolicyStackFingerprint, computeExtendedPolicyStackFingerprint } from './policyStackFingerprint.js';
import { computeManifestDigestSetHash } from './manifestDigestSetHash.js';
import { computeDependencyGraphShapeHash, buildDependencyAdjacency } from './dependencyGraphShapeHash.js';
import { assignStackIndices } from './computeStackTopologicalOrder.js';
import { validateSnapshotEnvelopeCompleteness } from './validateSnapshotEnvelopeCompleteness.js';
import { assertSnapshotEnvelopeVersionInvariant } from './assertSnapshotEnvelopeVersionInvariant.js';
import { assertSnapshotEnvelopeFieldWhitelist } from './assertSnapshotEnvelopeFieldWhitelist.js';
import { assertEnvelopeHashSurfaceSetInvariant } from './assertEnvelopeHashSurfaceSetInvariant.js';
import { assertPlainObjectGraph } from './assertPlainObjectGraph.js';
import { deepFreezeDeterministic } from './deepFreezeDeterministic.js';
import { certifyLoaderMetadataImmutability } from './certifyLoaderMetadataImmutability.js';
import { assertAuthoritativeTopologySurface } from './assertAuthoritativeTopologySurface.js';
import { certifyMetadataGraphShapeInvariant } from './certifyMetadataGraphShapeInvariant.js';
import { computeSnapshotEnvelopeStructureHash } from './snapshotEnvelopeStructureHash.js';
import { certifySnapshotTransportCompatibility } from './certifySnapshotTransportCompatibility.js';
import { PipelineStageTracker, assertDeterministicOrderingSurface } from './pipelineStageContract.js';
import { stableCanonicalStringify } from './stableCanonicalStringify.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';
import { executeOverlaySeam } from '../topology/seamOrchestrator.js';

/**
 * Phase 4.13 Loader Pipeline. 32-stage pipeline contract (v5).
 *
 * Phase 4.13 additions:
 * - Obj 1: Plain-object metadata graph safety
 * - Obj 2: Envelope identity-surface membership guard
 * - Obj 3: Planner entry boundary enforcement (standalone hook)
 * - Obj 4: SnapshotEnvelope structural digest surface
 * - Obj 5: Metadata graph shape certification
 * - Obj 6: Transport compatibility certification
 * - Obj 7: Protocol capability descriptor (standalone export)
 */
export function executeLoaderPipeline(
  uri: string,
  adapter: RegistryAdapter,
  options?: LoaderPipelineOptions
): PolicyStackEntry {
  const stages = new PipelineStageTracker();

  try {
    // ═══════════════════════════════════════════════════════════
    // Stage 1: URI Resolution
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('uriResolution');
    const uriLoc = executeOverlaySeam(
      'overlay::transport::uriResolutionBoundary',
      () => resolvePolicyURI(uri),
      options?.overlayExecutionContext
    );

    // ═══════════════════════════════════════════════════════════
    // Stage 2: Trust Policy Resolution
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('trustPolicyResolution');

    const allowImplicit = options?.allowImplicitTrustPolicy !== false;
    let trustPolicy;
    let scopedTrust: ScopedNamespaceTrustPolicy;

    if (options?.trustPolicy || options?.scopedTrustPolicy) {
      trustPolicy = options.trustPolicy || {
        trustedNamespaces: [],
        allowUntrustedNamespaces: false
      };
      scopedTrust = options.scopedTrustPolicy || {
        scopes: { global: trustPolicy },
        precedence: ['global']
      };
    } else if (allowImplicit) {
      trustPolicy = {
        trustedNamespaces: [uriLoc.namespace],
        allowUntrustedNamespaces: true
      };
      scopedTrust = {
        scopes: { global: trustPolicy },
        precedence: ['global']
      };
    } else {
      throw new PolicyRuntimeError({
        code: PolicyRuntimeErrorCode.TRUST_SCOPE_NAMESPACE_REJECTION,
        message: `No trust policy provided and implicit trust is disabled. URI: ${uri}`,
        stage: 'trustPolicyResolution',
        policyNamespace: uriLoc.namespace
      });
    }

    const runtimeConfig: LoaderRuntimeCapabilities = options?.runtimeCapabilities || {
      engineVersion: '9.9.9',
      supportedLayers: ['governance', 'security', 'routing'],
      supportedDomains: ['inventory', 'network', 'identity'],
      providedCapabilities: ['auth-v1', 'metrics-v1']
    };

    // ═══════════════════════════════════════════════════════════
    // Stage 3: Registry Lookup
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('registryLookup');
    const registryRes = executeOverlaySeam(
      'overlay::registry::precedenceBoundary',
      () => adapter.lookup(
        uriLoc.namespace, uriLoc.policyId,
        options?.lockfileEntries,
        scopedTrust
      ),
      options?.overlayExecutionContext
    );

    const registryProvenance: RegistryProvenanceEntry[] = [
      { namespace: registryRes.namespace, source: registryRes.registrySource, uri: uri }
    ].sort((a, b) =>
      (a.namespace < b.namespace ? -1 : a.namespace > b.namespace ? 1 : 0) ||
      (a.source < b.source ? -1 : a.source > b.source ? 1 : 0) ||
      (a.uri < b.uri ? -1 : a.uri > b.uri ? 1 : 0)
    );

    // ═══════════════════════════════════════════════════════════
    // Stage 4: SemVer Selection
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('semverSelection');
    const selectedVersion = executeOverlaySeam(
      'overlay::registry::versionResolutionBoundary',
      () => selectPolicyVersion(
        registryRes.namespace,
        registryRes.policyId,
        registryRes.availableVersions,
        uriLoc.versionRange,
        options?.lockfileEntries
      ),
      options?.overlayExecutionContext
    );

    // ═══════════════════════════════════════════════════════════
    // Stage 5: Manifest Hydration
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('manifestHydration');
    const rawManifest = registryRes.manifests[selectedVersion];
    if (!runtimeConfig.engineVersion) {
      throw new PolicyRuntimeError({
        code: PolicyRuntimeErrorCode.MISSING_DEPENDENCY,
        message: 'Engine version evaluation requirement was not provided from the runtime boundaries natively.',
        policyId: registryRes.policyId,
        policyNamespace: registryRes.namespace,
      });
    }

    const hydratedManifest = executeOverlaySeam(
      'overlay::manifest::mergeBoundary',
      () => hydratePolicyManifest(
        registryRes.namespace,
        registryRes.policyId,
        rawManifest,
        runtimeConfig.engineVersion
      ),
      options?.overlayExecutionContext
    );

    // ═══════════════════════════════════════════════════════════
    // Stage 6: Dependency Graph Resolution
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('dependencyGraphResolution');
    const { root: stackEntry, entries: allEntries } = executeOverlaySeam(
      'overlay::dependency::closureBoundary',
      () => resolvePolicyDependencyGraph(
        registryRes.namespace,
        registryRes.policyId,
        hydratedManifest
      ),
      options?.overlayExecutionContext
    );

    const canonicalEntries = [...allEntries].sort((a, b) => {
      const aKey = [a.policyNamespace || '', a.policyId, a.config.version || 0].join(':');
      const bKey = [b.policyNamespace || '', b.policyId, b.config.version || 0].join(':');
      return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
    });

    // ═══════════════════════════════════════════════════════════
    // Stage 7: Composition Hint Extraction
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('compositionHintExtraction');
    applyCompositionHints(stackEntry, hydratedManifest);

    // ═══════════════════════════════════════════════════════════
    // Stage 8: Transitive Capability Propagation
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('transitiveCapabilityPropagation');
    propagateRequiredCapabilities(canonicalEntries, stackEntry, runtimeConfig);

    // ═══════════════════════════════════════════════════════════
    // Stage 9: Capability Closure Caching
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('capabilityClosureCaching');
    applyCapabilityClosureCache(canonicalEntries, stackEntry);

    // ═══════════════════════════════════════════════════════════
    // Stage 10: Capability Explainability Graph
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('capabilityExplainabilityGraph');
    attachCapabilityExplainabilityGraph(canonicalEntries, stackEntry, runtimeConfig);

    // ═══════════════════════════════════════════════════════════
    // Stage 11: Trust Metadata Binding
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('trustMetadataBinding');
    const trustPolicyHash = computeNamespaceTrustPolicyHash(trustPolicy);
    const trustScopeHash = computeNamespaceTrustScopeHash(scopedTrust);

    stackEntry.loaderTrustMetadata = {
      namespaceTrustPolicyVersion: NAMESPACE_TRUST_POLICY_SNAPSHOT_VERSION,
      namespaceTrustPolicyHash: trustPolicyHash,
      namespaceTrustScopeHash: trustScopeHash,
      activeTrustScopes: Object.keys(scopedTrust.scopes).sort((a, b) => a < b ? -1 : a > b ? 1 : 0)
    };

    // ═══════════════════════════════════════════════════════════
    // Stage 12: Closure Graph Hashing
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('closureGraphHashing');
    
    let closureProvenance: { manifestContentHash: string; signatureDigest: string; registryTrustRootId: string; trustRootEpoch: number; } | undefined;
    
    if (options?.overlayExecutionContext?.activation?.activeOverlays && options.overlayExecutionContext.activation.activeOverlays.length > 0) {
      // 1. Canonical Manifest Content Binding
      // Hash precisely the canonical data the mirror verifier defines as the absolute source of truth.
      const manifestContentHash = computeCanonicalManifestHash(registryRes);

      // 2. Trust Root Binding
      const activationContext = options.overlayExecutionContext.activation;
      const registrySource = activationContext.overlayRegistrySource || 'external';
      const trustRoot = resolveRegistryTrustRoot(registrySource); // We bind what is structurally registered right now
      const registryTrustRootId = trustRoot ? trustRoot.trustRootId : 'unknown.registry.root';
      const trustRootEpoch = trustRoot ? trustRoot.trustRootEpoch : 0;

      // 3. Signature Digest Binding
      let signatureDigest: string;
      const runState = options.overlayExecutionContext.runState;
      // Search telemetry for an already trusted and verified evaluation of this execution context.
      const verifiedTelemetry = runState?.telemetry.find(t => 
        t.signatureEnvelopeValid === true && t.signedPayloadDigest && t.signedPayloadDigest !== '__legacy__'
      );

      if (verifiedTelemetry && verifiedTelemetry.signedPayloadDigest) {
        // Safe Path A: Verified downstream result exists
        signatureDigest = verifiedTelemetry.signedPayloadDigest;
      } else if (activationContext.overlayTrustTier === OverlayAuthorityTier.UNTRUSTED_EXTERNAL && !activationContext.overlaySignature) {
        // Safe Path B: Verified unsigned UNTRUSTED sentinel 
        signatureDigest = '__unsigned__';
      } else {
        // Fallback Path C: Unverified/Missing Result OR Legacy.
        // We only bind valid structured data. If no telemetry proves it was validated, we defensively attempt parsing,
        // but if parsing fails (i.e. invalid signature / rejected execution), we must not emit provenance.
        const parsed = parseOverlaySignatureEnvelope(activationContext.overlaySignature);
        if (parsed) {
          signatureDigest = parsed.signedPayloadDigest;
        } else {
          // No valid signature, no telemetry -> execution will implicitly fail downstream or is completely broken.
          // In F-7, any invalid signature must not emit closure provenance because execution is invalid.
          // Since loader is upstream of many overlay executions, we safely skip adding provenance here if it isn't verified.
          closureProvenance = undefined;
        }
      }

      if (signatureDigest! !== undefined && signatureDigest! !== '') {
         closureProvenance = { manifestContentHash, signatureDigest, registryTrustRootId, trustRootEpoch };
      }
    }

    const closureGraphHash = computeSnapshotClosureGraphHash(
      canonicalEntries, 
      options?.overlayExecutionContext?.activation?.includeSeamExecutionInClosureHash 
        ? options?.overlayExecutionContext?.runState?.seamHashFingerprints 
        : undefined,
      closureProvenance
    );
    stackEntry.loaderClosureMetadata = {
      snapshotClosureGraphHash: closureGraphHash,
      closureGraphContractVersion: SNAPSHOT_CLOSURE_GRAPH_HASH_VERSION,
      closureProvenance
    };

    // ═══════════════════════════════════════════════════════════
    // Stage 13: Manifest Digest Aggregation
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('manifestDigestAggregation');
    const manifestDigestSetHash = computeManifestDigestSetHash(canonicalEntries);

    // ═══════════════════════════════════════════════════════════
    // Stage 14: Dependency Graph Shape Hashing
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('dependencyGraphShapeHashing');
    const dependencyGraphShapeHash = computeDependencyGraphShapeHash(canonicalEntries);

    // ═══════════════════════════════════════════════════════════
    // Stage 15: Namespace Surface Hashing
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('namespaceSurfaceHashing');
    const namespaces = [...new Set(canonicalEntries.map(e => e.policyNamespace || ''))]
      .sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    assertDeterministicOrderingSurface(namespaces, n => n, 'namespaceSet');
    const namespaceSetHash = crypto.createHash('sha256')
      .update(stableCanonicalStringify(namespaces)).digest('hex');

    // ═══════════════════════════════════════════════════════════
    // Stage 16: Explainability Hashing
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('explainabilityHashing');
    const explainabilityGraph = stackEntry.loaderTrustMetadata || {};
    const explainabilityGraphHash = crypto.createHash('sha256')
      .update(stableCanonicalStringify(explainabilityGraph)).digest('hex');

    // ═══════════════════════════════════════════════════════════
    // Stage 17: Registry Source Hashing
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('registrySourceHashing');
    const registryCanonicalizationVersion = 'v1';
    const registrySourceHash = crypto.createHash('sha256')
      .update(`REG:${registryCanonicalizationVersion}|` + stableCanonicalStringify(registryProvenance)).digest('hex');

    // ═══════════════════════════════════════════════════════════
    // Stage 18: Stack Topological Ordering
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('stackTopologicalOrdering');
    assignStackIndices(canonicalEntries);

    // ═══════════════════════════════════════════════════════════
    // Stage 19: Dependency Metadata Attachment
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('dependencyMetadataAttachment');
    assignDependencyDepths(canonicalEntries, stackEntry);
    const adjacency = buildDependencyAdjacency(canonicalEntries);
    if (!stackEntry.executionMetadata) stackEntry.executionMetadata = {};
    stackEntry.executionMetadata.dependencyAdjacencySurface = adjacency;

    // ═══════════════════════════════════════════════════════════
    // Stage 20: Registry Provenance Capture
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('registryProvenanceCapture');
    assertDeterministicOrderingSurface(
      registryProvenance,
      (e) => `${e.namespace}:${e.source}:${e.uri}`,
      'registryProvenance'
    );

    // ═══════════════════════════════════════════════════════════
    // Stage 21: Snapshot Envelope Assembly
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('snapshotEnvelopeAssembly');

    const fingerprint = computePolicyStackFingerprint(
      closureGraphHash, trustScopeHash, trustPolicyHash
    );

    const extendedFingerprint = computeExtendedPolicyStackFingerprint(
      closureGraphHash, trustScopeHash, trustPolicyHash, manifestDigestSetHash
    );

    // Build envelope without structureHash first, compute it, then assign
    const partialEnvelope: any = {
      snapshotClosureGraphHash: closureGraphHash,
      closureGraphContractVersion: SNAPSHOT_CLOSURE_GRAPH_HASH_VERSION,
      closureProvenance,
      namespaceTrustPolicyVersion: NAMESPACE_TRUST_POLICY_SNAPSHOT_VERSION,
      namespaceTrustPolicyHash: trustPolicyHash,
      namespaceTrustScopeHash: trustScopeHash,
      activeTrustScopes: stackEntry.loaderTrustMetadata.activeTrustScopes || [],
      policyStackFingerprint: fingerprint.fingerprint,
      snapshotEnvelopeVersion: SNAPSHOT_ENVELOPE_VERSION,
      registryProvenance,
      manifestDigestSetHash,
      loaderProtocolVersion: LOADER_PROTOCOL_VERSION,
      registrySourceHash,
      dependencyGraphShapeHash,
      namespaceSetHash,
      explainabilityGraphHash
    };

    // Phase 4.13 Obj 4: Compute structural digest from field names
    partialEnvelope.structureHash = computeSnapshotEnvelopeStructureHash(partialEnvelope as SnapshotEnvelope);

    const snapshotEnvelope: SnapshotEnvelope = partialEnvelope;

    stackEntry.executionMetadata.snapshotEnvelope = snapshotEnvelope;
    stackEntry.executionMetadata.policyStackFingerprint = fingerprint.fingerprint;
    stackEntry.executionMetadata.extendedPolicyStackFingerprint = extendedFingerprint;

    // ═══════════════════════════════════════════════════════════
    // Stage 22: Snapshot Envelope Field Whitelist
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('snapshotEnvelopeFieldWhitelist');
    assertSnapshotEnvelopeFieldWhitelist(snapshotEnvelope);

    // ═══════════════════════════════════════════════════════════
    // Stage 23: Envelope Identity-Surface Validation (Phase 4.13 Obj 2)
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('envelopeIdentitySurfaceValidation');
    assertEnvelopeHashSurfaceSetInvariant(snapshotEnvelope);

    // ═══════════════════════════════════════════════════════════
    // Stage 24: Plain-Object Graph Validation (Phase 4.13 Obj 1)
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('plainObjectGraphValidation');
    for (const entry of canonicalEntries) {
      if (entry.executionMetadata) {
        assertPlainObjectGraph(entry.executionMetadata, `entry[${entry.policyId}].executionMetadata`);
      }
    }
    if (stackEntry.executionMetadata) {
      assertPlainObjectGraph(stackEntry.executionMetadata, 'root.executionMetadata');
    }

    // ═══════════════════════════════════════════════════════════
    // Stage 25: Deep Metadata Freeze
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('deepMetadataFreeze');
    for (const entry of canonicalEntries) {
      if (entry.executionMetadata) {
        deepFreezeDeterministic(entry.executionMetadata, `entry[${entry.policyId}].executionMetadata`);
      }
    }
    if (stackEntry.executionMetadata) {
      deepFreezeDeterministic(stackEntry.executionMetadata, 'root.executionMetadata');
    }

    // ═══════════════════════════════════════════════════════════
    // Stage 26: Metadata Immutability Certification
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('metadataImmutabilityCertification');
    certifyLoaderMetadataImmutability(canonicalEntries, stackEntry);

    // ═══════════════════════════════════════════════════════════
    // Stage 27: Authoritative Topology Surface Certification
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('authoritativeTopologySurfaceCertification');
    assertAuthoritativeTopologySurface(canonicalEntries, snapshotEnvelope);

    // ═══════════════════════════════════════════════════════════
    // Stage 28: Metadata Graph Shape Certification (Phase 4.13 Obj 5)
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('metadataGraphShapeCertification');
    certifyMetadataGraphShapeInvariant(canonicalEntries, stackEntry, snapshotEnvelope);

    // ═══════════════════════════════════════════════════════════
    // Stage 29: Envelope Version Invariant
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('envelopeVersionInvariant');
    assertSnapshotEnvelopeVersionInvariant(snapshotEnvelope.snapshotEnvelopeVersion);

    // ═══════════════════════════════════════════════════════════
    // Stage 30: Snapshot Envelope Completeness
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('snapshotEnvelopeCompleteness');
    validateSnapshotEnvelopeCompleteness(snapshotEnvelope);

    // ═══════════════════════════════════════════════════════════
    // Stage 31: Snapshot Replay Validation
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('snapshotReplayValidation');
    if (options?.snapshotReplayHashes) {
      const replay = options.snapshotReplayHashes;
      if (replay.namespaceTrustPolicyHash) {
        validateTrustPolicySnapshot(replay.namespaceTrustPolicyHash, trustPolicyHash);
      }
      if (replay.namespaceTrustScopeHash && trustScopeHash) {
        validateTrustScopeSnapshot(replay.namespaceTrustScopeHash, trustScopeHash);
      }
      if (replay.snapshotClosureGraphHash) {
        validateSnapshotClosureGraphDivergence(replay.snapshotClosureGraphHash, closureGraphHash);
      }
    }

    // ═══════════════════════════════════════════════════════════
    // Stage 32: Snapshot Transport Compatibility (Phase 4.13 Obj 6)
    // ═══════════════════════════════════════════════════════════
    stages.assertStage('snapshotTransportCompatibility');
    certifySnapshotTransportCompatibility(snapshotEnvelope, snapshotEnvelope.structureHash);

    return stackEntry;
  } catch (error: any) {
    if (error instanceof PolicyRuntimeError) {
      throw error;
    }
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.LOADER_PIPELINE_FAILED,
      message: `Loader Pipeline failure: ${error.message}`,
      stage: 'loaderPipeline'
    });
  }
}

/**
 * Phase 4.11 Objective 3: Assign dependency depths.
 * root = depth 0, direct deps = depth 1, transitive = depth 2+
 */
function assignDependencyDepths(entries: PolicyStackEntry[], root: PolicyStackEntry): void {
  const rootKey = `${root.policyNamespace || ''}/${root.policyId}`;

  const adjacency = new Map<string, string[]>();
  for (const e of entries) {
    const key = `${e.policyNamespace || ''}/${e.policyId}`;
    const deps: string[] = [];
    if (e.config.extends) {
      const extendsArr = Array.isArray(e.config.extends) ? e.config.extends : [e.config.extends];
      for (const depId of extendsArr) {
        deps.push(`${e.policyNamespace || ''}/${depId}`);
      }
    }
    adjacency.set(key, deps);
  }

  const depths = new Map<string, number>();
  depths.set(rootKey, 0);
  const queue = [rootKey];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depths.get(current)!;
    const deps = adjacency.get(current) || [];
    for (const dep of deps) {
      if (!depths.has(dep)) {
        depths.set(dep, currentDepth + 1);
        queue.push(dep);
      }
    }
  }

  for (const e of entries) {
    const key = `${e.policyNamespace || ''}/${e.policyId}`;
    if (!e.executionMetadata) e.executionMetadata = {};
    e.executionMetadata.dependencyDepth = depths.get(key) ?? 0;
  }
}
