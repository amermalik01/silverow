// app/components/sales/crm/tabs/AttachmentsTab.tsx
"use client";

export default function AttachmentsTab({
  module,
  recordId,
}: {
  module: string;
  recordId: string | undefined;
}) {
  return (
    <div className="space-y-4">
      <input type="file" />

      <div className="border p-4 rounded">
        <p className="text-gray-500">Uploaded files will appear here</p>
      </div>
    </div>
  );
}
