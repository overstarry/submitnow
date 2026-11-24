import { Link as I18nLink } from "@/i18n/routing";
import { BlogPost } from "@/types/blog";
import Image from "next/image";

export function BlogCard({ post, locale }: { post: BlogPost; locale: string }) {
  const dateValue = new Date(post.date);
  const formattedDate = Number.isNaN(dateValue.getTime())
    ? String(post.date)
    : new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }).format(dateValue);

  return (
    <I18nLink
      href={`/blog${post.slug}`}
      prefetch={false}
      className="bg-transparent rounded-lg hover:underline"
    >
      <div className="relative rounded shadow-md  pt-[56.25%]">
        <Image
          src={post.image || "/placeholder.svg"}
          alt={post.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover shadow-sm w-full rounded hover:shadow-lg transition-shadow duration-200"
        />
      </div>
      <div className="py-3 flex-1 flex flex-col">
        <h2 className="text-lg font-500 line-clamp-2 flex-grow">
          {post.title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
          {formattedDate}
        </p>
      </div>
    </I18nLink>
  );
}
