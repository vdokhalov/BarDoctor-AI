import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("user integrations are organised by systems rather than transport internals", async () => {
  const [page, client] = await Promise.all([
    source("app/integrations/route.ts"),
    source("public/integrations.js"),
  ]);

  assert.match(page, /УЧЁТ И ПРОДАЖИ/);
  assert.match(page, /ОТЗЫВЫ И РЕПУТАЦИЯ/);
  assert.match(page, /Отзывы гостей/);
  assert.doesNotMatch(page, /КОНКУРЕНТЫ|Google Places|google-places-card/);
  assert.match(page, /ИМПОРТ ИЗ ФАЙЛА/);
  assert.match(page, /Какую систему вы используете\?/);
  assert.match(page, /1С:Предприятие/);
  assert.match(page, /iiko[\s\S]*Скоро/);
  assert.match(page, /r_keeper[\s\S]*Скоро/);
  assert.match(page, /Poster[\s\S]*Скоро/);
  assert.match(page, /canonicalAppNavigationForRequest\(request, "more"\)/);

  assert.doesNotMatch(page, /data-card="openai"|data-card="onesignal"/i);
  assert.doesNotMatch(page, /OAuth Client ID|Client secret|Google API key|OPENAI_API_KEY|ONESIGNAL_REST_API_KEY/);
  assert.doesNotMatch(client, /Сохранить OneSignal|Осталось:|В этом месяце использовано/);
});

test("the new experience reuses production integration capabilities and honest state", async () => {
  const client = await source("public/integrations.js");
  assert.match(client, /\/api\/integration-hub/);
  assert.match(client, /\/api\/integration-hub\/connections/);
  assert.match(client, /\/api\/integration-hub\/import\/preview/);
  assert.match(client, /\/api\/integration-hub\/import/);
  assert.match(client, /\/api\/reviews\/sources/);
  assert.match(client, /Настроить источники/);
  assert.doesNotMatch(client, /\/api\/competitors\/me|googlePlacesPresentation|renderGooglePlaces/);
  assert.match(client, /connection\.localStatus/);
  assert.match(client, /Агент ещё не подключался/);
  assert.match(client, /lastSuccessAt/);
  assert.match(client, /Выпустить новый ключ/);
  assert.match(client, /Отозвать ключ/);
  assert.match(client, /sequence !== state\.sequence \|\| requestVenue !== currentVenueId\(\)/);
  assert.match(client, /window\.addEventListener\("bd:venue-will-change"/);
});

test("mobile and desktop layouts share the same semantic content without horizontal table flows", async () => {
  const css = await source("public/integrations.css");
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /@media \(min-width: 1024px\)/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /grid-template-columns: repeat\(6, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(css, /overflow-x:\s*auto/);
});
