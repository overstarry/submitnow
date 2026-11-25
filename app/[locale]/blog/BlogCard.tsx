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

  const tags = post.tags
    ? post.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];

  return (
    <I18nLink
      href={`/blog${post.slug}`}
      prefetch={false}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/85 shadow-sm transition-[transform,border-color,box-shadow] duration-200 ease-out-strong hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-blue-500/50"
    >
      {post.image ? (
        <div className="relative overflow-hidden bg-slate-100 pt-[56.25%] dark:bg-slate-900">
          <Image
            src={post.image}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover w-full transition-transform duration-300 ease-out-strong group-hover:scale-[1.03]"
          />
        </div>
      ) : (
        <div className="relative flex aspect-[16/9] flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-5 text-white">
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-blue-100"
              >
                #{tag}
              </span>
            ))}
          </div>
          <p className="line-clamp-3 font-heading text-base font-semibold leading-snug text-white/95">
            {post.title}
          </p>
        </div>
      )}
      <div className="p-5 flex-1 flex flex-col">
        <h2 className="font-heading text-lg font-semibold leading-snug text-slate-950 line-clamp-2 transition-colors duration-150 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-200">
          {post.title}
        </h2>
        {post.description && (
          <p className="mt-2 line-clamp-2 flex-grow text-sm leading-6 text-slate-600 dark:text-slate-300">
            {post.description}
          </p>
        )}
        <p className="text-slate-500 dark:text-slate-400 text-xs tabular-nums mt-3">
          {formattedDate}
        </p>
      </div>
    </I18nLink>
  );
}
