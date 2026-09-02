import { Link as I18nLink } from "@/i18n/routing";
import { getRelatedTools, type ToolId } from "@/lib/tools";
import { AlertTriangle, ArrowRight, CircleHelp } from "lucide-react";
import { getTranslations } from "next-intl/server";

type Entry = { title: string; description: string };
type FaqItem = { question: string; answer: string };
type RelatedPost = { title: string; description: string; slug: string };

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

  const whenToUse = t.raw("whenToUse.items") as Entry[];
  const steps = t.raw("howTo.steps") as Entry[];
  const pitfalls = t.raw("pitfalls.items") as Entry[];
  const faq = t.raw("faq.items") as FaqItem[];
  const relatedPosts = t.raw("relatedPosts") as RelatedPost[];
  const relatedTools = getRelatedTools(toolId);

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
                    className="group flex gap-3 rounded-2xl border border-transparent p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/60 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10"
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
                    className="group block rounded-2xl border border-transparent p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/60 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-950 dark:text-white">
                      {post.title}
                      <ArrowRight
                        className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
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
