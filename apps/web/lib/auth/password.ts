import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { compare } from "bcryptjs";
import { passwordIssue, supportedPassword } from "./policy";
export { PASSWORD_MIN_CHARACTERS, PASSWORD_MAX_CHARACTERS } from "./policy";
// OWASP's 32 MiB scrypt profile. Fixed, versioned parameters prevent untrusted cost selection.
const N = 32768,
  r = 8,
  p = 3,
  keyLength = 32;
const PREFIX = "$sift$scrypt$v1$32768$8$3$";
let active = 0;
const waiters: Array<() => void> = [];
async function bounded<T>(work: () => Promise<T>): Promise<T> {
  if (active < 2) active++;
  else {
    if (waiters.length >= 16) throw new Error("Password hashing is busy");
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  try {
    return await work();
  } finally {
    const next = waiters.shift();
    if (next) next();
    else active--;
  }
}
function derive(password: string, salt: Buffer): Promise<Buffer> {
  return bounded(
    () =>
      new Promise((resolve, reject) => {
        scrypt(password, salt, keyLength, { N, r, p, maxmem: 64 * 1024 * 1024 }, (error, key) => {
          if (error) reject(error);
          else resolve(key);
        });
      }),
  );
}
export function validPasswordLength(password: string) {
  return supportedPassword(password) && Array.from(password).length >= 8;
}
export async function hashPassword(password: string): Promise<string> {
  if (passwordIssue(password)) throw new Error("Password policy violation");
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `${PREFIX}${salt.toString("base64url")}$${key.toString("base64url")}`;
}
export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!supportedPassword(password)) return false;
  if (stored?.startsWith(PREFIX)) {
    const parts = stored.slice(PREFIX.length).split("$");
    if (
      parts.length !== 2 ||
      !/^[A-Za-z0-9_-]{22}$/.test(parts[0] ?? "") ||
      !/^[A-Za-z0-9_-]{43}$/.test(parts[1] ?? "")
    )
      return false;
    const salt = Buffer.from(parts[0] ?? "", "base64url");
    const expected = Buffer.from(parts[1] ?? "", "base64url");
    if (
      salt.length !== 16 ||
      expected.length !== keyLength ||
      salt.toString("base64url") !== parts[0] ||
      expected.toString("base64url") !== parts[1]
    )
      return false;
    return timingSafeEqual(await derive(password, salt), expected);
  }
  // Existing bcrypt rows remain readable. Never silently truncate their input at 72 bytes.
  if (stored && /^\$2[aby]\$(0[4-9]|1[0-5])\$[./A-Za-z0-9]{53}$/.test(stored)) {
    if (Buffer.byteLength(password, "utf8") > 72) return false;
    return bounded(() => compare(password, stored));
  }
  // Missing/unsupported accounts still do real password work; no account is created here.
  await derive(password, Buffer.alloc(16));
  return false;
}
