import Image from "next/image";
import Link from "next/link";
import { isLocale, otherLocale, placeholderCopy } from "@/lib/i18n";
import { notFound } from "next/navigation";

/** Placeholder home page. Real content arrives with the catalogue stories. */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = placeholderCopy[locale];
  const other = otherLocale(locale);

  return (
    <div className="mx-auto flex min-h-dvh max-w-page flex-col px-6">
      <header className="flex items-center justify-between gap-4 py-6">
        <Image
          src={`/sift-lockup-${locale}-on-light.svg`}
          alt={copy.logoAlt}
          width={160}
          height={48}
          className="h-10 w-auto"
          unoptimized
          priority
        />
        <Link
          href={`/${other}`}
          hrefLang={other}
          lang={other}
          className="rounded-md border border-line bg-white ps-4 pe-4 py-2 text-label text-platinum-deep hover:border-platinum-deep"
        >
          {copy.switchLabel}
        </Link>
      </header>
      <main className="flex flex-1 flex-col justify-center py-16">
        <h1 className="text-title text-start">{copy.title}</h1>
        <p className="mt-3 max-w-xl text-start text-platinum-deep">{copy.tagline}</p>
      </main>
    </div>
  );
}
