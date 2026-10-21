# Fonts

## What ships today

| Role                                                   | Font                 | Weights       | Source                               | Licence |
| ------------------------------------------------------ | -------------------- | ------------- | ------------------------------------ | ------- |
| UI, body, figures (`--sift-font-ui`)                   | IBM Plex Sans Arabic | 400, 500, 700 | `next/font/google` in `lib/fonts.ts` | SIL OFL |
| Marketing headlines ≥28px only (`--sift-font-display`) | Markazi Text         | 700           | `next/font/google` in `lib/fonts.ts` | SIL OFL |

- `next/font/google` downloads the fonts **at build time** and serves them from `/_next/static`. The browser never calls Google, and **no font files are committed** to this repo.
- Both fonts cover Arabic and Latin (`subsets: ["arabic", "latin"]`).
- Plex has no 900 weight, so `--sift-weight-figure` is 700 for now. Don't let the browser fake a bold 900.
- Use the display serif only through `font-display`, and only on marketing headlines of 28px or more (`text-title`, `text-h1`, `text-display`). Everything else uses `font-sans`, which is the default.

## Why not Thmanyah (the brand fonts)

The brand kit specifies Thmanyah Sans and Thmanyah Serif Display. Their licence allows websites only "as part of a compiled, packaged, or obfuscated product". It also forbids hosting the font files or letting users download them, "including through web embedding". Normal `@font-face` or `next/font/local` self-hosting is therefore **not allowed** on the public site.

**Status:** not approved. We need **written approval from ask@thmanyah.com** before any web embedding.

**Until then:** do not commit any Thmanyah file (`.woff`, `.woff2`, `.ttf`, `.otf`) anywhere in this repo, including `public/`.

## Swapping to Thmanyah after approval

All font choices go through one block: the `FONT SWAP POINT` `:root` block at the top of `app/globals.css`. Tailwind's `--font-sans` and `--font-display` read from it.

1. Check what the approval covers. If it allows self-hosting, add the files with `next/font/local` in `lib/fonts.ts`, and expose the same kind of CSS variable, for example `--font-thmanyah-sans`. If it requires another delivery method (for example a packaged or obfuscated build), follow that instead.
2. In `app/globals.css`, replace the three active lines of the `FONT SWAP POINT` block with the commented Thmanyah lines below them:
   ```css
   --sift-font-ui: "Thmanyah Sans", var(--sift-font-system);
   --sift-font-display: "Thmanyah Serif Display", serif;
   --sift-weight-figure: 900;
   ```
   If you used `next/font/local`, reference its variable instead of the quoted family name.
3. In `lib/fonts.ts`, remove the `IBM_Plex_Sans_Arabic` and `Markazi_Text` imports, and leave `fontVariables` listing only the new variables.
4. Thmanyah Sans has **no `tnum`** and uses proportional digits. Right-align figure columns rather than relying on equal digit widths.
5. Run `pnpm check`, and check `/ar` and `/en` at 375px.

No component should need to change. Components use only `font-sans`, `font-display` and `font-figure`, never a font name.
