import type { Metadata } from "next";
import GuideContent from "./GuideContent";

export const metadata: Metadata = {
  title: "Studio Guide — Play Room Gaming",
};

export default function StudioGuidePage() {
  return <GuideContent />;
}
