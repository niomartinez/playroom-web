import PlayerLayout from "@/components/player/PlayerLayout";
import DemoWrapper from "./DemoWrapper";

export default function DemoPage() {
  return (
    <DemoWrapper>
      <PlayerLayout footerText="DEMO MODE — Play responsibly." />
    </DemoWrapper>
  );
}
