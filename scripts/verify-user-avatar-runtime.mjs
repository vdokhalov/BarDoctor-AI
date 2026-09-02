import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = 5192;
const origin = `http://127.0.0.1:${port}`;
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `avatar-runtime-${runId}@example.test`;
const password = "Avatar-Runtime-QA-2468";
let serverOutput = "";

const server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: process.cwd(),
  detached: true,
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", (chunk) => { serverOutput = (serverOutput + chunk).slice(-12_000); });
server.stderr.on("data", (chunk) => { serverOutput = (serverOutput + chunk).slice(-12_000); });

function stopServer() {
  if (!server.pid) return;
  try { process.kill(-server.pid, "SIGTERM"); } catch {}
}
process.once("exit", stopServer);
process.once("SIGINT", () => { stopServer(); process.exit(130); });

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try { if ((await fetch(`${origin}/api/healthz`)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Runtime server did not start.\n${serverOutput}`);
}

function authHeaders(session) {
  return {
    "X-Session-Email": session.email,
    "X-Session-Token": session.token,
  };
}

async function json(pathname, options = {}) {
  const response = await fetch(`${origin}${pathname}`, options);
  const body = await response.json();
  return { response, body };
}

try {
  await waitForServer();
  const registered = await json("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, firstName: "Аватар", registrationMode: "owner" }),
  });
  assert.equal(registered.response.status, 201, JSON.stringify(registered.body));
  const session = registered.body;
  const sessionCookie = registered.response.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(sessionCookie, "registration must issue the HttpOnly server session used by image requests");

  const png = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ]);
  const form = new FormData();
  form.append("file", new Blob([png], { type: "image/png" }), "avatar.png");
  const uploaded = await json("/api/users/avatar", {
    method: "POST",
    headers: authHeaders(session),
    body: form,
  });
  assert.equal(uploaded.response.status, 200, JSON.stringify(uploaded.body));
  assert.match(uploaded.body.avatar.id, /^[a-zA-Z0-9-]{20,80}$/);

  const meAfterUpload = await json("/api/users/me", { headers: authHeaders(session) });
  assert.equal(meAfterUpload.body.user.avatarId, uploaded.body.avatar.id);
  const image = await fetch(`${origin}/api/users/avatar/${uploaded.body.avatar.id}`, { headers: { Cookie: sessionCookie } });
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("content-type"), "image/png");

  const loggedIn = await json("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(loggedIn.response.status, 200, JSON.stringify(loggedIn.body));
  assert.equal(loggedIn.body.avatarId, uploaded.body.avatar.id);
  const loginCookie = loggedIn.response.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(loginCookie, "login must restore the HttpOnly server session");
  const meWithCookie = await json("/api/users/me", { headers: { Cookie: loginCookie } });
  assert.equal(meWithCookie.body.user.avatarId, uploaded.body.avatar.id);

  const removed = await json(`/api/users/avatar/${uploaded.body.avatar.id}`, {
    method: "DELETE",
    headers: authHeaders(loggedIn.body),
  });
  assert.equal(removed.response.status, 200, JSON.stringify(removed.body));
  const meAfterDelete = await json("/api/users/me", { headers: authHeaders(loggedIn.body) });
  assert.equal(meAfterDelete.body.user.avatarId, null);

  console.log(JSON.stringify({ ok: true, upload: true, refresh: true, relogin: true, remove: true }, null, 2));
} finally {
  stopServer();
}
