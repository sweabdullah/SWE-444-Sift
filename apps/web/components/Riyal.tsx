import type { Locale } from "@sift/schema";
import { formatSAR } from "@/lib/format";

/**
 * Saudi riyal symbol — official SAMA geometry (brand kit 05-Symbols), recoloured to
 * `currentColor` so it takes the text colour. Never redraw, flip or mirror it.
 * Size per brand: 0.7em tall, width = 0.7 × 1124.14 / 1256.39 = 0.6265em, on the baseline.
 */
export function RiyalSymbol({ label }: { label?: string }) {
  return (
    <svg
      viewBox="0 0 1124.14 1256.39"
      fill="currentColor"
      className="inline-block h-[0.7em] w-[0.6265em] align-baseline"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      focusable="false"
    >
      <path d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z" />
      <path d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z" />
    </svg>
  );
}

const SYMBOL_LABEL: Record<Locale, string> = {
  ar: "ريال سعودي",
  en: "Saudi riyal",
};

/**
 * A riyal amount: symbol LEFT of the number with one space, in both languages.
 * Wrapped in an LTR-isolated, non-wrapping span so RTL text never reorders `⃁ -250`.
 */
export function Riyal({
  value,
  locale,
  maximumFractionDigits,
}: {
  value: number;
  locale: Locale;
  maximumFractionDigits?: number;
}) {
  const text = formatSAR(
    value,
    locale,
    maximumFractionDigits === undefined ? {} : { maximumFractionDigits },
  );
  return (
    <span dir="ltr" className="whitespace-nowrap" style={{ unicodeBidi: "isolate" }} data-riyal="">
      <RiyalSymbol label={SYMBOL_LABEL[locale]} /> {text}
    </span>
  );
}
