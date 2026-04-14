export const landingCopy = {
  plain: {
    heroTitle: "Understand your architecture before it breaks.",
    heroSubtitle: "Arch-Engine maps how your system actually connects so teams can see dependencies, boundaries, and risk surfaces directly from their codebase.",
    problemLines: [
      "Modern systems grow faster than teams can understand them.",
      "Dependencies spread across services.\\nBoundaries blur between layers.\\nSmall changes create unexpected impact.",
      "Most teams only see architecture problems after they reach production."
    ],
    solutionIntro: "Arch-Engine reads your repository and builds a structural map of how your system actually works.",
    solutionDetails: "It helps teams:",
    solutionBullets: [
      "see dependencies clearly",
      "protect important boundaries",
      "detect architectural risk early"
    ],
    solutionTrailing: "without changing how they build software.",
    cli: "Run one command to inspect your architecture:\\n\\nIt analyzes your workspace and reports structural confidence, connectivity coverage, and policy readiness immediately.",
    adapters: "Adapters help Arch-Engine understand how different projects are structured automatically.\\n\\nAdapters make the engine work with your repository without configuration.",
    policyPacks: "Policy packs let teams define architecture rules once and keep them enforced automatically.\\n\\nExamples: protect service boundaries, detect dependency drift, validate API contract alignment.",
    trustIntro: "Arch-Engine is available today as a stable CLI runtime. Includes:",
    trustCard1Title: "v1.0.0 Stable Release",
    trustCard1Desc: "Scoped npm packages.",
    trustCard2Title: "CLI Runtime",
    trustCard2Desc: "Instant topology extraction engine.",
    trustCard3Title: "Adapter Support",
    trustCard3Desc: "Automatic workspace discovery.",
    trustCard4Title: "Governance Layer",
    trustCard4Desc: "Policy pack enforcement system.",
    cta: "Install Arch-Engine in seconds.\\nRun your first architecture diagnostic immediately.",
    ctaFooter: "No configuration required for first diagnostic run."
  },

  technical: {
    heroTitle: "A topology governance runtime for real-world codebases.",
    heroSubtitle: "Arch-Engine constructs deterministic dependency topology directly from source structure and evaluates architectural invariants continuously using policy packs.",
    problemLines: [
      "Architectural intent rarely exists as enforceable structure.",
      "Cross-layer coupling accumulates silently.\\nAuthority boundaries erode over time.\\nTopology drift remains invisible to most tooling.",
      "Syntax validation exists.\\n\\nTopology validation usually does not."
    ],
    solutionIntro: "Arch-Engine extracts a normalized topology graph from repository structure and evaluates architectural invariants using policy packs.",
    solutionDetails: "It exposes:",
    solutionBullets: [
      "adjacency relationships",
      "authority crossings",
      "blast-radius surfaces",
      "contract linkage paths"
    ],
    solutionTrailing: "as first-class signals during development workflows.",
    cli: "Initialize topology extraction and environment diagnostics:",
    adapters: "Adapters provide capability negotiation layers that translate repository structure into normalized topology extraction surfaces.\\n\\nAdapters enable architecture reasoning without modifying build pipelines.",
    policyPacks: "Policy packs define invariant-preserving constraint sets evaluated against extracted topology graphs.",
    trustIntro: "Arch-Engine provides a deterministic topology extraction runtime with adapter capability negotiation and policy-pack evaluation surfaces designed for multi-repository architecture governance workflows.",
    trustCard1Title: "Federation-Ready",
    trustCard1Desc: "Designed for multi-repository governance.",
    trustCard2Title: "Deterministic Execution",
    trustCard2Desc: "Cryptographic topology hashing layer.",
    trustCard3Title: "Capability Adapters",
    trustCard3Desc: "Normalized topological ingestion endpoints.",
    trustCard4Title: "Policy-Pack Runtime",
    trustCard4Desc: "Invariant constraint evaluation engine.",
    cta: "Install CLI runtime and adapter surface.\\nRun topology extraction.",
    ctaFooter: "No configuration required for first diagnostic run."
  }
};
