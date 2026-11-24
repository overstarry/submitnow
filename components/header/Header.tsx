import HeaderLinks from "@/components/header/HeaderLinks";
import MobileMenu from "@/components/header/MobileMenu";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { siteConfig } from "@/config/site";
import { Link as I18nLink } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import Image from "next/image";

const Header = () => {
  const t = useTranslations("Home");

  return (
    <header className="sticky top-4 z-50 w-full px-4">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/60">
        <div className="flex items-center space-x-6 md:space-x-6 lg:space-x-12">
          <I18nLink
            href="/"
            prefetch={false}
            className="flex items-center space-x-1 font-bold"
          >
            <Image
              alt={siteConfig.name}
              src="/logo.png"
              className="w-6 h-6 rounded"
              width={32}
              height={32}
              sizes="24px"
            />
            <span className="font-heading text-gray-800 dark:text-gray-200">
              {t("title")}
            </span>
          </I18nLink>
          <HeaderLinks />
        </div>

        <div className="flex flex-1 items-center justify-end gap-x-2 md:gap-x-4 lg:gap-x-6">
          {/* PC */}
          <div className="hidden md:flex items-center gap-x-4">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>

          {/* Mobile */}
          <MobileMenu />
        </div>
      </nav>
    </header>
  );
};

export default Header;
