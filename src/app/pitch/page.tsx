import PitchDeck from "./PitchDeck";

/**
 * Operator pitch deck. Hidden + noindex (see layout.tsx). The operator
 * name for the watermark comes from `?o=OperatorName` for now; when the
 * per-operator access gate is built, read it from the verified session
 * instead and drop the query param.
 */
export default async function PitchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const raw = sp.o;
  const operator =
    typeof raw === "string" && raw.trim() ? raw.trim().slice(0, 60) : null;

  return <PitchDeck operator={operator} />;
}
