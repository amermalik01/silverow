// app/components/shared/AttachmentsTab.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { UploadDropzone } from "@/lib/uploadthing";

export type Attachment = {
  id?: string;
  module: string;
  record_id: string;
  file_name?: string;
  file_path?: string;
  mime_type?: string;
  created_at?: string;
};

type Props = {
  module: string;
  recordId: string;
  readonly?: boolean;
};

export default function AttachmentsTab({
  module,
  recordId,
  readonly = false,
}: Props) {
  const [files, setFiles] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/attachments?module=${module}&record_id=${recordId}`,
      );
      const data = await res.json();
      setFiles(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [module, recordId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      const res = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
      if (res.ok) {
        setFiles((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error("Delete operation failed:", err);
    } finally {
      setDeletingId(null);
    }
  };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {!readonly && (
        <div className="lg:col-span-1 border border-dashed border-slate-300 dark:border-slate-800 p-2 rounded-xl text-center bg-slate-50/50 dark:bg-slate-900/50 hover:border-blue-500 transition-all">
          <UploadDropzone
            endpoint="attachmentUploader"
            input={{ module, recordId }}
            onClientUploadComplete={() => {
              loadFiles();
            }}
            onUploadError={(error: Error) => {
              console.error(`Upload error: ${error.message}`);
            }}
            appearance={{
              container:
                "border-none bg-transparent py-6 cursor-pointer focus:outline-none",
              label:
                "text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-500",
              allowedContent: "text-[11px] text-slate-400 mt-1",
              button:
                "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition-all ut-uploading:bg-slate-400",
            }}
            content={{
              label: "Click or Drag Documents Here",
              allowedContent: "PDF, Excel sheets, images up to 16MB",
            }}
          />
        </div>
      )}

      <div className="lg:col-span-2 space-y-2">
        {loading ? (
          <p className="text-xs text-slate-400 text-center py-6 animate-pulse">
            Scanning file directories...
          </p>
        ) : files.length === 0 ? (
          <div className="text-center py-12 border rounded-xl border-slate-100 dark:border-slate-800 text-slate-400 text-xs">
            No active asset attachments verified for this record link.
          </div>
        ) : (
          files.map((item) => (
            <div
              key={item.id}
              className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-3.5 rounded-xl flex justify-between items-center transition-all hover:bg-slate-50/50 dark:hover:bg-slate-900/40"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg text-xs font-mono font-bold text-slate-500 capitalize tracking-tight shrink-0">
                  {item.mime_type?.split("/")[1]?.toUpperCase() || "DOC"}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                    {item.file_name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {item.mime_type}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {item.file_path && (
                  <a
                    href={item.file_path}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-3 py-1.5 rounded-lg transition-all"
                  >
                    Download
                  </a>
                )}
                {!readonly && item.id && (
                  <button
                    onClick={() => handleDelete(item.id!)}
                    disabled={deletingId === item.id}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/50 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
                  >
                    {deletingId === item.id ? "Deleting..." : "Delete"}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
/* const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("module", module);
      formData.append("record_id", recordId);

      const res = await fetch("/api/attachments", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload process network rejection.");
      await loadFiles();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }; */

/*  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {!readonly && (
        <div className="lg:col-span-1 border border-dashed border-slate-300 dark:border-slate-800 p-6 rounded-xl text-center bg-slate-50/50 dark:bg-slate-900/50 group hover:border-blue-500 transition-all relative">
          <input
            type="file"
            onChange={handleUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />
          <div className="space-y-2 pointer-events-none">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {uploading
                ? "Transferring file streams..."
                : "Click or Drag Vendor Ledger Dossier"}
            </div>
            <p className="text-[11px] text-slate-400">
              PDF, Excel sheets, images up to 10MB
            </p>
          </div>
        </div>
      )}

      <div className="lg:col-span-2 space-y-2">
        {loading ? (
          <p className="text-xs text-slate-400 text-center py-6 animate-pulse">
            Scanning file directories...
          </p>
        ) : files.length === 0 ? (
          <div className="text-center py-12 border rounded-xl border-slate-100 dark:border-slate-800 text-slate-400 text-xs">
            No active asset attachments verified for this record link.
          </div>
        ) : (
          files.map((item) => (
            <div
              key={item.id}
              className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-3.5 rounded-xl flex justify-between items-center transition-all hover:bg-slate-50/50 dark:hover:bg-slate-900/40"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg text-xs font-mono font-bold text-slate-500 capitalize tracking-tight shrink-0">
                  {item.mime_type?.split("/")[1] || "DOC"}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                    {item.file_name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {item.mime_type}
                  </p>
                </div>
              </div>

              {item.file_path && (
                <a
                  href={item.file_path}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-3 py-1.5 rounded-lg transition-all shrink-0"
                >
                  Download Asset
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  ); */
