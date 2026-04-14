export const landingCopy = {
  plain: {
    heroTitle: "Your codebase has architecture. Nothing enforces it systemically.",
    heroSubtitle: "Arch-Engine extracts structural relationships directly from source code and enables enforcement of architectural rules via policy packs \u2014 automatically, deterministically.",
    problemLines: [
      "Software architecture is discussed in reviews and documented in wikis. It is rarely enforced systemically by tooling.",
      "Dependencies cross boundaries silently.\nSmall changes create unexpected blast radius.\nArchitectural rules exist only as convention.",
      "Teams discover structural problems in production because nothing surfaces them earlier."
    ],
    differentiationTitle: "A New Kind of Architecture Tool",
    differentiationLines: [
      "This is not another linting tool.",
      "It does not check code style or find bugs."
    ],
    differentiationConclusion: "Arch-Engine operates one level above \u2014 on the structural relationships between packages, modules, and boundaries. It makes your architecture visible and enforceable through policy packs as a first-class part of your development workflow.",
    solutionIntro: "Arch-Engine reads your repository and extracts the structural relationships between every package, module, and boundary.",
    solutionDetails: "With that structure extracted, teams can:",
    solutionBullets: [
      "query dependency connections across the entire codebase",
      "enforce boundary rules that prevent architectural drift via policy packs",
      "detect structural risk before it reaches a pull request"
    ],
    solutionTrailing: "No annotations required. No build changes. One install. Works alongside existing tooling.",
    cli: "Run one command to inspect your architecture.\n\nReports structural confidence, connectivity coverage, and policy readiness \u2014 instantly.",
    cliExecSummary: [
      "Extracts structure.",
      "Evaluates structure.",
      "Reports confidence immediately."
    ],
    cliSafetyNote: "Safe diagnostic runtime. No source files modified. No dependencies mutated. Creates a local .arch-engine/ context directory on first run.",
    cliOffline: "No network requests. Fully offline execution by default.",
    cliDuration: "Sub-second execution on typical small and mid-sized workspaces.",
    cliNpxNote: "Run instantly without installation using npx.",
    cliDoctorScope: "",
    policyPackOptional: "Policy packs are optional. The engine runs without them.",
    policyPacks: "Policy packs encode architecture rules as enforceable constraints. Define them once. The engine enforces them on every run.\n\nExamples: boundary protection, dependency drift detection, API contract alignment validation.",
    federationOptIn: "",
    adapters: "Adapters let Arch-Engine understand how your project is structured \u2014 npm, pnpm, and Yarn workspaces \u2014 monorepo, single-package, or multi-workspace.\n\nNo configuration required for supported workspace types.",
    adapterSafety: "Adapters are read-only and never modify your project.",
    trustIntro: "Available now. Stable CLI runtime. MIT licensed.",
    trustCard1Title: "v1.0.0 Stable Release",
    trustCard1Desc: "Scoped npm packages on the public registry. Stable public API surface.",
    trustCard2Title: "CLI Runtime",
    trustCard2Desc: "Topology extraction in a single command.",
    trustCard3Title: "Workspace Adapters",
    trustCard3Desc: "Automatic project structure discovery.",
    trustCard4Title: "Governance Packs",
    trustCard4Desc: "Composable architecture rule enforcement.",
    cta: "See your architecture in one command.",
    ctaFooter: "Zero configuration required. Instant diagnostic."
  },

  technical: {
    heroTitle: "Infrastructure for repository architecture reasoning.",
    heroSubtitle: "Deterministic topology extraction from source structure.\nInvariant evaluation via composable policy packs.\nExecuted as a reproducible topology diagnostic runtime.",
    problemLines: [
      "Architectural intent is not systemically enforceable by any tool in the current stack.",
      "Linters validate syntax.\nType systems validate contracts.\nCI validates builds.\nNothing validates repository topology systemically.",
      "Cross-layer coupling, authority erosion, and blast-radius drift remain invisible \u2014 not because they\u2019re hard to detect, but because the reasoning surface doesn't exist."
    ],
    differentiationTitle: "Not Linting. Not Tracing. Not Config.",
    differentiationLines: [
      "Arch-Engine is not a linter with architecture rules.",
      "It is not a runtime tracer with dependency graphs.",
      "It is not policy-as-configuration."
    ],
    differentiationConclusion: "It is a topology governance runtime substrate \u2014 an infrastructure primitive that makes architecture structure queryable, enforceable, and federable across repository boundaries.",
    solutionIntro: "Arch-Engine constructs the missing reasoning surface \u2014 a deterministic, closureGraphHash-stable topology graph (snapshot-stable across runs) extracted directly from source structure. No annotation, no configuration, no build step required.",
    solutionDetails: "The extracted topology graph yields:",
    solutionBullets: [
      "adjacency and reachability relationships",
      "authority boundary crossing detection",
      "blast-radius surfaces per change set",
      "contract linkage and contract-parity paths"
    ],
    solutionTrailing: "These are composable primitives \u2014 consumable by policy packs, CI gates, and federated governance workflows.",
    cli: "One command. Full topology extraction and environment diagnostic:",
    cliExecSummary: [
      "Extracts topology.",
      "Evaluates structural invariants.",
      "Reports structural confidence immediately."
    ],
    cliSafetyNote: "Safe diagnostic runtime. No source files modified. No dependencies mutated. Creates a local .arch-engine/ context directory on first run.",
    cliOffline: "No network requests. Fully offline execution by default.",
    cliDuration: "Sub-second execution on typical small and mid-sized workspaces.",
    cliNpxNote: "Run instantly without installation using npx.",
    cliDoctorScope: "doctor performs topology extraction and environment diagnostics only. Policy packs are evaluated separately via arch-engine check.",
    policyPackOptional: "Policy packs are optional extensions. The core runtime executes topology extraction without governance packs installed.",
    policyPacks: "Policy packs are composable constraint sets evaluated against the extracted topology graph. Each pack defines invariants \u2014 authority boundaries, contract parity rules, journey lifecycle constraints \u2014 that the runtime enforces deterministically.\n\nPolicy packs execute without modifying source code, build pipelines, or repository configuration.\n\nPolicy packs can be shared across repositories, organizations, and registry boundaries without mutating execution identity.",
    federationOptIn: "Federation is opt-in and never activates implicitly.",
    adapters: "Adapters are capability negotiation layers between workspace structure and topology extraction. They translate workspace structure into normalized topology ingestion surfaces.\n\nSupports npm, pnpm, and Yarn workspace topologies. Zero build-pipeline modification. Zero configuration for supported workspaces.",
    adapterSafety: "Adapters are read-only. No repository modification. No build-step injection. No dependency graph mutation.",
    trustIntro: "Shipped. Stable. Deterministic.",
    trustCard1Title: "Federation-Ready",
    trustCard1Desc: "Multi-repository topology composition across registry boundaries.",
    trustCard2Title: "Deterministic by Design",
    trustCard2Desc: "closureGraphHash-stable execution. Snapshot-portable topology envelopes.",
    trustCard3Title: "Adapter Negotiation",
    trustCard3Desc: "Capability-driven workspace ingestion. Zero configuration required.",
    trustCard4Title: "Policy-Pack Evaluation",
    trustCard4Desc: "Composable governance constraint runtime.",
    cta: "Inspect your topology.",
    ctaFooter: "Zero-configuration topology extraction. One command."
  }
};
