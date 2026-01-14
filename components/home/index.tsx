import Hero from "@/components/home/Hero";
import IndexNowSubmission from "@/components/indexnow/IndexNowSubmission";

export default function HomeComponent() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start">
        <Hero />
        <div className="w-full lg:justify-self-end lg:max-w-md">
          <IndexNowSubmission />
        </div>
      </div>
    </main>
  );
}
