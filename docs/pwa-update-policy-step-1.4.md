# BarDoctor PWA update policy — STEP 1.4

- BarDoctor does not install a first-party application-cache service worker. The OneSignal workers are push-only.
- HTML is network-first and short-lived; assets are content/version addressed.
- Current clients send `X-BarDoctor-Client-Contract: 1` on mutations and read `/api/release`.
- The backend rejects a missing, older, or future contract on critical accounting mutations with HTTP 426 before route code and side effects run.
- The client shows one explicit update dialog. Reload is user-triggered, so no automatic reload loop exists.
- Authentication and external machine-to-machine endpoints are outside this browser contract and keep their own authentication/versioning rules.

