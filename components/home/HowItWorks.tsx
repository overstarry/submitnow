import { Link as I18nLink } from "@/i18n/routing";
import { TOOLS, type ToolId } from "@/lib/tools";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

type Step = {
  title: string;
  description: string;
  /** Optional tool this step maps to, rendered as a shortcut link. */
  tool?: ToolId;
};

export default function HowItWorks() {
  const t = useTranslations("Home.howItWorks");
  const tTools = useTranslations("Tools");
  const steps = t.raw("steps") as Step[];

  return (
    <section id="how-it-works" className="mt-20 scroll-mt-24">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-200">
          {t("eyebrow")}
        </p>
        <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
          {t("title")}
        </h2>
        <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
          {t("description")}
        </p>
      </div>

      <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => {
          const tool = step.tool
            ? TOOLS.find((item) => item.id === step.tool)
            : undefined;

          return (
            <li
              key={step.title}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-100">
                {index + 1}
              </span>
              <h3 className="mt-4 font-semibold text-slate-950 dark:text-white">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {step.description}
              </p>
              {tool && (
                <I18nLink
                  href={tool.href}
                  className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-200"
                >
                  {tTools(`cards.${tool.id}.title`)}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </I18nLink>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
