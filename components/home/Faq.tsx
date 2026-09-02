import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

type FaqItem = { question: string; answer: string };

export default function Faq() {
  const t = useTranslations("Home.faq");
  const items = t.raw("items") as FaqItem[];

  return (
    <section id="faq" className="mt-20 scroll-mt-24">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-200">
          {t("eyebrow")}
        </p>
        <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
          {t("title")}
        </h2>
      </div>

      <div className="mt-8 grid gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <details
            key={item.question}
            className="group rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-950 marker:content-none dark:text-white">
              {item.question}
              <ChevronDown
                className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
