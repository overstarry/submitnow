import { Link as I18nLink } from "@/i18n/routing";
import { ArrowLeft, BookOpen, Wrench } from "lucide-react";

export default function LocaleNotFound() {
  return (
    <section className="w-full py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">
          404
        </p>
        <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
          Page not found
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
          The page you requested could not be found or may have moved. Use the
          links below to return to the IndexNow submission tool, utilities, or
          documentation.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <I18nLink
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Home
          </I18nLink>
          <I18nLink
            href="/tools"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Wrench className="size-4" aria-hidden="true" />
            Tools
          </I18nLink>
          <I18nLink
            href="/docs"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <BookOpen className="size-4" aria-hidden="true" />
            Docs
          </I18nLink>
        </div>
      </div>
    </section>
  );
}
