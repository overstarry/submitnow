"use client";

import {
  checkIndexNowKey,
  type KeyCheckResult,
} from "@/actions/indexnow-key-check";
import KeyCheckReport from "@/components/indexnow/KeyCheckReport";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import {
  loadIndexNowProfiles,
  type IndexNowProfile,
} from "@/lib/indexnow-profile";
import { Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type CheckState = "idle" | "loading" | "done" | "error";

export default function IndexNowKeyChecker() {
  const t = useTranslations("Tools.keyChecker");
  const [host, setHost] = useState("");
  const [key, setKey] = useState("");
  const [keyLocation, setKeyLocation] = useState("");
  const [savedProfiles, setSavedProfiles] = useState<IndexNowProfile[]>([]);
  const [state, setState] = useState<CheckState>("idle");
  const [result, setResult] = useState<Extract<
    KeyCheckResult,
    { success: true }
  > | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const { profiles, activeProfile } = loadIndexNowProfiles();
      setSavedProfiles(profiles);
      if (activeProfile) {
        setHost(activeProfile.host);
        setKey(activeProfile.key);
        setKeyLocation(activeProfile.keyLocation);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData();
    formData.set("host", host.trim());
    formData.set("key", key.trim());
    formData.set("keyLocation", keyLocation.trim());

    setState("loading");
    setResult(null);
    setErrorMessage("");

    try {
      const response = await checkIndexNowKey(formData);
      if (!response.success) {
        setState("error");
        setErrorMessage(t(`errors.${response.errorCode}`));
        trackEvent({
          name: "tool_used",
          toolId: "keyChecker",
          action: "failed",
        });
        return;
      }

      setResult(response);
      setState("done");
      trackEvent({
        name: "tool_used",
        toolId: "keyChecker",
        action: response.valid ? "valid" : "issues_found",
        value: response.issues.length,
      });
    } catch {
      setState("error");
      setErrorMessage(t("errors.fetch_failed"));
      trackEvent({
        name: "tool_used",
        toolId: "keyChecker",
        action: "failed",
      });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-8">
        <h2 className="font-heading text-xl font-semibold text-slate-950 dark:text-white">
          {t("formTitle")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {t("formHelp")}
        </p>

        {savedProfiles.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {savedProfiles.map((profile) => (
              <button
                key={profile.host}
                type="button"
                onClick={() => {
                  setHost(profile.host);
                  setKey(profile.key);
                  setKeyLocation(profile.keyLocation);
                }}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-xs text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {profile.host}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="key-check-host"
              className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-200"
            >
              {t("hostLabel")}{" "}
              <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="key-check-host"
              name="host"
              value={host}
              onChange={(event) => setHost(event.target.value)}
              required
              placeholder={t("hostPlaceholder")}
              disabled={state === "loading"}
              className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 font-mono text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-[border-color,box-shadow] duration-150 ease-out-strong focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200/70 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder-slate-600 dark:focus:ring-blue-900/40"
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {t("hostHelp")}
            </p>
          </div>

          <div>
            <label
              htmlFor="key-check-key"
              className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-200"
            >
              {t("keyLabel")}{" "}
              <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="key-check-key"
              name="key"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              required
              placeholder={t("keyPlaceholder")}
              disabled={state === "loading"}
              className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 font-mono text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-[border-color,box-shadow] duration-150 ease-out-strong focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200/70 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder-slate-600 dark:focus:ring-blue-900/40"
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {t("keyHelp")}
            </p>
          </div>

          <div>
            <label
              htmlFor="key-check-location"
              className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-200"
            >
              {t("keyLocationLabel")}
            </label>
            <input
              id="key-check-location"
              name="keyLocation"
              value={keyLocation}
              onChange={(event) => setKeyLocation(event.target.value)}
              placeholder={t("keyLocationPlaceholder")}
              disabled={state === "loading"}
              className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 font-mono text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-[border-color,box-shadow] duration-150 ease-out-strong focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200/70 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder-slate-600 dark:focus:ring-blue-900/40"
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {t("keyLocationHelp")}
            </p>
          </div>

          <Button
            type="submit"
            disabled={state === "loading"}
            className="h-11 w-full rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700"
          >
            {state === "loading" ? (
              <Loader2 className="size-4 animate-spin-fast" aria-hidden="true" />
            ) : (
              <Search className="size-4" aria-hidden="true" />
            )}
            {state === "loading" ? t("checking") : t("check")}
          </Button>
        </form>

        <div className="mt-6 min-h-5">
          {state === "error" && (
            <p
              className="animate-surface-in rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
              aria-live="polite"
            >
              {errorMessage}
            </p>
          )}
          {state === "done" && result && <KeyCheckReport result={result} />}
        </div>
      </section>

      <aside className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 dark:border-slate-800 dark:bg-slate-900/50">
        <h2 className="font-heading text-lg font-semibold text-slate-950 dark:text-white">
          {t("checklistTitle")}
        </h2>
        <ul className="mt-5 space-y-4">
          {(t.raw("checklist") as string[]).map((item) => (
            <li
              key={item}
              className="flex gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300"
            >
              <span
                className="mt-2 size-1.5 shrink-0 rounded-full bg-blue-500"
                aria-hidden="true"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm leading-6 text-slate-600 dark:border-blue-500/20 dark:bg-slate-950/70 dark:text-slate-300">
          {t("serverFetchNote")}
        </p>
      </aside>
    </div>
  );
}
