// Cloudflare Workers Web Crypto rejects PBKDF2 iteration counts above 100,000.
const PASSWORD_ITERATIONS = 100_000;
const PASSWORD_KEY_BYTES = 32;
const PASSWORD_SALT_BYTES = 16;

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
      salt,
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
  if (password.length < 6) return "Пароль должен содержать не менее 6 символов";
  if (password.length > 256) return "Пароль слишком длинный";
  return null;
}

export async function hashPassword(password: string): Promise<PasswordRecord> {
  const validationError = passwordValidationError(password);
  if (validationError) throw new Error(validationError);

  const salt = new Uint8Array(PASSWORD_SALT_BYTES);
  crypto.getRandomValues(salt);
  const digest = await derivePassword(password, salt, PASSWORD_ITERATIONS);
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
  if (password.length === 0 || password.length > 256) return false;

  try {
    const salt = fromBase64Url(record.passwordSalt);
    const expected = fromBase64Url(record.passwordHash);
    const actual = await derivePassword(password, salt, record.passwordIterations);
    return equalBytes(actual, expected);
  } catch {
    return false;
  }
}
