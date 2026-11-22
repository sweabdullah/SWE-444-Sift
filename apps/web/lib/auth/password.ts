import { compare, hash } from "bcryptjs";
export const PASSWORD_COST = 12;
export const PASSWORD_MIN_CHARACTERS = 15;
export const PASSWORD_MAX_BYTES = 72;
let dummyHash: Promise<string> | undefined;
export function validPasswordLength(password: string) {
  return (
    Array.from(password).length >= PASSWORD_MIN_CHARACTERS &&
    Buffer.byteLength(password, "utf8") <= PASSWORD_MAX_BYTES
  );
}
export async function hashPassword(password: string): Promise<string> {
  if (!validPasswordLength(password)) throw new Error("Password policy violation");
  return hash(password, PASSWORD_COST);
}
export async function verifyPassword(password: string, stored: string | null) {
  if (!password || Buffer.byteLength(password, "utf8") > PASSWORD_MAX_BYTES) return false;
  // A missing account still performs a password comparison. Never use this as an account.
  dummyHash ??= hash("missing-account-timing-placeholder", PASSWORD_COST);
  const matches = await compare(password, stored ?? (await dummyHash));
  return stored !== null && matches;
}
