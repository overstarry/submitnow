import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

type ResponseCode = {
  code: string;
  label: string;
  meaning: string;
  action: string;
  /** "ok" renders green, anything else renders as a problem row. */
  tone: "ok" | "warn" | "error";
};

const TONE_STYLES: Record<ResponseCode["tone"], string> = {
  ok: "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200",
  warn: "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200",
  error: "bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-200",
};

/**
 * The IndexNow response codes, with a dedicated diagnosis page for each one.
 */
export default function ResponseCodes() {
  const t = useTranslations("Home.responseCodes");
  const codes = t.raw("items") as ResponseCode[];

  return (
    <section id="response-codes" className="mt-20 scroll-mt-24">
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

      <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/60">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th scope="col" className="px-5 py-3 font-semibold">
                {t("columns.code")}
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                {t("columns.meaning")}
              </th>
              <th scope="col" className="px-5 py-3 font-semibold">
                {t("columns.action")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {codes.map((item) => (
              <tr
                key={item.code}
                id={`code-${item.code}`}
                className="scroll-mt-28 align-top transition-colors duration-150 hover:bg-slate-50/80 dark:hover:bg-slate-900/50"
              >
                <td className="px-5 py-4">
                  <Link
                    href={`/docs/status-codes/${item.code}`}
                    className={`inline-flex items-center rounded-lg px-2.5 py-1 font-mono text-xs font-semibold tabular-nums underline-offset-4 transition-[transform,opacity] duration-150 ease-out-strong hover:underline active:scale-[0.97] ${TONE_STYLES[item.tone]}`}
                  >
                    {item.code}
                  </Link>
                  <span className="mt-1.5 block text-xs text-slate-500 dark:text-slate-400">
                    {item.label}
                  </span>
                </td>
                <td className="px-5 py-4 leading-6 text-slate-700 dark:text-slate-200">
                  {item.meaning}
                </td>
                <td className="px-5 py-4 leading-6 text-slate-600 dark:text-slate-300">
                  {item.action}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
