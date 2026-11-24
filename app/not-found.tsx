import Link from "next/link";

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900 antialiased flex items-center justify-center px-6">
        <main className="max-w-lg text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
            404
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Page not found
          </h1>
          <p className="mt-4 text-base text-slate-600">
            The requested URL does not exist on submitnow.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Back to Home
            </Link>
            <Link
              href="/tools"
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              IndexNow Tools
            </Link>
            <Link
              href="/docs"
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Documentation
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
