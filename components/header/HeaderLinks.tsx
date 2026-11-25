"use client";

import { Link as I18nLink, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { HeaderLink } from "@/types/common";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

const HeaderLinks = () => {
  const tHeader = useTranslations("Header");
  const pathname = usePathname();

  const headerLinks: HeaderLink[] = tHeader.raw("links");

  return (
    <div className="hidden md:flex flex-row items-center gap-x-1 text-sm font-medium text-slate-600 dark:text-slate-300">
      {headerLinks.map((link) => {
        const isActive =
          pathname === link.href ||
          (link.href !== "/" && pathname.startsWith(`${link.href}/`));

        return (
          <I18nLink
            key={link.name}
            href={link.href}
            title={link.name}
            prefetch={link.target && link.target === "_blank" ? false : true}
            target={link.target || "_self"}
            rel={link.rel || undefined}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-xl px-3.5 py-2 flex items-center gap-x-1 transition-[transform,background-color,color] duration-150 ease-out-strong hover:bg-slate-900/[0.05] hover:text-slate-950 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 dark:hover:bg-white/10 dark:hover:text-white",
              isActive &&
                "bg-slate-900/[0.06] text-slate-950 dark:bg-white/10 dark:text-white"
            )}
          >
            {link.name}
            {link.target && link.target === "_blank" && (
              <span className="text-xs">
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </span>
            )}
          </I18nLink>
        );
      })}
    </div>
  );
};

export default HeaderLinks;
