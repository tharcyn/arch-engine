# Repository Context Verification

Arch-Engine's adapter layer is designed with strict boundaries to ensure that structurally valid, integrity-hashed payloads cannot be accidentally or maliciously executed against the wrong physical environment. The core of this defense is Runtime Repository Context Verification.

## Repository Hint Normalization
When the engine generates a payload, it attaches a `repositoryHint`. Because this hint can come from various upstream sources (such as a local `package.json` URL string or a Git config file), the adapter first normalizes it.

For instance, `git@github.com:tharcyn/arch-engine.git` and `https://github.com/tharcyn/arch-engine` are both normalized deterministically to the logical owner and repository identifier: `tharcyn/arch-engine`.

## Strong vs Advisory Identity Hints
Payload identity sources are assigned a trust level. A hint derived from a robust metadata manifest or strict environment logic is treated as a strict requirement. In cases where the derivation is known to be best-effort (such as parsing loosely typed package manifests), the hint can be flagged as `advisory`.

## Runtime Enforcement

Before initiating execution, the adapter cross-references the normalized hint from the payload against the known CI environment context. 

For example, adapters verify against platform-standard variables:
- **GitHub**: Checks against `GITHUB_REPOSITORY`
- **GitLab**: Will check against `CI_PROJECT_PATH`

### Execution Refusal Behavior
If the payload's logical repository identity does not strictly match the runtime environment, the adapter enters a **refusal** state (`adapterOutcome: 'refused'`). This entirely aborts the execution plan before any network mutative actions are attempted, explicitly noting `repository_identity_mismatch_with_runtime_context`. This represents hard replay protection across different organization silos or forks.

### Dry-Run Advisory Mode
When the adapter operates in `--dry-run` mode, it employs a graceful degradation posture. Since no mutation occurs, an identity mismatch will only generate an advisory log instead of blocking the diagnostic pipeline. This ensures developers can debug payload shapes locally without needing complex fake CI environment variables.
