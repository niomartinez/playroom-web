import { Suspense } from "react";
import PlayerLayout from "@/components/player/PlayerLayout";
import DemoWrapper from "./DemoWrapper";

export default function DemoPage() {
  return (
    // DemoWrapper reads the ?lang= param via useSearchParams, which requires a
    // Suspense boundary during prerender.
    <Suspense fallback={null}>
      <DemoWrapper>
        <PlayerLayout />
      </DemoWrapper>
    </Suspense>
  );
}
