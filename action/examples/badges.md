# Architecture Badges

Arch-Engine generates [Shields.io endpoint badges](https://shields.io/badges/endpoint-badge) that can be embedded in your README.

## Setup

1. Run `arch-engine check` or the GitHub Action to generate badge JSONs
2. Commit the badge files to your repository
3. Add the badge URLs to your README

## Badge Files

After running the action, you'll find these files:

```
.arch-engine/badges/
├── stability.json    # Architecture Stability tier
├── confidence.json   # Topology Confidence level
└── coverage.json     # Topology Coverage percentage
```

## README Examples

### Architecture Stability

```markdown
![Architecture Stability](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/YOUR_ORG/YOUR_REPO/main/.arch-engine/badges/stability.json)
```

### Topology Confidence

```markdown
![Topology Confidence](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/YOUR_ORG/YOUR_REPO/main/.arch-engine/badges/confidence.json)
```

### Topology Coverage

```markdown
![Topology Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/YOUR_ORG/YOUR_REPO/main/.arch-engine/badges/coverage.json)
```

## Badge JSON Format

Each badge file follows the [Shields.io endpoint schema](https://shields.io/badges/endpoint-badge):

```json
{
  "schemaVersion": 1,
  "label": "Architecture Stability",
  "message": "HEALTHY (82%)",
  "color": "green"
}
```

### Stability Colors

| Tier | Color |
|---|---|
| STABLE | `brightgreen` |
| HEALTHY | `green` |
| WARNING | `yellow` |
| CRITICAL | `red` |

### Confidence Colors

| Label | Color |
|---|---|
| HIGH | `blue` |
| MODERATE | `purple` |
| LOW | `lightgrey` |
| VERY_LOW | `lightgrey` |

## GitHub Action Integration

The badges are automatically generated when using the GitHub Action:

```yaml
- uses: arch-engine/check-boundaries@v1
  with:
    mode: standard
    generate-badges: true
```

Then commit `.arch-engine/badges/` to your repository.
