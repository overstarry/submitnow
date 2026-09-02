import Faq from "@/components/home/Faq";
import Hero from "@/components/home/Hero";
import HowItWorks from "@/components/home/HowItWorks";
import ResponseCodes from "@/components/home/ResponseCodes";
import IndexNowSubmission from "@/components/indexnow/IndexNowSubmission";
import ToolsPreview from "@/components/tools/ToolsPreview";

export default function HomeComponent() {
  return (
    <section className="relative w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900" />
      <div className="pointer-events-none absolute left-1/2 top-[-140px] h-72 w-72 -translate-x-1/2 rounded-full bg-blue-200/40 blur-3xl dark:bg-blue-500/10" />
      <div className="pointer-events-none absolute right-[-120px] top-24 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl dark:bg-orange-500/10" />

      <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start">
          <Hero />
          <div className="w-full lg:justify-self-end">
            <IndexNowSubmission />
          </div>
        </div>
        <ToolsPreview />
        <HowItWorks />
        <ResponseCodes />
        <Faq />
      </div>
    </section>
  );
}
