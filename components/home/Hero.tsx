import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import Link from "next/link";

const INDEXNOW_DOCS_URL = "https://www.indexnow.org/documentation";

export default function Hero() {
  const t = useTranslations("Home");

  return (
    <section className="w-full text-center lg:text-left">
      <h1 className="mx-auto max-w-4xl text-balance font-display text-5xl font-bold text-slate-900 sm:text-7xl dark:text-slate-100 lg:mx-0">
        {t("title")}
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-pretty text-2xl text-slate-700 dark:text-slate-400 lg:mx-0">
        {t("tagLine")}
      </p>
      <p className="mx-auto mt-3 max-w-3xl text-pretty text-base text-slate-600 dark:text-slate-400 lg:mx-0">
        {t("description")}
      </p>

      <div className="mt-10 flex flex-col items-center justify-center gap-2 sm:flex-row lg:justify-start">
        <Button
          className="h-11 w-full rounded-xl border-2 border-blue-600 bg-white px-8 py-2 text-blue-600 hover:text-blue-700 sm:w-fit"
          variant="outline"
          asChild
        >
          <Link
            href={INDEXNOW_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            title={t("ctaDocs")}
            prefetch={false}
            className="flex items-center gap-2"
          >
            {t("ctaDocs")}
          </Link>
        </Button>
      </div>
    </section>
  );
}
