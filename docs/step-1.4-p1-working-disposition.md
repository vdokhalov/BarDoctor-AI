# BarDoctor — STEP 1.4 working P1 disposition

This table is a working classification derived from
`docs/release-safety-audit-step-1.3.md`. It is not a closure report: a P1 moves
to CLOSED only after implementation and regression evidence exist.

| P1 | Problem | Can agent fix now? | Risk | Plan |
|---|---|---|---|---|
| P1-01 | Auth, reset and invite throttling; registration enumeration | FIX NOW | Credential stuffing, brute force and account discovery | Add a durable D1-backed email/source limiter with bounded backoff, generic registration conflict response and route-level tests. |
| P1-02 | Six-character password minimum, no common-password block, PBKDF2 100k | CODE CHANGE REQUIRES CARE | Weak new passwords; excessive synchronous KDF cost can break Workers | Strengthen policy for new/reset passwords without invalidating existing hashes; block a maintained local denylist; preserve verification compatibility and benchmark the Worker-supported KDF ceiling. |
| P1-03 | JavaScript/localStorage bearer plus cookie auth; long replay window | CODE CHANGE REQUIRES CARE | XSS-accessible session replay; legacy clients depend on headers | Prove callers, make cookie primary, stop returning/storing new bearer tokens, retain a bounded migration path, and add expiry/revocation/forgery/stale-session tests. |
| P1-04 | Platform-admin MFA absent | PRODUCT DECISION REQUIRED | A stolen authenticated session can reach platform-wide privileges | Re-verify server-only RBAC/bootstrap controls; do not claim MFA. Specify phishing-resistant MFA/step-up and recovery requirements for a separate decision. |
| P1-05 | Notification runner mutates on GET and accepts a query token | FIX NOW | CSRF-like triggering, token leakage and replay | Make GET side-effect free, authorize POST only through a bearer header, add a durable run idempotency guard where possible, and test method/token compatibility. |
| P1-06 | Main shell lacks centralized headers/CSP; inline execution blocks strict CSP | FIX NOW | Clickjacking, MIME sniffing and larger XSS blast radius | Centralize non-breaking headers immediately, introduce a compatible report-only CSP, remove inline event handlers where safe, and run mobile/desktop QA. |
| P1-07 | Inconsistent mutation schemas/bounds and accounting numeric validation | CODE CHANGE REQUIRES CARE | Invalid or oversized values can corrupt accounting state or exhaust parsing | Harden the shared request reader and critical accounting routes first; add a generated negative corpus and inventory of remaining direct parsers. |
| P1-08 | Generic domain-store write and audit rows are separate commits | FIX NOW | Business mutation may persist without its audit trail | Build raw D1 statements for the domain upsert and every audit row and execute one atomic batch; add failure-injection evidence. |
| P1-09 | No mandatory storage CAS/version precondition for concurrent writers | CODE CHANGE REQUIRES CARE | Silent lost update in accounting data | Require a server revision for existing generic-store writes and add conditional update/conflict tests; assess dedicated lifecycle CAS separately. |
| P1-10 | No uniform operation id or unknown-outcome contract | CODE CHANGE REQUIRES CARE | Timeout/retry can duplicate or confuse business operations | Add a shared idempotency/operation contract to safely bounded critical mutations and explicit conflict/unknown responses; retain existing document-level identities. |
| P1-11 | No old-client/new-backend compatibility handshake | FIX NOW | Stale clients can submit incompatible mutations | Extend release metadata, require a mutation schema header on state changes after a compatibility rollout, and give clients a non-looping upgrade response. |
| P1-12 | No global/route/widget error boundaries | FIX NOW | One render failure can remove the whole application shell | Add global and route error boundaries plus testable local isolation for critical widgets without redesign. |
| P1-13 | Missing normalized request/error observability | FIX NOW | Failures cannot be correlated or attributed safely | Add request IDs, normalized sanitized error/log helpers, release identity and duration; add frontend hooks without an external provider. |
| P1-14 | `/api/healthz` always reports green without a DB probe | FIX NOW | False-positive readiness | Split liveness/readiness semantics and add a bounded read-only D1 probe with degraded/error tests against test dependencies. |
| P1-15 | Reachable vulnerable `xlsx@0.18.5` parser | CODE CHANGE REQUIRES CARE | Crafted authenticated uploads can reach prototype-pollution/ReDoS paths | Inventory every parser call; apply strict file/worksheet/cell/timeout bounds or replace the parser only with a compatible targeted dependency; do not remove spreadsheet functionality blindly. |

Infrastructure exclusions remain unchanged:

- P0-04: BLOCKED BY INFRASTRUCTURE ACCESS.
- P0-05: BLOCKED BY INFRASTRUCTURE ACCESS.

