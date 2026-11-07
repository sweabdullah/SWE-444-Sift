import { FinancialDisclaimer } from "@/components/FinancialDisclaimer";
import type { Locale } from "@/lib/locale";

export function SiteFooter({ locale }: { locale: Locale }) {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto max-w-page px-6 py-6">
        <FinancialDisclaimer locale={locale} />
      </div>
    </footer>
  );
}
