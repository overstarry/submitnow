import Link from "next/link";

import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  href?: string;
  disabled?: boolean;
}

export function MdxCard({
  href,
  className,
  children,
  disabled,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "group relative rounded-2xl border p-6 shadow-sm transition-[transform,border-color,box-shadow] duration-200 ease-out-strong",
        href && !disabled && "hover:-translate-y-0.5 hover:border-blue-300/80 hover:shadow-md active:scale-[0.985]",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
      {...props}
    >
      <div className="flex flex-col justify-between space-y-4">
        <div className="space-y-2 [&>h3]:!mt-0 [&>h4]:!mt-0 [&>p]:text-muted-foreground">
          {children}
        </div>
      </div>
      {href && (
        <Link
          href={disabled ? "#" : href}
          className="absolute inset-0"
          prefetch={false}
        >
          <span className="sr-only">View</span>
        </Link>
      )}
    </div>
  );
}
