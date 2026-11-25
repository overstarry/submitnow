"use client";

import LocaleSwitcher from "@/components/LocaleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link as I18nLink, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { HeaderLink } from "@/types/common";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

export default function MobileMenu() {
  const t = useTranslations("Home");
  const tHeader = useTranslations("Header");
  const pathname = usePathname();

  const headerLinks: HeaderLink[] = tHeader.raw("links");

  return (
    <div className="flex items-center gap-1.5 md:hidden">
      <LocaleSwitcher />
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>
            <I18nLink
              href="/"
              title={t("title")}
              prefetch={true}
              className="flex items-center space-x-2 font-bold"
            >
              <Image
                alt={t("title")}
                src="/logo.png"
                className="w-6 h-6 rounded"
                width={32}
                height={32}
                sizes="24px"
              />
              <span className="font-heading text-slate-900 dark:text-slate-100">
                {t("title")}
              </span>
            </I18nLink>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {headerLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(`${link.href}/`));

              return (
                <DropdownMenuItem key={link.name} asChild>
                  <I18nLink
                    href={link.href}
                    title={link.name}
                    prefetch={
                      link.target && link.target === "_blank" ? false : true
                    }
                    target={link.target || "_self"}
                    rel={link.rel || undefined}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "w-full cursor-pointer",
                      isActive && "bg-accent font-medium text-accent-foreground"
                    )}
                  >
                    {link.name}
                  </I18nLink>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
