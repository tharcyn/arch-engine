# Provider Adapter Architecture

Arch-Engine's adapter architecture isolates CI/CD provider interactions (like opening Pull Requests on GitHub or Merge Requests on GitLab) from the core policy evaluation engine. This separation of concerns ensures that the core engine remains purely deterministic and platform-agnostic, while adapters handle the specific HTTP APIs and execution semantics of various version control providers.

## Architecture Layers

The adapter substrate is strictly layered to provide secure, deterministic, and highly observable execution guarantees:

### 1. Provider-Neutral Payload Surface
The core engine emits a standardized `FederationEvaluationPolicyPullRequestPayload` via the `emit-policy-pr --json` command. This payload contains everything an adapter needs to execute an operation, including suggested commits, bodies, target profiles, and cryptographic identity/integrity hashes.

### 2. Execution Plan Layer
The adapter ingests the JSON payload and builds a deterministic execution plan. At this stage, the adapter translates the neutral payload into provider-specific concepts (e.g. `GithubPullRequestExecutionPlan`). Branch naming logic is derived and validated entirely offline.

### 3. Runtime Repository Verification
Before any network calls are made, the adapter verifies that the `repositoryHint` from the payload logically matches the actual CI environment it is running in. This strict boundary protects against replaying an export artifact against the wrong repository context.

### 4. Dry-Run Safety Boundary
By default, all adapters operate in `dry-run` mode. They validate payloads, derive branch names, verify repositories, and format expected outputs without mutating any upstream provider state. Executing mutative network calls requires an explicit `--execute` flag and a valid provider token.

### 5. Provider Executor
When live execution is permitted, the executor translates the plan into provider-specific SDK commands (e.g., using `Octokit` for GitHub). The executor handles creating/reusing branches, committing files, and issuing PR/MR requests while suppressing duplicate state creation.

### 6. Execution-Result Telemetry
Upon completion, the executor returns a strictly typed `AdapterExecutionResultBase` extension containing granular boolean outcomes (`branchCreated`, `commitCreated`, etc.), along with any provider-specific context (`pullRequestUrl`, `commitSha`).

### 7. Adapter Outcome Lifecycle Contract
A normalized `adapterOutcome` enum (`dry-run`, `refused`, `pr-created`, `pr-reused`) acts as the single authoritative classification of the execution attempt. This allows CI systems to parse adapter behavior deterministically.

---

*Note: The GitHub Adapter currently serves as the reference implementation for this architecture, laying the groundwork for the upcoming GitLab adapter.*
