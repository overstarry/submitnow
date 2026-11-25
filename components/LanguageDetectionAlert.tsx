"use client";

import { Button } from "@/components/ui/button";
import {
  Link as I18nLink,
  LOCALE_NAMES,
  routing,
  usePathname,
} from "@/i18n/routing";
import { LANGUAGE_DETECTION_MESSAGES } from "@/lib/language-detection-messages";
import { cn } from "@/lib/utils";
import { useLocaleStore } from "@/stores/localeStore";
import { ArrowRight, Globe, X } from "lucide-react";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useState } from "react";

export function LanguageDetectionAlert() {
  const [countdown, setCountdown] = useState(10); // countdown 10s and dismiss
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const locale = useLocale();
  const pathname = usePathname();
  const [detectedLocale, setDetectedLocale] = useState<string | null>(null);
  const {
    showLanguageAlert,
    setShowLanguageAlert,
    dismissLanguageAlert,
    getLangAlertDismissed,
  } = useLocaleStore();

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      dismissLanguageAlert();
    }, 200);
  }, [dismissLanguageAlert]);

  const handleSwitchLanguage = useCallback(() => {
    dismissLanguageAlert();
  }, [dismissLanguageAlert]);

  useEffect(() => {
    const detectedLang = navigator.language; // Get full language code, e.g., zh_HK
    const storedDismiss = getLangAlertDismissed();

    if (!storedDismiss) {
      let supportedLang = routing.locales.find((l) => l === detectedLang);

      if (!supportedLang) {
        const mainLang = detectedLang.split("-")[0];
        supportedLang = routing.locales.find((l) => l.startsWith(mainLang));
      }

      if (supportedLang && supportedLang !== locale) {
        setTimeout(() => {
          setDetectedLocale(supportedLang);
          setShowLanguageAlert(true);
        }, 0);
        setTimeout(() => setIsVisible(true), 50);
      }
    }
  }, [locale, getLangAlertDismissed, setShowLanguageAlert]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPaused(document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (showLanguageAlert && countdown > 0 && !isPaused) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showLanguageAlert, countdown, isPaused]);

  useEffect(() => {
    if (countdown === 0 && showLanguageAlert) {
      const timeoutId = setTimeout(handleDismiss, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [countdown, showLanguageAlert, handleDismiss]);

  if (!showLanguageAlert || !detectedLocale) return null;

  const alertMessages =
    LANGUAGE_DETECTION_MESSAGES[detectedLocale] ??
    LANGUAGE_DETECTION_MESSAGES.en;

  return (
    <div
      className={cn(
        "fixed top-20 right-4 z-50 max-w-sm w-[calc(100%-2rem)] sm:w-96",
        "origin-top-right transition-[transform,opacity] ease-out-strong",
        isVisible
          ? "[transition-duration:240ms] translate-y-0 scale-100 opacity-100"
          : "[transition-duration:180ms] translate-y-2 scale-[0.97] opacity-0 pointer-events-none"
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      role="banner"
      aria-live="polite"
      aria-label="Language detection alert"
    >
      <div className="bg-background/95 backdrop-blur-md border border-border/80 rounded-2xl shadow-lg p-4 relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-7 w-7 opacity-60 hover:opacity-100"
          onClick={handleDismiss}
          aria-label="Dismiss language suggestion"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="pr-8">
          <div className="flex items-center gap-2 mb-2.5">
            <Globe className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-sm text-foreground">
              {alertMessages.title}
            </h3>
          </div>

          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            {alertMessages.description}
          </p>

          <div className="flex items-center justify-between">
            <Button asChild onClick={handleSwitchLanguage}>
              <I18nLink
                href={pathname || "/"}
                title={`${alertMessages.switchTo} ${LOCALE_NAMES[detectedLocale]}`}
                locale={detectedLocale as any}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "text-sm font-medium group"
                )}
                aria-label={`${alertMessages.switchTo} ${LOCALE_NAMES[detectedLocale]}`}
              >
                <span>
                  {alertMessages.switchTo} {LOCALE_NAMES[detectedLocale]}
                </span>
                <ArrowRight className="h-3 w-3 transition-transform duration-150 ease-out-strong group-hover:translate-x-0.5" />
              </I18nLink>
            </Button>

            <span className="text-xs tabular-nums text-muted-foreground">
              {countdown}s
            </span>
          </div>
        </div>

        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/10 to-transparent pointer-events-none opacity-50" />
      </div>
    </div>
  );
}
