import { Link as I18nLink } from "@/i18n/routing";
import { getDoc } from "@/lib/docs";
import { getRelatedTools, getTool, type ToolId } from "@/lib/tools";
import { AlertTriangle, ArrowRight, CircleHelp, Send } from "lucide-react";
import { getTranslations } from "next-intl/server";

type Entry = { title: string; description: string };
type FaqItem = { question: string; answer: string };
type RelatedPost = { title: string; description: string; slug: string };
type SpecTable = {
  title: string;
  intro: string;
  headers: string[];
  rows: string[][];
};

type ToolArticleProps = {
  locale: string;
  toolId: ToolId;
};

/**
 * The prose half of a tool page: what the tool is for, how to run it, what
 * usually goes wrong, and an FAQ. Every tool page renders the same sections so
 * the pages stay comparable and the FAQ/HowTo structured data always matches
 * what is on screen.
 */
export default async function ToolArticle({ locale, toolId }: ToolArticleProps) {
  const t = await getTranslations({
    locale,
    namespace: `Tools.${toolId}.article`,
  });
  const tTools = await getTranslations({ locale, namespace: "Tools" });
  const tDocs = await getTranslations({ locale, namespace: "Docs" });

  const whenToUse = t.raw("whenToUse.items") as Entry[];
  const steps = t.raw("howTo.steps") as Entry[];
  const pitfalls = t.raw("pitfalls.items") as Entry[];
  const faq = t.raw("faq.items") as FaqItem[];
  const relatedPosts = t.raw("relatedPosts") as RelatedPost[];
  const specTable = t.has("specTable")
    ? (t.raw("specTable") as SpecTable)
    : null;
  const relatedTools = getRelatedTools(toolId);
  const relatedDocs = getTool(toolId)
    .relatedDocSlugs.map((slug) => getDoc(locale, slug))
    .filter((doc) => doc !== null);

  return (
    <div className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-start">
      <article className="max-w-3xl">
        <section>
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {t("whenToUse.title")}
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
            {t("whenToUse.intro")}
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {whenToUse.map((item) => (
              <li
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
              >
                <h3 className="font-semibold text-slate-950 dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {item.description}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {t("howTo.title")}
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
            {t("howTo.intro")}
          </p>
          <ol className="mt-6 space-y-5">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-100">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-slate-950 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12">
          <h2 className="flex items-center gap-2 font-heading text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
            <AlertTriangle
              className="size-5 text-amber-500 dark:text-amber-300"
              aria-hidden="true"
            />
            {t("pitfalls.title")}
          </h2>
          <div className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white/80 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950/60">
            {pitfalls.map((item) => (
              <div key={item.title} className="px-5 py-4">
                <h3 className="font-semibold text-slate-950 dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {specTable && (
          <section className="mt-12">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
              {specTable.title}
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
              {specTable.intro}
            </p>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white/85 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
              <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                    {specTable.headers.map((header) => (
                      <th key={header} scope="col" className="px-4 py-3 font-semibold">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {specTable.rows.map((row) => (
                    <tr key={row[0]} className="align-top">
                      {row.map((cell, index) => (
                        <td
                          key={`${row[0]}-${index}`}
                          className={
                            index === 0
                              ? "px-4 py-3.5 font-semibold text-slate-950 dark:text-white"
                              : "px-4 py-3.5 leading-6 text-slate-600 dark:text-slate-300"
                          }
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="mt-12">
          <h2 className="flex items-center gap-2 font-heading text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
            <CircleHelp
              className="size-5 text-blue-600 dark:text-blue-300"
              aria-hidden="true"
            />
            {t("faq.title")}
          </h2>
          <dl className="mt-6 space-y-4">
            {faq.map((item) => (
              <div
                key={item.question}
                className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
              >
                <dt className="font-semibold text-slate-950 dark:text-white">
                  {item.question}
                </dt>
                <dd className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </article>

      <aside className="space-y-6 lg:sticky lg:top-24">
        <div className="rounded-3xl border border-blue-200/80 bg-blue-50/60 p-6 shadow-sm dark:border-blue-500/30 dark:bg-blue-500/10">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Send className="size-4" aria-hidden="true" />
            </span>
            <h2 className="font-heading text-lg font-semibold text-slate-950 dark:text-white">
              {tTools("submitterCard.title")}
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
            {tTools("submitterCard.description")}
          </p>
          <I18nLink
            href="/"
            className="group mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            {tTools("submitterCard.cta")}
            <ArrowRight
              className="size-4 transition-transform duration-150 ease-out-strong group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </I18nLink>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-blue-700 dark:text-blue-200">
            <I18nLink href="/compare" className="hover:underline underline-offset-4">
              {tTools("submitterCard.compareLink")}
            </I18nLink>
            <I18nLink href="/pricing" className="hover:underline underline-offset-4">
              {tTools("submitterCard.pricingLink")}
            </I18nLink>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <h2 className="font-heading text-lg font-semibold text-slate-950 dark:text-white">
            {tTools("relatedToolsTitle")}
          </h2>
          <ul className="mt-4 space-y-3">
            {relatedTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <li key={tool.id}>
                  <I18nLink
                    href={tool.href}
                    className="group flex gap-3 rounded-2xl border border-transparent p-3 transition-[transform,background-color,border-color] duration-150 ease-out-strong hover:border-blue-200 hover:bg-blue-50/60 active:scale-[0.985] dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-950 dark:text-white">
                        {tTools(`cards.${tool.id}.title`)}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-400">
                        {tTools(`cards.${tool.id}.shortDescription`)}
                      </span>
                    </span>
                  </I18nLink>
                </li>
              );
            })}
          </ul>
        </div>

        {relatedDocs.length > 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
            <h2 className="font-heading text-lg font-semibold text-slate-950 dark:text-white">
              {tDocs("related")}
            </h2>
            <ul className="mt-4 space-y-3">
              {relatedDocs.map((doc) => (
                <li key={doc.slug}>
                  <I18nLink
                    href={`/docs/${doc.slug}`}
                    className="group block rounded-2xl border border-transparent p-3 transition-[transform,background-color,border-color] duration-150 ease-out-strong hover:border-blue-200 hover:bg-blue-50/60 active:scale-[0.985] dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-950 dark:text-white">
                      {doc.title}
                      <ArrowRight
                        className="size-3.5 shrink-0 transition-transform duration-150 ease-out-strong group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-400">
                      {doc.summary}
                    </span>
                  </I18nLink>
                </li>
              ))}
            </ul>
          </div>
        )}

        {relatedPosts.length > 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
            <h2 className="font-heading text-lg font-semibold text-slate-950 dark:text-white">
              {tTools("relatedReadingTitle")}
            </h2>
            <ul className="mt-4 space-y-4">
              {relatedPosts.map((post) => (
                <li key={post.slug}>
                  <I18nLink
                    href={`/blog${post.slug}`}
                    className="group block rounded-2xl border border-transparent p-3 transition-[transform,background-color,border-color] duration-150 ease-out-strong hover:border-blue-200 hover:bg-blue-50/60 active:scale-[0.985] dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-950 dark:text-white">
                      {post.title}
                      <ArrowRight
                        className="size-3.5 shrink-0 transition-transform duration-150 ease-out-strong group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-400">
                      {post.description}
                    </span>
                  </I18nLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
