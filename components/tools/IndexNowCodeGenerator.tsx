"use client";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import {
  buildIndexNowPayload,
  generateIndexNowCode,
  type CodeFormat,
} from "@/lib/indexnow-codegen";
import {
  DEFAULT_ENDPOINT_ID,
  INDEXNOW_ENDPOINTS,
  resolveIndexNowEndpoint,
  type IndexNowEndpointId,
} from "@/lib/indexnow-endpoints";
import {
  loadIndexNowProfiles,
  type IndexNowProfile,
} from "@/lib/indexnow-profile";
import { analyzeUrlList, copyText } from "@/lib/seo-tools";
import { Check, Code2, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

const FORMATS: CodeFormat[] = [
  "curl",
  "javascript",
  "python",
  "go",
  "github-actions",
  "json",
];

export default function IndexNowCodeGenerator() {
  const t = useTranslations("Tools.codeGenerator");
  const tCommon = useTranslations("Tools.common");
  const [host, setHost] = useState("");
  const [key, setKey] = useState("");
  const [keyLocation, setKeyLocation] = useState("");
  const [endpointId, setEndpointId] =
    useState<IndexNowEndpointId>(DEFAULT_ENDPOINT_ID);
  const [urls, setUrls] = useState("");
  const [format, setFormat] = useState<CodeFormat>("curl");
  const [copied, setCopied] = useState(false);
  const [savedProfiles, setSavedProfiles] = useState<IndexNowProfile[]>([]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const { profiles, activeProfile } = loadIndexNowProfiles();
      setSavedProfiles(profiles);
      if (activeProfile) {
        setHost(activeProfile.host);
        setKey(activeProfile.key);
        setKeyLocation(activeProfile.keyLocation);
        if (activeProfile.endpointId) setEndpointId(activeProfile.endpointId);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const analysis = useMemo(() => analyzeUrlList(urls), [urls]);
  const normalizedHost = host.trim().toLowerCase();
  const hasHostMismatch =
    analysis.hostGroups.length > 0 &&
    analysis.hostGroups.some((group) => group.host !== normalizedHost);
  const canGenerate =
    Boolean(normalizedHost && key.trim()) &&
    analysis.validUrls.length > 0 &&
    analysis.invalidInputs.length === 0 &&
    !hasHostMismatch;

  const endpoint = resolveIndexNowEndpoint(endpointId);

  const code = useMemo(() => {
    if (!canGenerate) return "";
    return generateIndexNowCode(
      buildIndexNowPayload({
        host: normalizedHost,
        key: key.trim(),
        keyLocation: keyLocation.trim() || undefined,
        urlList: analysis.validUrls,
      }),
      format,
      endpoint.url
    );
  }, [
    analysis.validUrls,
    canGenerate,
    endpoint.url,
    format,
    key,
    keyLocation,
    normalizedHost,
  ]);

  const handleCopy = async () => {
    const didCopy = await copyText(code);
    setCopied(didCopy);
    if (didCopy) {
      trackEvent({
        name: "tool_used",
        toolId: "codeGenerator",
        action: `copy_${format}`,
        value: analysis.validUrls.length,
      });
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-8">
        <h2 className="font-heading text-xl font-semibold text-slate-950 dark:text-white">
          {t("inputTitle")}
        </h2>

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
                  if (profile.endpointId) setEndpointId(profile.endpointId);
                }}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-xs text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {profile.host}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 space-y-5">
          <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
            {t("endpointLabel")}
            <select
              value={endpointId}
              onChange={(event) =>
                setEndpointId(event.target.value as IndexNowEndpointId)
              }
              className="mt-2 h-[46px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-blue-900"
            >
              {INDEXNOW_ENDPOINTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
            {t("hostLabel")}
            <input
              type="text"
              value={host}
              onChange={(event) => setHost(event.target.value)}
              placeholder="www.example.com"
              autoCapitalize="none"
              spellCheck={false}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 shadow-sm transition-[border-color,box-shadow] duration-150 ease-out-strong focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-blue-900"
            />
          </label>
          <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
            {t("keyLabel")}
            <input
              type="text"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="your-indexnow-key"
              autoCapitalize="none"
              spellCheck={false}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-950 shadow-sm transition-[border-color,box-shadow] duration-150 ease-out-strong focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-blue-900"
            />
          </label>
          <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
            {t("keyLocationLabel")}
            <input
              type="url"
              value={keyLocation}
              onChange={(event) => setKeyLocation(event.target.value)}
              placeholder={t("keyLocationPlaceholder")}
              autoCapitalize="none"
              spellCheck={false}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 shadow-sm transition-[border-color,box-shadow] duration-150 ease-out-strong focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-blue-900"
            />
          </label>
          <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
            {t("urlsLabel")}
            <textarea
              value={urls}
              onChange={(event) => setUrls(event.target.value)}
              rows={7}
              placeholder={
                "https://www.example.com/page-1\nhttps://www.example.com/page-2"
              }
              className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-950 shadow-sm transition-[border-color,box-shadow] duration-150 ease-out-strong focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-blue-900"
            />
          </label>
        </div>

        {(analysis.invalidInputs.length > 0 || hasHostMismatch) && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            {hasHostMismatch
              ? t("hostMismatch")
              : t("invalidUrls", { count: analysis.invalidInputs.length })}
          </p>
        )}
      </section>

      <section className="min-w-0 rounded-3xl bg-slate-950 p-6 text-slate-100 shadow-xl sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-semibold">
              {t("outputTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-400">{t("outputHelp")}</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleCopy}
            disabled={!code}
            className="rounded-xl"
          >
            {copied ? (
              <Check
                className="size-4 animate-pop-in text-emerald-600"
                aria-hidden="true"
              />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            {copied ? tCommon("copied") : tCommon("copy")}
          </Button>
        </div>

        <div
          className="mt-6 flex flex-wrap gap-2"
          role="tablist"
          aria-label={t("formatLabel")}
        >
          {FORMATS.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={format === item}
              onClick={() => {
                setFormat(item);
                setCopied(false);
              }}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-[transform,background-color,color] duration-150 ease-out-strong active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 ${
                format === item
                  ? "bg-blue-500 text-white shadow-sm"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {t(`formats.${item}`)}
            </button>
          ))}
        </div>

        {code ? (
          <pre className="mt-5 max-h-[34rem] overflow-auto rounded-2xl bg-slate-900 p-5 text-xs leading-6 text-slate-200">
            <code>{code}</code>
          </pre>
        ) : (
          <div className="mt-5 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 px-6 text-center">
            <Code2 className="size-7 text-slate-500" aria-hidden="true" />
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
              {t("emptyState")}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
