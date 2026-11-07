import { directionOf, getTranslator, type Locale } from "@/lib/i18n";

/** Shared wording for the footer and the notice above card figures. */
export function FinancialDisclaimer({ locale }: { locale: Locale }) {
  const t = getTranslator(locale);
  return (
    <p lang={locale} dir={directionOf(locale)} className="text-body text-start text-graphite">
      <strong className="font-semibold">{t("financialDisclaimer.title")}</strong>{" "}
      {t("financialDisclaimer.body")}
    </p>
  );
}
