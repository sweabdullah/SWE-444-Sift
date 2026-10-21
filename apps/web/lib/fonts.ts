import { IBM_Plex_Sans_Arabic, Markazi_Text } from "next/font/google";

/**
 * Licence-safe web fonts (see apps/web/FONTS.md).
 *
 * The brand faces (Thmanyah Sans / Serif Display) may NOT be web-embedded until Thmanyah
 * grants written approval, so the site uses OFL-licensed Google fonts. `next/font/google`
 * downloads them at build time and self-hosts them from /_next/static — no font files are
 * committed and the browser never calls Google.
 *
 * Each font only exposes a CSS variable; app/globals.css maps them onto the brand tokens
 * in its FONT SWAP block:
 *   --font-plex-arabic → --sift-font-ui      → Tailwind --font-sans (everything)
 *   --font-markazi     → --sift-font-display → Tailwind --font-display (marketing ≥28px only)
 */

/** UI and figures. Arabic + Latin in one family; digits are tabular by default. No 900. */
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

/** Display serif (the "serif says" voice). Marketing headlines at 28px and above only. */
const markazi = Markazi_Text({
  subsets: ["arabic", "latin"],
  weight: "700",
  variable: "--font-markazi",
  display: "swap",
});

/** Class list for <html>: defines the font CSS variables for the whole document. */
export const fontVariables = `${plexArabic.variable} ${markazi.variable}`;
