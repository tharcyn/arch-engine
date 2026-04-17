import { FederationEvaluationPolicyPullRequestPayload, POLICY_PR_PAYLOAD_SCHEMA_VERSION } from '@arch-engine/core';

export const minimalValidPayload: FederationEvaluationPolicyPullRequestPayload = {
  pullRequestPayloadSchemaVersion: POLICY_PR_PAYLOAD_SCHEMA_VERSION,
  suggestedTitle: "Update policy (profile: minimal)",
  suggestedCommitMessage: "Update policy for profile minimal",
  suggestedBodyMarkdown: "This is a minimal valid payload for Protocol v1 testing.",
  repositoryHint: "tharcyn/arch-engine",
  repositoryHintSource: "env",
  targetProfile: "minimal",
  targetProfileSource: "cli-selected",
  authoritative: true,
  changedPaths: ["evaluation-policy.json"],
  exportArtifactIntegrityHash: "deadbeef1234567890abcdef",
  exportArtifactProducerIdentity: "arch-engine@1.0.0",
  exportArtifactSchemaVersion: "policy-patch-export.v1",
  disclaimerFlags: {
    repositoryHintDerivedFromPackageJson: false,
    nonAuthoritativePatch: false
  }
};

export const schemaMismatchPayload: any = {
  ...minimalValidPayload,
  pullRequestPayloadSchemaVersion: "unsupported-schema.v999",
  suggestedTitle: "Update policy (schema mismatch)",
  suggestedBodyMarkdown: "This payload has an unsupported schema."
};

export const repositoryMismatchPayload: FederationEvaluationPolicyPullRequestPayload = {
  ...minimalValidPayload,
  suggestedTitle: "Update policy (repo mismatch)",
  suggestedBodyMarkdown: "This payload has a repository mismatch.",
  repositoryHint: "mismatch/arch-engine"
};

export const advisoryRepositoryPayload: FederationEvaluationPolicyPullRequestPayload = {
  ...minimalValidPayload,
  suggestedTitle: "Update policy (advisory repo mismatch)",
  suggestedBodyMarkdown: "This payload has an advisory repository mismatch.",
  repositoryHint: "mismatch/arch-engine",
  repositoryHintSource: "package-json",
  authoritative: false,
  disclaimerFlags: {
    ...minimalValidPayload.disclaimerFlags,
    repositoryHintDerivedFromPackageJson: true
  }
};

export const duplicateBranchPayload: FederationEvaluationPolicyPullRequestPayload = {
  ...minimalValidPayload,
  suggestedTitle: "Update policy (duplicate branch)",
  suggestedBodyMarkdown: "This payload simulates a duplicate branch scenario."
};

export const missingHashPayload: FederationEvaluationPolicyPullRequestPayload = {
  ...minimalValidPayload,
  exportArtifactIntegrityHash: "",
  suggestedTitle: "Update policy (missing hash)",
  suggestedBodyMarkdown: "This payload is missing the integrity hash."
};
