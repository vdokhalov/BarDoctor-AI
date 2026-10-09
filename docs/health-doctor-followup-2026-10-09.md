# Follow-up: WebKit PASS and precise credential fallback

This supersedes the earlier WebKit BLOCKED status and the overly broad claim that a functioning picker is necessary. Application-code repair remains commit `901faa3`; no application code, auth, financial formula, production configuration or business data changed in this follow-up.

## WebKit — PASS

Actual authorized Health → reload → Doctor → launch diagnosis → reload passed at 390, 820 and 1280 px in WebKit 26.0 / Playwright build 2248. The existing test assertions were unchanged. Provider response remained `available=false`: this is the real no-provider fallback, not a live OpenAI result and not owner testing on physical iPhone.

The official Playwright browser was already downloaded. Eleven official Debian 13 packages were downloaded over HTTPS from `deb.debian.org`, verified against SHA256 in Packages, with the Packages index bound to the Release SHA256. `sqv` verified the clearsigned InRelease against `/usr/share/keyrings/debian-archive-keyring.gpg`; valid signer fingerprints: `04B54C3CDCA79751B16BC6B5225629DF75B188BD`, `41587F7DB8C774BCCF131416762F67A0B2C39DE4`, `B8B80B5B623EAB6AD8775C45B7C5D7D6350947F8`. Packages were extracted using `dpkg-deb --extract` into `.sites-runtime/webkit-deps/root`; there was no OS package installation, maintainer-script execution, root, ldconfig modification or security-setting change. Package URLs, versions and hashes are in `health-doctor-webkit-packages-2026-10-09.json`.

The default Playwright dependency check detects GLES through the system `ldconfig` cache, which does not include local libraries. The bundled shell launcher also replaces LD_LIBRARY_PATH. Instead, the test uses Playwright's supported `executablePath` option to run the exact installed matching native MiniBrowser with its normal bundle environment and the additional local library path. No Playwright source or browser binary was patched, dependency-validation flag was disabled, or sandbox option changed. `ldd` with these paths reports no missing libraries.

Re-run: `bash scripts/run-health-doctor-webkit-local.sh` after the recorded official packages are present. Full evidence: `outputs/health-doctor-recovery/browser-webkit/results.json`, screenshots for each viewport, and `outputs/health-doctor-recovery/logs/health-webkit-local-native.log`. Harness lint and shell syntax checks pass.

Supported mechanisms: [Playwright BrowserType launch options](https://playwright.dev/docs/api/class-browsertype#browser-type-launch), [official binary-package extraction instructions](https://ubuntu.com/project/docs/contributors/updating/extract-packages/#extract-a-binary-package).

## New-key fallback — permitted, narrow helper blocker remains

The OpenAI API Key skill explicitly permits typed destination confirmation when the picker and destination form are unavailable. Its text-only creation path omits organization/project IDs and uses the connector's default target. The absence of a widget or an explicit project selection is therefore **not independently a blocker** for this fallback. The earlier broader conclusion is corrected.

The actual missing prerequisite is the shipped `scripts/openai-platform-api-key.mjs` helper. Searches covered the selected workspace skill directories, `/opt/codex`, `/usr/local/share`, and the current agent's installed plugin/skill directories; no foreign session directories were searched. Executor skill discovery returned no installed skills. Reading the plugin-root helper resource through `skills.read` failed, while SKILL.md and its reference evals were readable. No prepare/decrypt operation was attempted and no substitute credential helper was invented.

The applicable precise requirement is: **“Use the helper by absolute path”**, followed by the prescribed `prepare` and `decrypt` steps. Source: `skill://plugin_connector_1p_32dba5a7095c8191adca04ee30276304/openai-platform-api-key/SKILL.md`. Provisioning can proceed once the official helper is made available through the trusted plugin installation/resource path and the confirmations below are obtained. The widget need not be repaired if that text-only route is used.

## Exact pending user confirmations for the parent

The decision **new key** is already made and must not be re-asked.

- Purpose/name: new `BarDoctor QA Health-Doctor 2026-10-09` key for isolated local QA only; do not replace production secrets.
- Destination: `/workspace/BarDoctor-AI/.env.local`, variable `OPENAI_API_KEY`. `.gitignore:32` ignores it; it is untracked, absent, not a symlink, and its parent resolves to the selected repository.
- Target: **default organization/project of the connected OpenAI Platform connector**; explicit names/IDs are not confirmed. No IDs may be invented. Obtain acceptance of that default instead of pretending the user selected a named project.
- Consumption: one paid live `POST /api/ai/diagnosis` on a small isolated QA fixture, assert `context.provider.available=true` and visible result, then reload without a second generation. Current code defaults to `gpt-5.4-mini`, caps output at 8,000 tokens, and does not retry the provider request automatically. Do not invent a guaranteed price; actual token usage is billable.

The skill's destination question, to ask only when the helper prerequisite is resolved, is:

> Save the new key to /workspace/BarDoctor-AI/.env.local? Reply yes to continue, another workspace-relative env-file path to change it, or decline.

The parent should present the purpose, connector-default target and one-call billing scope alongside that destination confirmation. No plaintext secret needs to pass through chat. In this follow-up no key was created, no secret was written, and no AI request was made. Push/merge/publication remain unperformed and unauthorized.

## Final credential attempt — connector rejection

This update supersedes the pending helper/confirmation sections above. The user explicitly approved a new key in the connected account's default project, the ignored local `.env.local` destination, and exactly one isolated live diagnosis with an overall USD 0.50 limit. The parent verified the connected account, Personal organization, sole active Default project, and USD 6.67 balance through authenticated browser UI; those browser IDs were not treated as picker-confirmed IDs.

Official bundle and Library downloads both returned HTTP 403. The parent then supplied the unchanged, non-secret official OpenAI Developers 1.3.6 helper as task input. Its local bytes verified exactly: 13,600 bytes; SHA256 `7dd08001d0712226b443bdd00f45f99a90a58bdf10e25595da29850849a2fa23`. No substitute helper was used.

The official helper's `prepare` succeeded after destination safety checks. Exactly one `create_encrypted_openai_api_key` call was made with the requested QA name and public JWK, omitting organization/project IDs as required by the documented text fallback. The connector returned `isError: true` and **“OpenAI Platform rejected the API key request.”** It returned no encrypted key. No retry or alternate-target attempt was made. The temporary setup keypair and public request file were removed; `.env.local` remains absent. No paid inference request was made, and no plaintext API secret was emitted.

Live provider QA remains **BLOCKED by OpenAI Platform connector rejection**, not by missing user permission, missing helper, an invisible picker, or a demonstrated lack of balance. All previously recorded application/test/browser/CPU results remain unchanged. No push, merge, deployment, or publication was performed.

## Narrow release-guard update after CI 37935421543

The first mandatory CI run failed at the historical presentation-rollback guards. Both loops stop on the first mismatch (`assortment-analytics.ts`); all nine intended recovery modules are in the v489 manifest, and eight are also subject to the v492 byte comparison (canonical-health-inputs already had an older UAT exception). Those guards already model individually reviewed performance/UAT/RCA changes. The current task explicitly authorizes the backend performance repair; it does not restore the rejected UI or authorize unrelated backend changes.

A separate `health-doctor-recovery-approved-files.json` records exactly the nine recovery paths, with before hashes from v501/ad03784 and exact reviewed after hashes. A shared guard validates the fixed path set, baseline identity, each before hash, and each current after hash. Both historical tests use these checked hashes; the original manifests and all unrelated hash/byte comparisons stay unchanged. No file was added to the unchecked UI exclusion set. Any subsequent edit to an approved file fails until independently reviewed again.

Additional mandatory `tests/*.test.ts` coverage rejects extra paths, changed hashes and a substituted baseline; compares every other API/auth/provider/schema/binding/backend file byte-for-byte to v501; and invokes the isolated actual-handler 1000-product/60-recipe/8000-movement linked and unlinked CPU regression, with the original 10-second hard budget. Existing financial differential parity remains unchanged and runs in the same mandatory suite. No CI workflow or production source was changed by this guard update.

Local validation: the seven historical rollback tests PASS; all five parity/release-guard tests PASS, including stress max CPU 3888.650 ms; typecheck PASS. Publication remains conditional on exact-commit full CI and independent review.
