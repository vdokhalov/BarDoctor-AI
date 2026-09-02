# STEP 1.4 dependency security evidence

Date: 2026-09-02

## Targeted remediation

| Package | Scope | Before | After | Result |
| --- | --- | --- | --- | --- |
| `next` | direct production | 16.2.6 | 16.3.4 | patched current advisories |
| `react`, `react-dom`, `react-server-dom-webpack` | direct production/build | 19.2.6 | 19.2.8 | patched RSC advisories |
| `@cloudflare/vite-plugin` | direct build/dev | 1.37.1 | 1.54.3 | patched supported toolchain |
| `vite` | direct build/dev | 8.0.13 | 8.2.2 | patched current advisory |
| `wrangler` | direct build/dev | 4.92.0 | 4.128.0 | patched transitive advisories |
| `eslint-config-next` | direct dev | 16.2.6 | 16.3.4 | aligned with Next runtime |
| `@cloudflare/workers-types` | direct type-only dev | 4.20260702.1 | 5.20260902.1 | satisfies the supported Wrangler peer contract |
| `@rolldown/binding-wasm32-wasi` | direct build/dev | absent | 1.2.7 | cross-platform fallback makes clean installs reproducible when npm omits native optional packages |

No forced install or blanket major application-framework migration was used. Compatible transitive fixes were applied by `npm audit fix` without `--force` after the direct upgrades.

## Remaining findings

| Package | Direct/transitive | Production/dev | Reachability in BarDoctor | Fix status | Decision |
| --- | --- | --- | --- | --- | --- |
| `xlsx@0.18.5` | direct | production | reachable from spreadsheet/import routes | no fixed npm version; advisories cover prototype pollution and ReDoS | P1-15 remains open; constrain inputs and replace the parser in a separate reviewed change |
| `image-size` through `vinext@0.0.50` | transitive | build/dev | not used by a BarDoctor request handler; used by the framework image implementation during build/runtime packaging | npm proposes `vinext@1.0.0-beta.9`, a semver-major beta | do not force a beta framework migration in a security patch; P1-15 remains partial |
| `esbuild` through `drizzle-kit` | transitive | dev only | vulnerable development server is not shipped or exposed by the production Worker | npm proposes a breaking downgrade of `drizzle-kit` | documented moderate dev-only advisory; no risky downgrade |

## Audit result

- Before targeted remediation: 0 critical, 18 high, 4 moderate, 1 low.
- After remediation, full dependency tree: 0 critical, 3 high, 4 moderate, 0 low.
- After remediation, `npm audit --omit=dev`: 0 critical, 1 high (`xlsx`), 0 moderate, 0 low.
- Build, typecheck and lint pass on the updated dependency graph.

These results are code/dependency evidence only. They do not claim production deployment or production infrastructure verification.
