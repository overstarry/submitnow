import { Callout } from "@/components/mdx/Callout";
import MDXComponents from "@/components/mdx/MDXComponents";
import JsonLd from "@/components/seo/JsonLd";
import { Locale, LOCALES } from "@/i18n/routing";
import { getPosts } from "@/lib/getBlogs";
import { constructMetadata } from "@/lib/metadata";
import {
  articleSchema,
  breadcrumbSchema,
  buildGraph,
  organizationSchema,
} from "@/lib/structured-data";
import { BlogPost } from "@/types/blog";
import { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote-client/rsc";
import { getTranslations } from "next-intl/server";
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
  let { posts }: { posts: BlogPost[] } = await getPosts(locale);
  const post = posts.find((post) => post.slug === "/" + slug);

  if (!post) {
    return constructMetadata({
      title: "404",
      description: "Page not found",
      noIndex: true,
      locale: locale as Locale,
      path: `/blog/${slug}`,
      canonicalUrl: `/blog/${slug}`,
    });
  }

  return constructMetadata({
    page: "blog",
    title: post.title,
    description: post.description,
    images: post.image ? [post.image] : [],
    locale: locale as Locale,
    path: `/blog/${slug}`,
    canonicalUrl: `/blog/${slug}`,
  });
}

export default async function BlogPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  let { posts }: { posts: BlogPost[] } = await getPosts(locale);

  const post = posts.find((item) => item.slug === "/" + slug);

  if (!post) {
    return notFound();
  }

  const tBlog = await getTranslations({ locale, namespace: "Blog" });

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

  return (
    <div className="w-full md:w-3/5 px-2 md:px-12">
      <JsonLd data={jsonLd} />
      <h1 className="break-words text-4xl font-bold mt-6 mb-4">{post.title}</h1>
      {post.image && (
        <img
          src={post.image}
          alt={post.title}
          width={1200}
          height={630}
          className="rounded-sm w-full h-auto"
        />
      )}
      {post.tags && post.tags.split(",").length ? (
        <div className="flex flex-wrap gap-2">
          {post.tags.split(",").map((tag) => {
            return (
              <div
                key={tag}
                className={`rounded-md bg-gray-200 hover:!no-underline dark:bg-[#24272E] flex px-2.5 py-1.5 text-sm font-medium transition-colors hover:text-black hover:dark:bg-[#15AFD04C] hover:dark:text-[#82E9FF] text-gray-500 dark:text-[#7F818C] outline-none focus-visible:ring transition`}
              >
                {tag.trim()}
              </div>
            );
          })}
        </div>
      ) : (
        <></>
      )}
      {post.description && <Callout>{post.description}</Callout>}
      <MDXRemote
        source={post?.content || ""}
        components={MDXComponents}
        options={mdxOptions}
      />
    </div>
  );
}

export async function generateStaticParams() {
  let posts = (await getPosts()).posts;

  // Filter out posts without a slug
  posts = posts.filter((post) => post.slug);

  return LOCALES.flatMap((locale) =>
    posts.map((post) => {
      const slugPart = post.slug.replace(/^\//, "").replace(/^blog\//, "");

      return {
        locale,
        slug: slugPart,
      };
    })
  );
}
