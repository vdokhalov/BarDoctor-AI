import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("registration creates the requested app account instead of reusing ChatGPT identity", async () => {
  const [register, schema, migration] = await Promise.all([
    read("app/api/auth/register/route.ts"),
    read("db/schema.ts"),
    read("drizzle/0008_misty_gorilla_man.sql"),
  ]);

  assert.doesNotMatch(register, /findAccountByChatGPTEmail/);
  assert.match(register, /findAccountByAppEmail\(appEmail\)/);
  assert.match(register, /hashPassword\(body\.password\)/);
  assert.doesNotMatch(schema, /accounts_chatgpt_email_uq/);
  assert.match(migration, /DROP INDEX `accounts_chatgpt_email_uq`/);
});

test("login requires the app password and bootstrap cannot choose an account by ChatGPT email", async () => {
  const [login, bootstrap, legacyImport] = await Promise.all([
    read("app/api/auth/login/route.ts"),
    read("app/api/auth/bootstrap/route.ts"),
    read("lib/bardoctor/legacy-import.ts"),
  ]);

  assert.match(login, /verifyPassword\(body\.password, existing\)/);
  assert.match(login, /existing && chatgptEmail === existing\.chatgptEmail/);
  assert.match(login, /passwordUpgraded: true/);
  assert.match(login, /canImportLegacyAccount\(chatgptEmail, email\)/);
  assert.ok(
    login.indexOf("canImportLegacyAccount(chatgptEmail, email)")
      < login.indexOf("authenticateLegacyPassword(email, body.password)"),
    "legacy credentials must not leave the app before identity ownership is checked",
  );
  assert.doesNotMatch(bootstrap, /findAccountByChatGPTEmail/);
  assert.match(legacyImport, /LEGACY_IDENTITY_MISMATCH/);
  assert.match(legacyImport, /canImportLegacyAccount\(chatgptEmail, appEmail\)/);
});

test("logout revokes the exact server-side session before clearing the browser", async () => {
  const [logout, auth, bundle] = await Promise.all([
    read("app/api/auth/logout/route.ts"),
    read("lib/bardoctor/auth.ts"),
    read("public/assets/index-BQGspy0I.js"),
  ]);

  assert.match(logout, /authenticateIdentityRequest\(request\)/);
  assert.match(logout, /revokeAuthenticatedSession\(request, account\.id\)/);
  assert.match(auth, /eq\(sessions\.tokenHash, tokenHash\)/);
  assert.match(auth, /eq\(sessions\.accountId, accountId\)/);
  assert.match(bundle, /await bdLogoutSession\(\),sz\(\),yz\(\)/);
});

test("venue profile changes are captured before replacement", async () => {
  const restaurant = await read("app/api/restaurants/route.ts");

  assert.match(restaurant, /const before = account\.restaurantJson/);
  assert.match(restaurant, /storeKey: "restaurant_profile"/);
  assert.match(restaurant, /beforeJson:/);
  assert.match(restaurant, /afterJson:/);
});
