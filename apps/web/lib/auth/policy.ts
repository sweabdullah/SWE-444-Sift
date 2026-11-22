// Shared by browser feedback and authoritative server validation. No secrets or Node imports.
export const PASSWORD_MIN_CHARACTERS = 8;
export const PASSWORD_MAX_CHARACTERS = 128;
const common = new Set([
  "password",
  "password1",
  "password123",
  "password1234",
  "passwordpassword",
  "passw0rd",
  "12345678",
  "123456789",
  "1234567890",
  "123456789012345",
  "87654321",
  "abcdefgh",
  "qwertyui",
  "qwerty123",
  "qwertyuiop",
  "asdfghjk",
  "asdfghjkl",
  "zxcvbnm123",
  "letmein123",
  "letmeinletmein",
  "iloveyou",
  "iloveyou123",
  "welcome1",
  "welcome123",
  "admin123",
  "admin1234",
  "administrator",
  "changeme",
  "changeme123",
  "sift1234",
  "siftpassword",
  "sift-dev-password",
  "correcthorsebatterystaple",
  "كلمةالمرور",
  "كلمهالمرور",
]);
export type PasswordIssue = "passwordRule" | "passwordTooLong" | "commonPassword";
export function supportedPassword(password: string): boolean {
  if (!password || password.length > PASSWORD_MAX_CHARACTERS * 2) return false;
  const characters = Array.from(password);
  return (
    characters.length <= PASSWORD_MAX_CHARACTERS &&
    !characters.some((c) => {
      const point = c.codePointAt(0) ?? 0;
      return point >= 0xd800 && point <= 0xdfff;
    })
  );
}
export function passwordIssue(password: string): PasswordIssue | null {
  if (
    password.length > PASSWORD_MAX_CHARACTERS * 2 ||
    Array.from(password).length > PASSWORD_MAX_CHARACTERS
  )
    return "passwordTooLong";
  if (!supportedPassword(password) || Array.from(password).length < PASSWORD_MIN_CHARACTERS)
    return "passwordRule";
  const comparable = password.normalize("NFKC").toLowerCase().replace(/\s+/gu, "");
  if (!comparable || common.has(comparable)) return "commonPassword";
  const characters = Array.from(comparable);
  for (let width = 1; width <= 4; width++) {
    if (
      characters.length % width === 0 &&
      characters
        .slice(0, width)
        .join("")
        .repeat(characters.length / width) === comparable
    )
      return "commonPassword";
  }
  return null;
}
