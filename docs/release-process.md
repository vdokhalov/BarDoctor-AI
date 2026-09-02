# BarDoctor release process

## Required release gate

Production deployment is manual and is not part of the GitHub Actions workflow. A release candidate is eligible for deployment review only when the `release-gate` workflow is green for its exact Git commit and both `verify` and `browser-critical` jobs have passed.

The gate validates locked dependency installation, typecheck, lint, release identity, migration safety, isolated restore tooling, the full unit/integration/regression suite, an artifact build, tracked-source cleanliness, startup recovery, mobile navigation, venue/account isolation, and critical document idempotency covered by the regression suite.

Release builds use `BARDOCTOR_ENVIRONMENT=release-candidate` or `production`. In these modes `npm run build` fails before compilation unless the checkout is completely clean, including untracked source. The release manifest binds the artifact digest to the supplied GitHub SHA, build number, build timestamp, application version, environment, and canonical schema version.

## GitHub main policy

Before public release, configure `main` to require pull requests and the two `release-gate` jobs, disallow force pushes and deletion, and require branches to be current before merge. The current connector cannot administer or prove repository rulesets, so this remains an operator action and must not be recorded as complete without GitHub ruleset evidence.

Until protection is evidenced, treat `main` as release-blocked and use only the dedicated release branch. Do not deploy a working tree, local-only commit, or artifact whose `release-manifest.json` Git SHA does not equal the reviewed GitHub commit.

## Deployment and rollback

1. Record the green workflow URL and exact candidate SHA.
2. Complete the read-only production schema/ledger preflight and verified backup/restore prerequisites.
3. Obtain ordinary application deployment approval. Database changes, destructive actions, credentials, and resource deletion require separate approvals.
4. Build or select only the artifact whose manifest matches the approved SHA.
5. Deploy without automatically running schema or data migrations.
6. Verify production `/api/healthz`, `/api/release`, authentication, active venue isolation, startup, and critical read-only paths.
7. If smoke checks fail, roll back only the application artifact to the prior recorded stable SHA. Do not reverse additive schema by dropping objects and do not restore data without incident-specific approval.
