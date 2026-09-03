import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("Home keeps canonical Health and Finance ahead of the saved Reviews card", async () => {
  const [bundle, endpoint, service, css, buildScript] = await Promise.all([
    source("public/assets/index-BQGspy0I.js"),
    source("app/api/reviews/home/route.ts"),
    source("lib/bardoctor/review-sources.ts"),
    source("public/home-reviews-v409.css"),
    source("scripts/build-verified.sh"),
  ]);
  const daily = bundle.slice(bundle.indexOf("function bdHomeDaily"), bundle.indexOf("function bdHealthSafeComputeV342"));
  assert.ok(daily.indexOf("bdHomeHealthIndexV200") < daily.indexOf("bdHomeMoneyCard"));
  assert.ok(daily.indexOf("bdHomeMoneyCard") < daily.indexOf("bdHomeReviewsCardV409"));
  assert.ok(daily.indexOf("bdHomeReviewsCardV409") < daily.indexOf("bdHomeAttention"));
  assert.match(bundle, /bdCanonicalSnapshot=g/);
  assert.match(bundle, /data-bd-home-health-index":"business-health-snapshot-v334/);
  assert.match(bundle, /data-bd-home-money":"result-v151/);
  assert.match(bundle, /bdBuildMonthlyReport/);
  assert.match(endpoint, /authenticateRequest/);
  assert.match(endpoint, /reviews\.view/);
  assert.match(service, /loadHomeReviewSnapshot/);
  const snapshot = service.slice(service.indexOf("export async function loadHomeReviewSnapshot"), service.indexOf("async function upsertConnection"));
  assert.doesNotMatch(snapshot, /syncGoogleReviews|fetchGoogleReviews|ensureImportedConnection/);
  assert.match(css, /grid-template-columns: minmax\(0, 1\.3fr\) minmax\(330px, \.7fr\)/);
  assert.ok((buildScript.match(/patch-home-reviews-ux-v409\.mjs/g) || []).length >= 2);
});

test("Home Reviews maps live metrics, CTAs and controlled degraded states without demo values", async () => {
  const bundle = await source("public/assets/index-BQGspy0I.js");
  const card = bundle.slice(bundle.indexOf("function bdHomeReviewsCardV409"), bundle.indexOf("function bdHomeDaily"));
  assert.match(card, /a\.averageRating/);
  assert.match(card, /a\.total/);
  assert.match(card, /a\.new7d/);
  assert.match(card, /a\.new30d/);
  assert.match(card, /a\.needsAttention/);
  assert.match(card, /r\.lastSyncedAt/);
  assert.match(card, /\/reviews\?filter=unanswered/);
  assert.match(card, /\/integrations\?flow=google/);
  assert.match(card, /disconnected-v409/);
  assert.match(card, /error-v409/);
  assert.match(card, /empty-v409/);
  assert.match(card, /Анализ появится после обработки отзывов/);
  assert.doesNotMatch(card, /3[,.]19|105 отзыв|€4|128\s?540|Health[^\n]{0,20}76/);
  const fetcher = bundle.slice(bundle.indexOf("function bdFetchHomeReviewsV409"), bundle.indexOf("function bdHomeReviewsCardV409"));
  assert.match(fetcher, /\/api\/reviews\/home/);
  assert.doesNotMatch(fetcher, /\/api\/reviews\/sources|\/api\/reviews\/analyze|google\/sync/);
});

test("Reviews is a direct desktop module while the six-action mobile contract remains intact", async () => {
  const [bundle, css, route] = await Promise.all([
    source("public/assets/index-BQGspy0I.js"),
    source("public/home-reviews-v409.css"),
    source("app/reviews/route.ts"),
  ]);
  assert.match(bundle, /key:"reviews",name:"Отзывы",href:"\/reviews",icon:Mf/);
  assert.match(bundle, /bdMoreHasPermissionV166\("reviews\.view"\)&&\{key:"reviews"/);
  assert.match(bundle, /\]\s*\.filter\(Boolean\);\s*const d=/);
  assert.match(css, /\[data-bd-nav-key="reviews"\] \{ display: none !important; \}/);
  assert.match(css, /@media \(min-width: 1024px\)[\s\S]*\[data-bd-nav-key="reviews"\] \{ display: flex !important; \}/);
  const shell = await source("public/app.html");
  assert.match(shell, /<link rel="stylesheet" href="\/home-reviews-v409\.css[^"]*" \/>/);
  assert.doesNotMatch(shell, /home-reviews-v409\.css[^>]*media="print"/);
  assert.match(route, /data-bd-parent-route="\/more"/);
  assert.match(route, /href="\/more" aria-label="Вернуться в раздел «Ещё»/);
});

test("Reviews supports status filters, search, source, translations and a confirm-before-publish draft", async () => {
  const [client, route, css] = await Promise.all([
    source("public/reviews.js"),
    source("app/reviews/route.ts"),
    source("public/reviews.css"),
  ]);
  assert.match(client, /statusFilterButton\("all", "Все"/);
  assert.match(client, /statusFilterButton\("unanswered", "Без ответа"/);
  assert.match(client, /statusFilterButton\("negative", "Негативные"/);
  assert.match(client, /state\.search\.trim/);
  assert.match(client, /review-source-select/);
  assert.match(client, /sourceMetadata/);
  assert.match(client, /Показать перевод Google/);
  assert.match(client, /\/api\/reviews\/reply/);
  assert.match(client, /review-reply-context/);
  assert.match(route, /Черновик не публикуется автоматически/);
  assert.doesNotMatch(client, /publishReply|autoReply|auto-reply/);
  assert.match(css, /review-translation/);
});

test("Google connection management lives in Integrations and preserves permissions", async () => {
  const [integrationsRoute, integrationsClient, reviewsClient, callback, endpoint] = await Promise.all([
    source("app/integrations/route.ts"),
    source("public/integrations.js"),
    source("public/reviews.js"),
    source("lib/bardoctor/review-sources.ts"),
    source("app/api/reviews/home/route.ts"),
  ]);
  assert.match(integrationsRoute, /data-integration-view="google"/);
  assert.match(integrationsRoute, /Google Client ID/);
  assert.match(integrationsRoute, /Google Client Secret/);
  assert.match(integrationsClient, /\/api\/reviews\/sources\/google\/connect/);
  assert.match(integrationsClient, /\/api\/reviews\/sources\/google\/sync/);
  assert.match(reviewsClient, /\/integrations\?flow=google/);
  assert.match(callback, /`\/integrations\?flow=google&\$\{query\}`/);
  assert.match(endpoint, /ACCESS_DENIED/);
  assert.match(endpoint, /reviews\.manage/);
});
