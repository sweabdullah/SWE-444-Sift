/**
 * @sift/web — placeholder.
 *
 * T-3 (BRO-7) replaces this package with the Next.js App Router app
 * (TypeScript strict + Tailwind, logical properties only). Kept as a
 * buildable stub so the workspace and CI work from day one.
 */
import { DEFAULT_LOCALE, directionOf } from "@sift/schema";

export const placeholder = {
  defaultLocale: DEFAULT_LOCALE,
  dir: directionOf(DEFAULT_LOCALE),
};
