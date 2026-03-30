// app/[slug]/setup/system/sequences/page.tsx

import SequenceList from "@/app/components/setup/system/SequenceList";

export default function SequencePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Setup / System / Sequences
      </h1>

      <SequenceList />
    </div>
  );
}