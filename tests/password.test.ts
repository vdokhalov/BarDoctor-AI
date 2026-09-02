import assert from "node:assert/strict";
import test from "node:test";
import {
  hashPassword,
  passwordValidationError,
  verifyPassword,
} from "../lib/bardoctor/password";

test("passwords are salted and verified without storing plaintext", async () => {
  const first = await hashPassword("correct horse battery staple");
  const second = await hashPassword("correct horse battery staple");

  assert.notEqual(first.passwordSalt, second.passwordSalt);
  assert.notEqual(first.passwordHash, second.passwordHash);
  assert.equal(first.passwordIterations, 100_000);
  assert.equal(await verifyPassword("correct horse battery staple", first), true);
  assert.equal(await verifyPassword("wrong-password", first), false);
  assert.equal(first.passwordHash.includes("correct horse battery staple"), false);
});

test("password verification rejects incomplete records and invalid lengths", async () => {
  assert.equal(passwordValidationError("short-password"), "Пароль должен содержать не менее 15 символов");
  assert.equal(passwordValidationError("correct horse battery staple"), null);
  assert.equal(passwordValidationError("passwordpassword"), null);
  assert.match(passwordValidationError("password") ?? "", /не менее 15/);
  assert.equal(
    await verifyPassword("123456", {
      passwordHash: null,
      passwordSalt: null,
      passwordIterations: null,
    }),
    false,
  );
});
