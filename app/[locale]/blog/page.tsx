import { BlogCard } from "@/app/[locale]/blog/BlogCard";
import { Locale, LOCALES } from "@/i18n/routing";
import { getPosts } from "@/lib/getBlogs";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Params = Promise<{ locale: string }>;

type MetadataProps = {
  params: Params;
};

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Blog" });

  return constructMetadata({
    page: "Blog",
    title: t("title"),
    description: t("description"),
    locale: locale as Locale,
    path: `/blog`,
    canonicalUrl: `/blog`,
  });
}

export default async function Page({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { posts } = await getPosts(locale);

  const t = await getTranslations({ locale, namespace: "Blog" });

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-slate-50 via-white to-blue-50/70 py-12 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900/70 sm:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl dark:text-white">
            {t("title")}
          </h1>
          <p className="mt-4 text-pretty text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300">
            {t("description")}
          </p>
        </div>

        {posts.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {t("emptyState")}
          </p>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogCard key={post.slug} locale={locale} post={post} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export async function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}
