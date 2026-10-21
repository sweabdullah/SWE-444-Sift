/**
 * Font hook point (placeholder).
 *
 * SFT-10 adds IBM Plex Sans Arabic (and optionally Markazi Text for display) here via
 * `next/font/google`, exposing the CSS variables `--font-plex-arabic` / `--font-markazi`.
 * app/globals.css already reads those variables in its FONT SWAP block, falling back to the
 * system stack until they exist. Thmanyah fonts must NOT be self-hosted (licence) — see
 * the brand audit before changing this.
 *
 * Until then this exports an empty class list so app/[locale]/layout.tsx has one place to
 * attach the font variables: `<html className={fontVariables}>`.
 */
export const fontVariables = "";
