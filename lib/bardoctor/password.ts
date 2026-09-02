// Cloudflare Workers Web Crypto rejects PBKDF2 iteration counts above 100,000.
const PASSWORD_ITERATIONS = 100_000;
const PASSWORD_KEY_BYTES = 32;
const PASSWORD_SALT_BYTES = 16;
const MINIMUM_NEW_PASSWORD_LENGTH = 15;
const MAXIMUM_PASSWORD_LENGTH = 256;

const COMMON_PASSWORDS = new Set([
  "123456", "12345678", "123456789", "1234567890", "111111", "000000",
  "password", "password1", "password123", "qwerty", "qwerty123", "admin",
  "administrator", "letmein", "welcome", "iloveyou", "monkey", "dragon",
  "football", "baseball", "master", "login", "passw0rd", "пароль",
  "йцукен", "bardoctor", "bar doctor",
]);

export type PasswordRecord = {
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
};

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function derivePassword(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt as BufferSource,
      iterations,
    },
    material,
    PASSWORD_KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export function passwordValidationError(password: string): string | null {
  const normalized = password.normalize("NFC");
  if (normalized.length < MINIMUM_NEW_PASSWORD_LENGTH) {
    return `Пароль должен содержать не менее ${MINIMUM_NEW_PASSWORD_LENGTH} символов`;
  }
  if (normalized.length > MAXIMUM_PASSWORD_LENGTH) return "Пароль слишком длинный";
  const commonCandidate = normalized.trim().toLowerCase().replace(/\s+/g, " ");
  if (COMMON_PASSWORDS.has(commonCandidate)) {
    return "Выберите менее распространённый пароль или длинную парольную фразу";
  }
  return null;
}

export async function hashPassword(
  password: string,
  options: { verifiedExistingCredential?: boolean } = {},
): Promise<PasswordRecord> {
  const validationError = options.verifiedExistingCredential
    ? (password.length === 0 || password.length > MAXIMUM_PASSWORD_LENGTH ? "Некорректный пароль" : null)
    : passwordValidationError(password);
  if (validationError) throw new Error(validationError);

  const salt = new Uint8Array(PASSWORD_SALT_BYTES);
  crypto.getRandomValues(salt);
  const digest = await derivePassword(password.normalize("NFC"), salt, PASSWORD_ITERATIONS);
  return {
    passwordHash: toBase64Url(digest),
    passwordSalt: toBase64Url(salt),
    passwordIterations: PASSWORD_ITERATIONS,
  };
}

export async function verifyPassword(
  password: string,
  record: {
    passwordHash: string | null;
    passwordSalt: string | null;
    passwordIterations: number | null;
  },
): Promise<boolean> {
  if (!record.passwordHash || !record.passwordSalt || !record.passwordIterations) {
    return false;
  }
  if (password.length === 0 || password.length > MAXIMUM_PASSWORD_LENGTH) return false;

  try {
    const salt = fromBase64Url(record.passwordSalt);
    const expected = fromBase64Url(record.passwordHash);
    const normalized = password.normalize("NFC");
    const actual = await derivePassword(normalized, salt, record.passwordIterations);
    if (equalBytes(actual, expected)) return true;
    if (normalized === password) return false;
    const legacyActual = await derivePassword(password, salt, record.passwordIterations);
    return equalBytes(legacyActual, expected);
  } catch {
    return false;
  }
}
