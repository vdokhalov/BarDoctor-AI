# RV05 calendar notification status

Baseline: v665, d3540e89668245b3ce007c61cf60def25bf4156c. No live mutations or notification/provider requests.

## Previous work

3fc3629c separated the event countdown from preparation dates. da1db8f5 corrected elapsed preparation deadlines. d6392fb3 corrected Notifications/Integrations Back navigation. None changed notificationCopy in public/opportunities.js or calendar recipient routing.

## Reproduced locally

Executing the exact baseline notificationCopy with current preferences enabled/calendarAlerts true and a saved disabled plan produces «Уведомления календаря выключены в настройках». A planned event with not_needed produces «Уведомления появятся после планирования события».

Current GET returns notificationStatus for actorAccountId; the client previously ignored it. Reconciliation combines category flags AND serverConfigured into a single disabled status. No-candidate events receive not_needed (including elapsed dates), so that status does not mean the event is unplanned.

The narrow UI change uses current category/server flags, reports missing plans honestly, and distinguishes provider scheduling from device delivery. Offline cached data explicitly says the status was not refreshed. No scheduling, recipients, preferences, permissions, AI or data writes changed.

## Separate unresolved routing issue

lib/bardoctor/auth.ts returns context.dataAccount.id and actorAccountId separately. GET opportunities and notifications settings use the actor; all three reconcileOpportunityNotifications calls pass account.id (venue data account). Reconciliation reads that account's preferences/config and enqueues jobs under it. notification-jobs dispatches to job.account_id; sendPushToAccount targets oneSignalExternalId(accountId). Thus an additional venue can consult and target a different identity from the settings screen. This is a code-path finding, not live proof of a lost notification.

Do not silently replace the account ID: the venue calendar is shared; changing the acting manager would otherwise change recipients/cancellation ownership and could duplicate sends. Resolve intended recipient policy (owner, actor, or explicit membership subscribers) before the delivery fix. No recipient expansion or external sending was authorized or performed here.

## Coverage and limits

19 targeted tests: actual client copy, notification center/category and device separation, scheduler windows/timezone/retry/idempotency, run cadence. Original copy reproduction above is equivalent local data, not the original audit snapshot.

Physical device permission, subscription health, background execution and real push delivery are NOT verified. Scheduled/provider-accepted is not delivered. No push test endpoint, calendar refresh (paid search), or production calendar GET was called.

Final verification: verified build PASS; restored only build-generated blank-line noise in unrelated SPA bundle and re-finalized/verified the asset references. Actual calendar HTML + final dist/client JS exercised in local browser with intercepted fixture responses at 390/820/1280, expanded card, enabled category/stale disabled plan, category disabled, service unavailable, reload: PASS, no horizontal page overflow, zero non-GET requests and no external calls. Screenshots inspected at outputs/rv05/calendar-{390,820,1280}.png. This is UI fixture coverage, not actual backend scheduling/delivery integration. Typecheck retains only baseline business-health-snapshot.ts:372 and health-partial-operations-v539.test.ts:10 errors.
