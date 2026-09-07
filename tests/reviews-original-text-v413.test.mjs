import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("original Google review text stays canonical in list, search and reply context", async () => {
  const [client, browserQa] = await Promise.all([
    source("public/reviews.js"),
    source("scripts/mobile-navigation-qa-v269.cjs"),
  ]);

  const originalText = "We waited too long and the music was too loud.";
  const translatedText = "Очень долго ждали заказ, музыка была слишком громкой.";
  assert.notEqual(originalText, translatedText);
  assert.match(browserQa, new RegExp(`originalText: ${JSON.stringify(originalText).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.match(browserQa, new RegExp(`translatedText: ${JSON.stringify(translatedText).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));

  const helpers = client.slice(client.indexOf("function reviewSourceMetadata"), client.indexOf("function needsAttention"));
  assert.match(helpers, /metadata\.originalText/);
  assert.match(helpers, /metadata\.translatedText/);

  const list = client.slice(client.indexOf("function renderReviewList"), client.indexOf("function renderDoctor"));
  assert.match(list, /\[reviewOriginalText\(review\), reviewTranslatedText\(review\), review\.authorName/);
  assert.match(list, /node\("p", "review-item-text", originalText\)/);
  assert.match(list, /node\("p", "", translatedText\)/);

  const reply = client.slice(client.indexOf("async function prepareReply"), client.indexOf("async function loadData"));
  assert.match(reply, /var originalText = reviewOriginalText\(review\)/);
  assert.match(reply, /Object\.assign\(\{\}, review, \{ text: originalText \}\)/);
  assert.match(reply, /"\\n" \+ originalText/);
  assert.doesNotMatch(reply, /"\\n" \+ review\.text/);

  assert.match(browserQa, /await first\.getByRole\("button", \{ name: "Подготовить ответ", exact: true \}\)\.click\(\)/);
  assert.match(browserQa, /Anna\.\*We waited too long\.\*Черновик не публикуется автоматически/);
});

test("review reply remains scoped by authenticated venue context", async () => {
  const [handler, context, auth] = await Promise.all([
    source("lib/bardoctor/ai-handlers.ts"),
    source("lib/bardoctor/venue-ai-context.ts"),
    source("lib/bardoctor/auth.ts"),
  ]);
  const reply = handler.slice(handler.indexOf("async function reviewReply"), handler.indexOf("async function reviewCorrelate"));
  const route = handler.slice(handler.indexOf("export async function handleReviewAI"));
  assert.match(route, /requireLocalAccount\(request, "reviews\.manage"\)/);
  assert.match(reply, /loadVenueAIContext\(account, "reviews", body\)/);
  assert.match(context, /\.where\(eq\(domainData\.accountId, account\.id\)\)/);
  assert.match(auth, /const context = await venueContextForAccount\(identitySession\.account, requestedVenueId\)/);
  assert.match(auth, /\.\.\.context\.dataAccount/);
  assert.match(auth, /venueId: context\.venue\.id/);
});
