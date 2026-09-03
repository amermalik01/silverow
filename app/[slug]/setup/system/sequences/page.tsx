// app/[slug]/setup/system/sequences/page.tsx

import SequenceList from "@/app/components/setup/system/SequenceList";

export default function SequencePage() {
  return (
    <div className="space-y-6 ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Setup / System / Sequences</h1>
      </div>

      <SequenceList />
    </div>
  );
}
