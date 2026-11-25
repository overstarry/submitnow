import { Callout } from "@/components/mdx/Callout";
import MDXComponents from "@/components/mdx/MDXComponents";
import JsonLd from "@/components/seo/JsonLd";
import { Link as I18nLink, Locale, LOCALES } from "@/i18n/routing";
import { getPosts } from "@/lib/getBlogs";
import { constructMetadata } from "@/lib/metadata";
import {
  articleSchema,
  breadcrumbSchema,
  buildGraph,
  organizationSchema,
} from "@/lib/structured-data";
import { BlogPost } from "@/types/blog";
import { ChevronRight } from "lucide-react";
import { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote-client/rsc";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";
import remarkGfm from "remark-gfm";

const mdxOptions = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
  },
};

type Params = Promise<{
  locale: string;
  slug: string;
}>;

type MetadataProps = {
  params: Params;
};

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const { posts }: { posts: BlogPost[] } = await getPosts(locale);
  const post = posts.find((item) => item.slug === "/" + slug);

  if (!post) {
    return constructMetadata({
      page: "Blog",
      title: "404",
      description: "Page not found",
      noIndex: true,
      locale: locale as Locale,
    });
  }

  const tags = post.tags
    ? post.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];

  return constructMetadata({
    page: "Blog",
    title: post.title,
    description: post.description,
    keywords: tags,
    images: post.image ? [post.image] : [],
    locale: locale as Locale,
    path: `/blog/${slug}`,
    canonicalUrl: `/blog/${slug}`,
    type: "article",
    publishedTime: post.date ? new Date(post.date).toISOString() : undefined,
    modifiedTime: post.metadata?.updatedAt
      ? new Date(post.metadata.updatedAt).toISOString()
      : undefined,
    tags,
  });
}

export default async function BlogPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const { posts }: { posts: BlogPost[] } = await getPosts(locale);

  const post = posts.find((item) => item.slug === "/" + slug);

  if (!post) {
    return notFound();
  }

  const tBlog = await getTranslations({ locale, namespace: "Blog" });
  const publishedDate = post.date ? new Date(post.date) : null;
  const formattedDate =
    publishedDate && !Number.isNaN(publishedDate.getTime())
      ? new Intl.DateTimeFormat(locale, {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "UTC",
        }).format(publishedDate)
      : null;

  const jsonLd = buildGraph([
    organizationSchema(),
    articleSchema({
      locale,
      path: `/blog${post.slug}`,
      title: post.title,
      description: post.description,
      datePublished: post.date ? new Date(post.date).toISOString() : undefined,
      dateModified: post.metadata?.updatedAt
        ? new Date(post.metadata.updatedAt).toISOString()
        : undefined,
      image: post.image || undefined,
    }),
    breadcrumbSchema(locale, [
      { name: tBlog("breadcrumbHome"), path: "/" },
      { name: tBlog("title"), path: "/blog" },
      { name: post.title, path: `/blog${post.slug}` },
    ]),
  ]);

  const tags = post.tags
    ? post.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <JsonLd data={jsonLd} />
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-400"
      >
        <I18nLink
          href="/"
          className="rounded-lg px-1.5 py-0.5 transition-colors duration-150 hover:text-slate-950 dark:hover:text-white"
        >
          {tBlog("breadcrumbHome")}
        </I18nLink>
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <I18nLink
          href="/blog"
          className="rounded-lg px-1.5 py-0.5 transition-colors duration-150 hover:text-slate-950 dark:hover:text-white"
        >
          {tBlog("title")}
        </I18nLink>
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <span className="px-1.5 py-0.5 font-medium text-slate-700 dark:text-slate-200">
          {post.title}
        </span>
      </nav>

      <h1 className="mt-6 break-words text-balance font-heading text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
        {post.title}
      </h1>
      {formattedDate && publishedDate && (
        <p className="mt-3 mb-6 text-sm tabular-nums text-slate-500 dark:text-slate-400">
          <time dateTime={publishedDate.toISOString()}>{formattedDate}</time>
        </p>
      )}
      {post.image && (
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm dark:border-slate-800">
          <Image
            src={post.image}
            alt={post.title}
            width={1200}
            height={630}
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="w-full h-auto"
          />
        </div>
      )}
      {tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-lg border border-slate-200/80 bg-slate-100/80 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {post.description && <Callout>{post.description}</Callout>}
      <MDXRemote
        source={post?.content || ""}
        components={MDXComponents}
        options={mdxOptions}
      />
    </article>
  );
}

export async function generateStaticParams() {
  const entries = await Promise.all(
    LOCALES.map(async (locale) => {
      const { posts } = await getPosts(locale);
      return posts
        .filter((post) => post.slug)
        .map((post) => ({
          locale,
          slug: post.slug.replace(/^\//, "").replace(/^blog\//, ""),
        }));
    })
  );

  return entries.flat();
}
