// app/components/crm/prospects/tabs/ProspectAttachmentsTab.tsx

"use client";

export default function ProspectAttachmentsTab() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-800">
          ↥
        </div>
        <h3 className="mt-3 font-semibold text-slate-900">Attachments</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          Attachments will be available here once the prospect document storage
          API is connected.
        </p>
        <p className="mt-3 text-xs text-slate-400">
          Supported upload behaviour depends on your configured document storage.
        </p>
      </div>
    </section>
  );
}