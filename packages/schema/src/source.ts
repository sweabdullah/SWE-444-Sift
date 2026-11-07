/**
 * Browser URL normalization. Published origins currently support ASCII DNS hosts;
 * IDN/A-label hosts require a reviewed SQL IDNA implementation and fail closed.
 */
export function normalizeSourceUrl(candidate: string): string | null {
  if (
    !/^https?:\/\/[^/?#]+/i.test(candidate) ||
    [...candidate].some(
      (char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127 || char === "\\",
    ) ||
    /%(?![0-9a-f]{2})/i.test(candidate)
  )
    return null;
  if (candidate.split(/[/?#]/)[2]?.includes("@")) return null;
  try {
    const url = new URL(candidate);
    const labels = url.hostname.split(".");
    if (
      url.username ||
      url.password ||
      url.hostname.length > 253 ||
      labels.length < 2 ||
      !/^[a-z]/i.test(labels.at(-1) ?? "") ||
      labels.some(
        (label) => /^xn--/i.test(label) || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label),
      )
    )
      return null;
    if (url.port === "0") return null;
    return url.href;
  } catch {
    return null;
  }
}
export function httpSourceHost(candidate: string): string | null {
  const normalized = normalizeSourceUrl(candidate);
  return normalized ? new URL(normalized).hostname : null;
}
/** Exact approved origins from BankEntryUrl. Display homepages never grant authority. */
export function isOfficialSourceUrl(
  candidate: string,
  registeredSiteUrls: readonly string[],
): boolean {
  const normalized = normalizeSourceUrl(candidate);
  if (!normalized) return false;
  const origin = new URL(normalized).origin;
  return registeredSiteUrls.some((site) => {
    const approved = normalizeSourceUrl(site);
    return approved !== null && new URL(approved).origin === origin;
  });
}
