/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");

let sequence = 0;

async function installSyntheticSession(context, baseUrl, label, fixedEmail) {
  sequence += 1;
  const suffix = `${Date.now()}-${process.pid}-${sequence}`;
  const emailLabel = String(label || "browser").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
  const email = fixedEmail || `browser-${emailLabel}-${suffix}@example.test`;
  let response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "cf-connecting-ip": `2001:db8:${(Date.now() & 0xffff).toString(16)}::${sequence}`,
    },
    body: JSON.stringify({
      email,
      password: "Browser-QA-Passphrase-2468",
      firstName: "Browser QA",
      registrationMode: "owner",
    }),
  });
  let body = await response.json();
  if (response.status === 409 && fixedEmail) {
    response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "cf-connecting-ip": `2001:db8:${(Date.now() & 0xffff).toString(16)}::${sequence}`,
      },
      body: JSON.stringify({ email, password: "Browser-QA-Passphrase-2468" }),
    });
    body = await response.json();
  }
  assert.ok(response.status === 200 || response.status === 201, JSON.stringify(body));
  const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(cookie, "browser QA registration must issue a server session cookie");
  const profile = await fetch(`${baseUrl}/api/restaurants`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "X-BarDoctor-Client-Contract": "1",
      "X-Venue-Id": String(body.activeVenueId),
    },
    body: JSON.stringify({
      name: `Browser QA ${label || "venue"}`,
      businessType: "Бар",
      country: "MD",
      city: "Chisinau",
      currency: "MDL",
    }),
  });
  assert.equal(profile.status, 200, await profile.text());
  const separator = cookie.indexOf("=");
  await context.addCookies([{
    name: cookie.slice(0, separator),
    value: decodeURIComponent(cookie.slice(separator + 1)),
    url: baseUrl,
  }]);
  return body;
}

module.exports = { installSyntheticSession };
