import Link from "next/link";
import { FILTER_PARAMS, FILTER_REWARD_TYPES, type CatalogueFilters } from "@/lib/filters";
import { getTranslator, type Locale } from "@/lib/i18n";

type Props = { locale: Locale; filters: CatalogueFilters };

/**
 * The catalogue filter panel. A plain GET form: the filters become the page's query string, so
 * they work without JavaScript and a filtered view can be bookmarked or shared. Server component.
 */
export function CatalogueFiltersForm({ locale, filters }: Props) {
  const t = getTranslator(locale);

  return (
    <form
      method="get"
      action={`/${locale}`}
      aria-labelledby="filters-heading"
      className="flex flex-col gap-5 rounded-md border border-line bg-white p-5"
    >
      <h2 id="filters-heading" className="text-start font-semibold">
        {t("catalogue.filters.heading")}
      </h2>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-start text-label font-semibold">
          {t("catalogue.filters.rewardLegend")}
        </legend>
        <p className="text-start text-label text-platinum-deep">
          {t("catalogue.filters.rewardHint")}
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
          {FILTER_REWARD_TYPES.map((type) => (
            <label key={type} className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                name={FILTER_PARAMS.reward}
                value={type}
                defaultChecked={filters.rewardTypes.includes(type)}
                className="size-5 accent-graphite"
              />
              <span>{t(`catalogue.filters.reward.${type}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-start text-label font-semibold">
          {t("catalogue.filters.feeLegend")}
        </legend>
        <p className="text-start text-label text-platinum-deep">{t("catalogue.filters.feeHint")}</p>
        <div className="flex flex-wrap gap-4 pt-1">
          <AmountInput
            name={FILTER_PARAMS.feeMin}
            label={t("catalogue.filters.feeMin")}
            value={filters.feeMin}
          />
          <AmountInput
            name={FILTER_PARAMS.feeMax}
            label={t("catalogue.filters.feeMax")}
            value={filters.feeMax}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-start text-label font-semibold">
          {t("catalogue.filters.incomeLegend")}
        </legend>
        <p className="text-start text-label text-platinum-deep">
          {t("catalogue.filters.incomeHint")}
        </p>
        <div className="pt-1">
          <AmountInput
            name={FILTER_PARAMS.income}
            label={t("catalogue.filters.incomeLabel")}
            value={filters.income}
          />
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <button
          type="submit"
          className="min-h-11 rounded-md bg-graphite ps-5 pe-5 py-2 font-semibold text-white hover:bg-graphite-deep"
        >
          {t("catalogue.filters.apply")}
        </button>
        <Link
          href={`/${locale}`}
          className="min-h-11 content-center rounded-md border border-line ps-5 pe-5 py-2 text-platinum-deep hover:border-platinum-deep"
        >
          {t("catalogue.filters.clear")}
        </Link>
      </div>
    </form>
  );
}

/** A SAR amount field. Western digits; `dir="ltr"` keeps the number readable in Arabic. */
function AmountInput({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value: number | null;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-start text-label">{label}</span>
      <input
        type="number"
        name={name}
        min={0}
        step="any"
        inputMode="decimal"
        dir="ltr"
        defaultValue={value ?? ""}
        className="min-h-11 w-32 rounded-md border border-line bg-white ps-3 pe-3 text-start"
      />
    </label>
  );
}
