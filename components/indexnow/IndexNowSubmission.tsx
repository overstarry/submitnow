"use client";

import { submitIndexNow, type IndexNowErrorCode } from "@/actions/indexnow";
import {
  checkIndexNowKey,
  type KeyCheckResult,
} from "@/actions/indexnow-key-check";
import { fetchRemoteSitemap } from "@/actions/sitemap-fetch";
import KeyCheckReport from "@/components/indexnow/KeyCheckReport";
import SubmissionHistory from "@/components/indexnow/SubmissionHistory";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { trackEvent } from "@/lib/analytics";
import { consumeStagedUrls } from "@/lib/handoff";
import {
  DEFAULT_ENDPOINT_ID,
  INDEXNOW_ENDPOINTS,
  resolveIndexNowEndpoint,
  type IndexNowEndpointId,
} from "@/lib/indexnow-endpoints";
import {
  deleteIndexNowProfile,
  loadIndexNowProfiles,
  setActiveIndexNowProfile,
  upsertIndexNowProfile,
  type IndexNowProfile,
} from "@/lib/indexnow-profile";
import {
  analyzeUrlList,
  chunkUrls,
  downloadTextFile,
  generateIndexNowKey,
  MAX_INDEXNOW_BATCH_BYTES,
  MAX_INDEXNOW_BATCH_SIZE,
} from "@/lib/seo-tools";
import {
  addSubmissionHistory,
  clearSubmissionHistory,
  loadSubmissionHistory,
  type SubmissionHistoryEntry,
} from "@/lib/submission-history";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  Download,
  ExternalLink,
  FileUp,
  Globe,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { BiLogoBing } from "react-icons/bi";
import { FaYandex } from "react-icons/fa";
import { SiNaver } from "react-icons/si";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

type SubmitStatus = "idle" | "loading" | "success" | "error";
type PreflightStatus = "idle" | "loading" | "done" | "error";
type SitemapFetchStatus = "idle" | "loading" | "done" | "error";

const LASTMOD_OPTIONS = [
  { value: "", key: "all" },
  { value: "1", key: "last24h" },
  { value: "7", key: "last7d" },
  { value: "30", key: "last30d" },
] as const;

export default function IndexNowSubmission() {
  const t = useTranslations("IndexNow");
  const tChecker = useTranslations("Tools.keyChecker");
  const supportedEngines = [
    { id: "bing", name: "Bing", icon: BiLogoBing },
    { id: "yandex", name: "Yandex", icon: FaYandex },
    { id: "seznam", name: "Seznam.cz", monogram: "SE" },
    { id: "naver", name: "Naver", icon: SiNaver },
    { id: "yep", name: "Yep", monogram: "Y" },
  ];

  const formRef = useRef<HTMLFormElement>(null);
  const [urls, setUrls] = useState("");
  const [key, setKey] = useState("");
  const [host, setHost] = useState("");
  const [keyLocationInput, setKeyLocationInput] = useState("");
  const [endpointId, setEndpointId] =
    useState<IndexNowEndpointId>(DEFAULT_ENDPOINT_ID);
  const [rememberProfile, setRememberProfile] = useState(false);
  const [savedProfiles, setSavedProfiles] = useState<IndexNowProfile[]>([]);
  const [history, setHistory] = useState<SubmissionHistoryEntry[]>([]);

  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [errorDetailText, setErrorDetailText] = useState<string>("");
  const [errorStatusCode, setErrorStatusCode] = useState<number | null>(null);
  const [submittedCount, setSubmittedCount] = useState<number | null>(null);
  const [submittedBatches, setSubmittedBatches] = useState<number>(1);
  const [submittedHost, setSubmittedHost] = useState<string | null>(null);
  const [submittedEndpointName, setSubmittedEndpointName] = useState<
    string | null
  >(null);
  const [keyLocation, setKeyLocation] = useState<string | null>(null);

  const [preflightStatus, setPreflightStatus] =
    useState<PreflightStatus>("idle");
  const [preflightResult, setPreflightResult] = useState<Extract<
    KeyCheckResult,
    { success: true }
  > | null>(null);
  const [preflightError, setPreflightError] = useState("");

  // Remote sitemap importer state
  const [showSitemapPanel, setShowSitemapPanel] = useState(false);
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [sitemapMaxAgeDays, setSitemapMaxAgeDays] = useState("");
  const [sitemapStatus, setSitemapStatus] =
    useState<SitemapFetchStatus>("idle");
  const [sitemapMessage, setSitemapMessage] = useState("");

  // A batch prepared in the batch builder, url normalizer, or sitemap diff arrives here.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const staged = consumeStagedUrls();
      if (staged) setUrls(staged);

      const { profiles, activeProfile } = loadIndexNowProfiles();
      setSavedProfiles(profiles);
      if (activeProfile) {
        setKey(activeProfile.key);
        setHost(activeProfile.host);
        setKeyLocationInput(activeProfile.keyLocation);
        if (activeProfile.endpointId) {
          setEndpointId(activeProfile.endpointId);
        }
        setRememberProfile(true);
      }
      setHistory(loadSubmissionHistory());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const liveAnalysis = useMemo(() => analyzeUrlList(urls), [urls]);
  const plannedChunks = useMemo(
    () =>
      chunkUrls(
        liveAnalysis.validUrls,
        MAX_INDEXNOW_BATCH_SIZE,
        MAX_INDEXNOW_BATCH_BYTES
      ),
    [liveAnalysis.validUrls]
  );
  const plannedBatches = plannedChunks.length;

  const statusMessage = useMemo(() => {
    if (status === "success") {
      if (submittedCount === null || !submittedHost || !keyLocation) {
        return t("successMessage");
      }
      if (submittedBatches > 1) {
        return t("successMessageBatched", {
          count: submittedCount,
          batches: submittedBatches,
          host: submittedHost,
          endpoint: submittedEndpointName ?? resolveIndexNowEndpoint(endpointId).name,
        });
      }
      return t("successMessageWithDetails", {
        count: submittedCount,
        host: submittedHost,
        keyLocation,
      });
    }
    return "";
  }, [
    endpointId,
    keyLocation,
    status,
    submittedBatches,
    submittedCount,
    submittedEndpointName,
    submittedHost,
    t,
  ]);

  const formatServerError = (
    errorCode: IndexNowErrorCode,
    details?: Record<string, unknown>
  ): { message: string; detail: string; statusCode: number | null } => {
    const responseStatus = (details?.status as number | undefined) ?? 0;
    const retryAfter = (details?.retryAfterSeconds as number | undefined) ?? 60;

    let message: string;
    if (errorCode.startsWith("bing_")) {
      message = t(`errors.${errorCode}`, { status: responseStatus });
    } else if (errorCode === "rate_limited") {
      message = t("errors.rate_limited", { seconds: retryAfter });
    } else if (errorCode === "key_location_scope_mismatch") {
      message = t("errors.key_location_scope_mismatch", {
        prefix: String(details?.directoryPrefix ?? "/"),
      });
    } else {
      message = t(`errors.${errorCode}`);
    }

    const detailParts: string[] = [];
    if (typeof details?.invalidUrl === "string" && details.invalidUrl) {
      detailParts.push(
        t("errors.detailInvalidUrl", { url: details.invalidUrl })
      );
    }
    if (Array.isArray(details?.hosts) && details.hosts.length > 0) {
      detailParts.push(
        t("errors.detailHosts", { hosts: (details.hosts as string[]).join(", ") })
      );
    }
    if (typeof details?.got === "number" && typeof details?.max === "number") {
      detailParts.push(
        t("errors.detailCount", { got: details.got, max: details.max })
      );
    }
    if (
      typeof details?.providedHost === "string" &&
      typeof details?.derivedHost === "string"
    ) {
      detailParts.push(`${details.providedHost} ≠ ${details.derivedHost}`);
    }

    return {
      message,
      detail: detailParts.join(" · "),
      statusCode: responseStatus || null,
    };
  };

  const handleSelectProfile = (profile: IndexNowProfile) => {
    setActiveIndexNowProfile(profile.host);
    setHost(profile.host);
    setKey(profile.key);
    setKeyLocationInput(profile.keyLocation);
    if (profile.endpointId) setEndpointId(profile.endpointId);
    setRememberProfile(true);
    setPreflightStatus("idle");
    setPreflightResult(null);
  };

  const handleDeleteProfile = (targetHost: string) => {
    const next = deleteIndexNowProfile(targetHost);
    setSavedProfiles(next);
    if (host.trim().toLowerCase() === targetHost) {
      setRememberProfile(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    try {
      const content = await file.text();
      setUrls(content);
      setStatus("idle");
      trackEvent({
        name: "tool_used",
        toolId: "indexnow",
        action: "import_file",
      });
    } catch {
      setStatus("error");
      setErrorMessage(t("importFailure"));
      setErrorDetailText("");
      setErrorStatusCode(null);
    }
  };

  const handleFetchSitemap = async () => {
    if (!sitemapUrl.trim()) return;

    setSitemapStatus("loading");
    setSitemapMessage("");

    const payload = new FormData();
    payload.set("url", sitemapUrl.trim());
    if (sitemapMaxAgeDays) {
      payload.set("maxAgeDays", sitemapMaxAgeDays);
    }

    try {
      const result = await fetchRemoteSitemap(payload);
      if (!result.success) {
        setSitemapStatus("error");
        setSitemapMessage(
          t(`sitemapImport.errors.${result.errorCode}`, {
            status: result.status ?? 0,
          })
        );
        return;
      }

      const extractedUrls = result.entries.map((e) => e.url);
      setUrls(extractedUrls.join("\n"));
      if (!host.trim() && extractedUrls.length > 0) {
        try {
          setHost(new URL(extractedUrls[0]).hostname);
        } catch {
          // ignore
        }
      }
      setSitemapStatus("done");
      setSitemapMessage(
        t("sitemapImport.summary", {
          count: extractedUrls.length,
          sitemaps: result.fetchedSitemapsCount,
          total: result.totalExtractedCount,
        })
      );
      setStatus("idle");
      trackEvent({
        name: "tool_used",
        toolId: "indexnow",
        action: "fetch_sitemap",
        value: extractedUrls.length,
      });
    } catch {
      setSitemapStatus("error");
      setSitemapMessage(t("sitemapImport.errors.fetch_failed"));
    }
  };

  const handleReloadHistory = (entry: SubmissionHistoryEntry) => {
    if (entry.sampleUrls && entry.sampleUrls.length > 0) {
      setUrls(entry.sampleUrls.join("\n"));
    }
    if (entry.host) {
      setHost(entry.host);
      const matchedProfile = savedProfiles.find((p) => p.host === entry.host);
      if (matchedProfile) {
        setKey(matchedProfile.key);
        setKeyLocationInput(matchedProfile.keyLocation);
      }
    }
    if (entry.endpointId) {
      setEndpointId(entry.endpointId);
    }
    setStatus("idle");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /**
   * The key file is the single most common reason IndexNow rejects a batch, so
   * it can be verified from the form before anything is submitted.
   */
  const handlePreflight = async () => {
    const effectiveKey = key.trim();
    const effectiveHost =
      host.trim() || liveAnalysis.hostGroups[0]?.host || "";

    setPreflightStatus("loading");
    setPreflightResult(null);
    setPreflightError("");

    if (!effectiveKey || !effectiveHost) {
      setPreflightStatus("error");
      setPreflightError(t("preflight.missingInput"));
      return;
    }

    const payload = new FormData();
    payload.set("key", effectiveKey);
    payload.set("host", effectiveHost);
    payload.set("keyLocation", keyLocationInput.trim());

    try {
      const result = await checkIndexNowKey(payload);
      if (!result.success) {
        setPreflightStatus("error");
        setPreflightError(tChecker(`errors.${result.errorCode}`));
        return;
      }

      setPreflightResult(result);
      setPreflightStatus("done");
    } catch {
      setPreflightStatus("error");
      setPreflightError(tChecker("errors.fetch_failed"));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setStatus("loading");
    setBatchProgress(null);
    setErrorMessage("");
    setErrorDetailText("");
    setErrorStatusCode(null);
    setSubmittedCount(null);
    setSubmittedBatches(1);
    setSubmittedHost(null);
    setSubmittedEndpointName(null);
    setKeyLocation(null);

    // If URLs are valid, same-host, and require multiple chunks (either > 10,000
    // URLs or > 2 MB payload), automatically chunk and submit sequentially.
    const shouldAutoBatch =
      liveAnalysis.invalidInputs.length === 0 &&
      liveAnalysis.hostGroups.length === 1 &&
      plannedChunks.length > 1;

    const batches = shouldAutoBatch ? plannedChunks : [urls];

    let totalSubmitted = 0;
    let lastStatus = 200;
    let resolvedHost =
      host.trim().toLowerCase() || liveAnalysis.hostGroups[0]?.host || "";
    let resolvedKeyLocation = keyLocationInput.trim();
    let resolvedEndpointName = resolveIndexNowEndpoint(endpointId).name;

    try {
      for (let index = 0; index < batches.length; index += 1) {
        if (batches.length > 1) {
          setBatchProgress({ current: index + 1, total: batches.length });
        }

        const batchPayload = new FormData();
        batchPayload.set("key", key.trim());
        batchPayload.set("host", host.trim());
        batchPayload.set("keyLocation", keyLocationInput.trim());
        batchPayload.set("endpoint", endpointId);
        batchPayload.set(
          "urls",
          Array.isArray(batches[index])
            ? (batches[index] as string[]).join("\n")
            : (batches[index] as string)
        );

        const result = await submitIndexNow(batchPayload);
        if (!result.success) {
          const formatted = formatServerError(result.errorCode, result.details);
          const batchPrefix =
            batches.length > 1
              ? t("batchFailedPrefix", {
                  current: index + 1,
                  total: batches.length,
                  submitted: totalSubmitted,
                }) + " "
              : "";

          setStatus("error");
          setBatchProgress(null);
          setErrorMessage(batchPrefix + formatted.message);
          setErrorDetailText(formatted.detail);
          setErrorStatusCode(formatted.statusCode);

          setHistory(
            addSubmissionHistory({
              host: resolvedHost,
              urlCount: liveAnalysis.validUrls.length,
              outcome: "error",
              httpStatus: formatted.statusCode ?? undefined,
              errorCode: result.errorCode,
              endpointId,
              batchCount: batches.length,
              sampleUrls: liveAnalysis.validUrls,
            })
          );
          trackEvent({
            name: "indexnow_submission",
            action: "error",
            value: liveAnalysis.validUrls.length,
          });
          return;
        }

        totalSubmitted += result.submittedCount;
        lastStatus = result.status;
        resolvedHost = result.host;
        resolvedKeyLocation = result.keyLocation;
        resolvedEndpointName = result.endpointName;
      }

      setBatchProgress(null);
      setStatus("success");
      setSubmittedCount(totalSubmitted);
      setSubmittedBatches(batches.length);
      setSubmittedHost(resolvedHost);
      setSubmittedEndpointName(resolvedEndpointName);
      setKeyLocation(resolvedKeyLocation);

      if (rememberProfile) {
        const nextProfiles = upsertIndexNowProfile({
          host: resolvedHost,
          key: key.trim(),
          keyLocation: keyLocationInput.trim(),
          endpointId,
        });
        setSavedProfiles(nextProfiles);
      }

      setHistory(
        addSubmissionHistory({
          host: resolvedHost,
          urlCount: totalSubmitted,
          outcome: "success",
          httpStatus: lastStatus,
          endpointId,
          batchCount: batches.length,
          sampleUrls: liveAnalysis.validUrls,
        })
      );
      trackEvent({
        name: "indexnow_submission",
        action: "success",
        value: totalSubmitted,
      });
    } catch (error) {
      setBatchProgress(null);
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : t("errors.network_error")
      );
      setErrorDetailText("");
    }
  };

  return (
    <section id="indexnow-form" className="w-full scroll-mt-24">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/85 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_20px_40px_-24px_rgba(15,23,42,0.18)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/75 dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_24px_48px_-24px_rgba(0,0,0,0.7)]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-blue-50 via-white to-transparent dark:from-blue-500/10 dark:via-slate-950"
          aria-hidden="true"
        />
        <div className="relative border-b border-slate-200/70 px-6 py-6 dark:border-slate-800/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-balance font-heading text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-slate-100">
                {t("title")}
              </h2>
              <p className="mt-2 text-pretty text-sm text-slate-600 dark:text-slate-300">
                {t("description")}
              </p>
            </div>
            <div className="inline-flex items-center rounded-full border border-blue-200/80 bg-blue-50/80 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
              {t("bingOnlyNote")}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3.5 text-xs text-slate-600 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-300">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {t("supportedEnginesTitle")}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("supportedEnginesNote")}
              </p>
            </div>
            <ul
              className="mt-2.5 flex flex-wrap gap-2"
              aria-label={t("supportedEnginesTitle")}
            >
              {supportedEngines.map((engine) => {
                const Icon = engine.icon;
                return (
                  <li
                    key={engine.id}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                  >
                    <span className="flex size-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                      {Icon ? (
                        <Icon className="size-3.5" aria-hidden="true" />
                      ) : (
                        <span className="text-xs font-semibold">
                          {engine.monogram}
                        </span>
                      )}
                    </span>
                    <span>{engine.name}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="px-6 py-6">
          <div className="space-y-5">
            {savedProfiles.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {t("savedProfilesTitle")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {savedProfiles.map((profile) => {
                    const isActive =
                      profile.host === host.trim().toLowerCase() &&
                      profile.key === key.trim();
                    return (
                      <span
                        key={profile.host}
                        className={`inline-flex items-center gap-1 rounded-full border pl-3 pr-1.5 py-1 text-xs font-mono transition-colors ${
                          isActive
                            ? "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-100"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectProfile(profile)}
                          className="focus-visible:outline-none"
                        >
                          {profile.host}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProfile(profile.host)}
                          aria-label={t("removeProfile", { host: profile.host })}
                          className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        >
                          <X className="size-3" aria-hidden="true" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="urls"
                  className="block text-sm font-medium text-slate-800 dark:text-slate-200"
                >
                  {t("urlsLabel")}{" "}
                  <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                    <FileUp className="size-3.5" aria-hidden="true" />
                    {t("importFile")}
                    <input
                      type="file"
                      accept=".txt,.csv,text/plain,text/csv"
                      onChange={handleFileUpload}
                      disabled={status === "loading"}
                      className="sr-only"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSitemapPanel((prev) => !prev)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
                      showSitemapPanel
                        ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-200"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Globe className="size-3.5" aria-hidden="true" />
                    {t("sitemapImport.toggle")}
                  </button>
                </div>
              </div>

              {showSitemapPanel && (
                <div className="mb-3 rounded-2xl border border-blue-200/80 bg-blue-50/40 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    {t("sitemapImport.title")}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {t("sitemapImport.description")}
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      inputMode="url"
                      value={sitemapUrl}
                      onChange={(event) => setSitemapUrl(event.target.value)}
                      placeholder={t("sitemapImport.placeholder")}
                      disabled={sitemapStatus === "loading"}
                      className="h-9 flex-1 rounded-lg border border-slate-300 bg-white px-3 font-mono text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                    <select
                      aria-label={t("sitemapImport.lastmodLabel")}
                      value={sitemapMaxAgeDays}
                      onChange={(event) =>
                        setSitemapMaxAgeDays(event.target.value)
                      }
                      disabled={sitemapStatus === "loading"}
                      className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    >
                      {LASTMOD_OPTIONS.map((opt) => (
                        <option key={opt.key} value={opt.value}>
                          {t(`sitemapImport.lastmod.${opt.key}`)}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleFetchSitemap}
                      disabled={
                        sitemapStatus === "loading" || !sitemapUrl.trim()
                      }
                      className="h-9 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      {sitemapStatus === "loading" ? (
                        <Loader2
                          className="size-3.5 animate-spin-fast"
                          aria-hidden="true"
                        />
                      ) : null}
                      {sitemapStatus === "loading"
                        ? t("sitemapImport.fetching")
                        : t("sitemapImport.fetch")}
                    </Button>
                  </div>
                  {sitemapMessage && (
                    <p
                      className={`mt-2 text-xs ${
                        sitemapStatus === "error"
                          ? "text-red-700 dark:text-red-300"
                          : "text-emerald-700 dark:text-emerald-300"
                      }`}
                      aria-live="polite"
                    >
                      {sitemapMessage}
                    </p>
                  )}
                </div>
              )}

              <textarea
                id="urls"
                name="urls"
                value={urls}
                onChange={(event) => setUrls(event.target.value)}
                placeholder={t("urlsPlaceholder")}
                required
                rows={7}
                className="w-full resize-y rounded-xl border border-slate-300 bg-white/90 px-4 py-3 font-mono text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-[border-color,box-shadow,background-color] duration-150 ease-out-strong focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200/70 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-900/40"
                disabled={status === "loading"}
              />

              {liveAnalysis.inputCount > 0 ? (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums">
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {t("liveStats.valid", {
                      count: liveAnalysis.validUrls.length,
                    })}
                  </span>
                  {liveAnalysis.duplicateCount > 0 && (
                    <span className="text-slate-500 dark:text-slate-400">
                      {t("liveStats.duplicates", {
                        count: liveAnalysis.duplicateCount,
                      })}
                    </span>
                  )}
                  {liveAnalysis.invalidInputs.length > 0 && (
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {t("liveStats.invalid", {
                        count: liveAnalysis.invalidInputs.length,
                      })}
                    </span>
                  )}
                  {liveAnalysis.hostGroups.length > 1 && (
                    <span className="font-medium text-amber-700 dark:text-amber-300">
                      {t("liveStats.multipleHosts", {
                        count: liveAnalysis.hostGroups.length,
                      })}
                    </span>
                  )}
                  {plannedBatches > 1 &&
                    liveAnalysis.hostGroups.length === 1 &&
                    liveAnalysis.invalidInputs.length === 0 && (
                      <span className="font-medium text-blue-700 dark:text-blue-300">
                        {t("liveStats.autoBatch", { batches: plannedBatches })}
                      </span>
                    )}
                </div>
              ) : (
                <p className="mt-2 text-pretty text-xs text-slate-500 dark:text-slate-400">
                  {t("urlsHelp")}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label
                    htmlFor="key"
                    className="block text-sm font-medium text-slate-800 dark:text-slate-200"
                  >
                    {t("keyLabel")}{" "}
                    <span className="text-red-600 dark:text-red-400">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const nextKey = generateIndexNowKey();
                        setKey(nextKey);
                        setPreflightStatus("idle");
                        setPreflightResult(null);
                        trackEvent({
                          name: "tool_used",
                          toolId: "indexnow",
                          action: "inline_generate_key",
                        });
                      }}
                      disabled={status === "loading"}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/15"
                    >
                      <RefreshCw className="size-3" aria-hidden="true" />
                      {t("generateKeyShortcut")}
                    </button>
                    {key.trim().length >= 8 && (
                      <button
                        type="button"
                        onClick={() => {
                          const clean = key.trim().replace(/\.txt$/i, "");
                          if (!clean) return;
                          downloadTextFile(`${clean}.txt`, clean);
                          trackEvent({
                            name: "tool_used",
                            toolId: "indexnow",
                            action: "inline_download_key",
                          });
                        }}
                        disabled={status === "loading"}
                        title={t("downloadKeyShortcut")}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Download className="size-3" aria-hidden="true" />
                        .txt
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  id="key"
                  name="key"
                  value={key}
                  onChange={(event) => setKey(event.target.value)}
                  placeholder={t("keyPlaceholder")}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 font-mono text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-[border-color,box-shadow,background-color] duration-150 ease-out-strong focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200/70 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-900/40"
                  disabled={status === "loading"}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <p className="mt-2 text-pretty text-xs text-slate-500 dark:text-slate-400">
                  {t("keyHelp")}
                </p>
              </div>

              <div>
                <label
                  htmlFor="host"
                  className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-200"
                >
                  {t("hostLabel")}
                </label>
                <input
                  type="text"
                  id="host"
                  name="host"
                  value={host}
                  onChange={(event) => setHost(event.target.value)}
                  placeholder={t("hostPlaceholder")}
                  className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 font-mono text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-[border-color,box-shadow,background-color] duration-150 ease-out-strong focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200/70 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-900/40"
                  disabled={status === "loading"}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <p className="mt-2 text-pretty text-xs text-slate-500 dark:text-slate-400">
                  {t("hostHelp")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="keyLocation"
                  className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-200"
                >
                  {t("keyLocationLabel")}
                </label>
                <input
                  type="url"
                  id="keyLocation"
                  name="keyLocation"
                  value={keyLocationInput}
                  onChange={(event) => setKeyLocationInput(event.target.value)}
                  placeholder={t("keyLocationPlaceholder")}
                  className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 font-mono text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-[border-color,box-shadow,background-color] duration-150 ease-out-strong focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200/70 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-900/40"
                  disabled={status === "loading"}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <p className="mt-2 text-pretty text-xs text-slate-500 dark:text-slate-400">
                  {t("keyLocationHelp", { host: "<host>", key: "<key>" })}
                </p>
              </div>

              <div>
                <label
                  htmlFor="endpoint"
                  className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-200"
                >
                  {t("endpointLabel")}
                </label>
                <select
                  id="endpoint"
                  name="endpoint"
                  value={endpointId}
                  onChange={(event) =>
                    setEndpointId(event.target.value as IndexNowEndpointId)
                  }
                  disabled={status === "loading"}
                  className="h-[46px] w-full rounded-xl border border-slate-300 bg-white/90 px-3.5 text-sm text-slate-900 shadow-sm transition-[border-color,box-shadow] duration-150 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200/70 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-900/40"
                >
                  {INDEXNOW_ENDPOINTS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-pretty text-xs text-slate-500 dark:text-slate-400">
                  {t("endpointHelp")}
                </p>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm transition-colors duration-150 hover:border-slate-300 has-[:checked]:border-blue-200 has-[:checked]:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700 dark:has-[:checked]:border-blue-500/30 dark:has-[:checked]:bg-blue-500/10">
              <input
                type="checkbox"
                checked={rememberProfile}
                onChange={(event) => setRememberProfile(event.target.checked)}
                className="mt-0.5 size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {t("rememberProfile")}
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {t("rememberProfileHelp")}
                </span>
              </span>
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {t("preflight.title")}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                    {t("preflight.description")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreflight}
                  disabled={preflightStatus === "loading"}
                  className="h-10 rounded-xl border-slate-200 bg-white font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  {preflightStatus === "loading" ? (
                    <Loader2
                      className="size-4 animate-spin-fast"
                      aria-hidden="true"
                    />
                  ) : (
                    <ShieldCheck className="size-4" aria-hidden="true" />
                  )}
                  {preflightStatus === "loading"
                    ? t("preflight.checking")
                    : t("preflight.check")}
                </Button>
              </div>

              {preflightStatus === "error" && (
                <p
                  className="animate-surface-in mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
                  aria-live="polite"
                >
                  {preflightError}
                </p>
              )}
              {preflightStatus === "done" && preflightResult && (
                <div className="mt-3">
                  <KeyCheckReport result={preflightResult} compact />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                disabled={status === "loading"}
                className="h-12 w-full rounded-xl bg-blue-600 font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                {status === "loading" ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin-fast" />
                    {batchProgress
                      ? t("submittingBatch", batchProgress)
                      : t("submitting")}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="size-4" />
                    {plannedBatches > 1 &&
                    liveAnalysis.hostGroups.length === 1 &&
                    liveAnalysis.invalidInputs.length === 0
                      ? t("submitBatched", { batches: plannedBatches })
                      : t("submit")}
                  </span>
                )}
              </Button>

              <div className="min-h-12" aria-live="polite">
                {status === "success" && (
                  <div className="animate-surface-in flex w-full items-start gap-2.5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 tabular-nums dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200">
                    <CheckCircleIcon className="mt-0.5 size-5 shrink-0" />
                    <div className="min-w-0 flex-1 space-y-1.5 text-left">
                      <p className="break-words text-pretty">{statusMessage}</p>
                      <a
                        href="https://www.bing.com/webmasters/indexnow"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 underline underline-offset-2 hover:text-green-900 dark:text-green-300 dark:hover:text-green-100"
                      >
                        {t("verifyInBingWebmaster")}
                        <ExternalLink className="size-3" aria-hidden="true" />
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStatus("idle")}
                      aria-label={t("dismiss")}
                      className="rounded-lg p-1 text-green-700/70 hover:bg-green-100 hover:text-green-900 dark:text-green-300/70 dark:hover:bg-green-900/40"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
                {status === "error" && (
                  <div className="animate-surface-in flex w-full items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
                    <AlertCircleIcon className="mt-0.5 size-5 shrink-0" />
                    <div className="min-w-0 flex-1 space-y-1 text-left">
                      <p className="break-words text-pretty">
                        {errorMessage}
                        {errorStatusCode !== null && (
                          <>
                            {" "}
                            <Link
                              href={`/docs/status-codes/${errorStatusCode}`}
                              className="font-semibold underline underline-offset-2"
                            >
                              {t("errors.explainCode", {
                                status: errorStatusCode,
                              })}
                            </Link>
                          </>
                        )}
                      </p>
                      {errorDetailText && (
                        <p className="break-all font-mono text-xs text-red-700/90 dark:text-red-300/90">
                          {errorDetailText}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setStatus("idle")}
                      aria-label={t("dismiss")}
                      className="rounded-lg p-1 text-red-700/70 hover:bg-red-100 hover:text-red-900 dark:text-red-300/70 dark:hover:bg-red-900/40"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
        <SubmissionHistory
          entries={history}
          onClear={() => {
            clearSubmissionHistory();
            setHistory([]);
          }}
          onReload={handleReloadHistory}
        />
      </div>
    </section>
  );
}
