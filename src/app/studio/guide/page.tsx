import type { Metadata } from "next";
import GuideContent from "./GuideContent";

export const metadata: Metadata = {
  title: "Studio Guide — Playroom Gaming",
};

export default function StudioGuidePage() {
  return <GuideContent />;
}
