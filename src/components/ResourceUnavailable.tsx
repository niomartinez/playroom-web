import Link from "next/link";
import { INFRASTRUCTURE_MESSAGE, type InfrastructureSurface } from "@/lib/infrastructure-access";

export default function ResourceUnavailable({ surface }: { surface: InfrastructureSurface }) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#0a0a0a] px-6 py-12 text-white">
      <div className="w-full max-w-xl">
        <img src="/logo.png" alt="Playroom Gaming" className="mb-10 h-12 w-auto object-contain" />
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Resource unavailable</h1>
        <p className="mt-5 text-base leading-relaxed text-[#d1d5db]">{INFRASTRUCTURE_MESSAGE}</p>
        <div className="mt-10 border-t border-[#404040] pt-6">
          <Link
            href={`/${surface}/login?developer=1`}
            className="inline-flex min-h-11 items-center text-sm text-[#f0b100] underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f0b100]"
          >
            Developer sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
