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
    <article className="w-full md:w-3/5 px-2 md:px-12 py-6">
      <JsonLd data={jsonLd} />
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-400"
      >
        <I18nLink
          href="/"
          className="rounded-lg px-1.5 py-0.5 transition-colors hover:text-slate-950 dark:hover:text-white"
        >
          {tBlog("breadcrumbHome")}
        </I18nLink>
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <I18nLink
          href="/blog"
          className="rounded-lg px-1.5 py-0.5 transition-colors hover:text-slate-950 dark:hover:text-white"
        >
          {tBlog("title")}
        </I18nLink>
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <span className="px-1.5 py-0.5 font-medium text-slate-700 dark:text-slate-200">
          {post.title}
        </span>
      </nav>

      <h1 className="break-words text-4xl font-bold mt-4 mb-3">{post.title}</h1>
      {formattedDate && publishedDate && (
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          <time dateTime={publishedDate.toISOString()}>{formattedDate}</time>
        </p>
      )}
      {post.image && (
        <div className="relative mb-4 overflow-hidden rounded-sm">
          <Image
            src={post.image}
            alt={post.title}
            width={1200}
            height={630}
            priority
            sizes="(max-width: 768px) 100vw, 60vw"
            className="w-full h-auto rounded-sm"
          />
        </div>
      )}
      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-gray-200 dark:bg-[#24272E] flex px-2.5 py-1 text-sm font-medium text-gray-600 dark:text-[#9CA3AF]"
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
