// app/components/shared/AttachmentsTab.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { UploadDropzone } from "@/lib/uploadthing";

export type Attachment = {
  id?: string;

  module: string;
  record_id: string;

  file_name?: string;
  file_key?: string;
  file_path?: string;

  mime_type?: string;
  file_size?: number;

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

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        module,
        record_id: recordId,
      });

      const res = await fetch(`/api/attachments?${params.toString()}`);

      if (!res.ok) {
        throw new Error("Failed to load attachments");
      }

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
    const confirmed = window.confirm(
      "Are you sure you want to delete this attachment?",
    );
    if (!confirmed) {
      return;
    }
    try {
      setDeletingId(id);

      const res = await fetch(`/api/attachments/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete attachment");
      }

      setFiles((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Delete operation failed:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const isPreviewable = (mimeType?: string) => {
    if (!mimeType) return false;

    return mimeType === "application/pdf" || mimeType.startsWith("image/");
  };

  const getFileTypeLabel = (fileName?: string, mimeType?: string) => {
    if (mimeType === "application/pdf") {
      return "PDF";
    }

    if (mimeType?.startsWith("image/")) {
      return "IMAGE";
    }

    if (fileName?.includes(".")) {
      return fileName.split(".").pop()?.toUpperCase() || "DOC";
    }

    return "DOC";
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) {
      return "";
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIconColor = (mimeType?: string) => {
    if (mimeType === "application/pdf") {
      return "text-red-600 bg-red-50 dark:bg-red-950/40";
    }
    if (mimeType?.startsWith("image/")) {
      return "text-purple-600 bg-purple-50 dark:bg-purple-950/40";
    }
    if (mimeType?.includes("spreadsheet") || mimeType?.includes("excel")) {
      return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40";
    }
    if (mimeType?.includes("word") || mimeType?.includes("document")) {
      return "text-blue-600 bg-blue-50 dark:bg-blue-950/40";
    }
    return "text-slate-500 bg-slate-100 dark:bg-slate-900";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {!readonly && (
        <div className=" lg:col-span-1 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-1 text-center transition-all hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/10 ">
          {" "}
          <UploadDropzone
            endpoint="attachmentUploader"
            input={{ module, recordId }}
            config={{ mode: "auto" }}
            onUploadBegin={() => {
              setUploading(true);
              setUploadComplete(false);
            }}
            onClientUploadComplete={() => {
              setUploading(false);
              setUploadComplete(true);
              loadFiles();
              window.setTimeout(() => {
                setUploadComplete(false);
              }, 2500);
            }}
            onUploadError={(error: Error) => {
              setUploading(false);
              setUploadComplete(false);
              console.error(`Upload error: ${error.message}`);
            }}
            appearance={{
              container: "w-full min-h-[90px] border-0 bg-transparent",
              label: "text-sm font-semibold text-slate-700 dark:text-slate-200",
              allowedContent: "text-[11px] text-slate-400 dark:text-slate-500",
              button: [
                "w-full",
                "h-9",
                "w-24",
                "rounded-lg",
                "text-xs",
                "font-semibold",
                "text-white",
                "shadow-sm",
                "transition-all",
                "duration-200",
                // Normal state
                !uploading && !uploadComplete
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "",
                // Uploading state
                uploading ? "bg-slate-400 cursor-not-allowed" : "",
                // Completed state
                uploadComplete ? "bg-emerald-500 hover:bg-emerald-600" : "",
              ]
                .filter(Boolean)
                .join(" "),
            }}
            content={{
              label: uploading
                ? "Uploading..."
                : uploadComplete
                  ? "✓ Upload Complete"
                  : "Click or Drag Documents Here",
              allowedContent: "PDF, Excel sheets, images up to 4MB",
            }}
          />{" "}
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
          files.map((item) => {
            const previewable = isPreviewable(item.mime_type);
            return (
              <div
                key={item.id}
                className=" border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 rounded-xl flex justify-between items-center gap-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-900/50 "
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={` w-10 h-10 rounded-lg flex items-center justify-center text-[9px] font-bold tracking-tight shrink-0 ${getFileIconColor(item.mime_type)} `}
                  >
                    {" "}
                    {getFileTypeLabel(item.file_name, item.mime_type)}
                  </div>{" "}
                  <div className="min-w-0">
                    {" "}
                    <p
                      className=" text-xs font-medium text-slate-800 dark:text-slate-200 truncate "
                      title={item.file_name}
                    >
                      {" "}
                      {item.file_name}{" "}
                    </p>{" "}
                    <p className=" text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5 ">
                      {" "}
                      {item.mime_type || "Document"}{" "}
                      {item.file_size
                        ? ` • ${formatFileSize(item.file_size)}`
                        : ""}{" "}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
                {/* Actions */}{" "}
                <div className="flex items-center gap-2 shrink-0">
                  {" "}
                  {item.file_path && (
                    <a
                      href={item.file_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className=" inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-950 px-3 py-1.5 rounded-lg transition-all "
                    >
                      {" "}
                      {previewable ? "View" : "Open"}{" "}
                    </a>
                  )}{" "}
                  {!readonly && item.id && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id!)}
                      disabled={deletingId === item.id}
                      className=" inline-flex items-center text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950 px-2 py-1 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed "
                    >
                      {" "}
                      {deletingId === item.id ? "Deleting..." : "Delete"}{" "}
                    </button>
                  )}{" "}
                </div>{" "}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* 

{!readonly && (
         <div className=" lg:col-span-1 border border-dashed border-slate-300 dark:border-slate-800 p-1 rounded-xl text-center bg-slate-50/50 dark:bg-slate-900/50 hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/10 transition-all ">
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
              container: "w-full min-h-[40px] border-0 bg-transparent ",
              label: "text-sm font-semibold text-slate-700 dark:text-slate-200",
              allowedContent: "text-[11px] text-slate-400 dark:text-slate-500",
              button: [
                "bg-blue-600",
                "hover:bg-blue-700",
                "text-white",
                "text-xs",
                "font-semibold",
                // "px-4",
                // "py-0",
                "rounded-lg",
                "shadow-sm",
                "transition-all",
                "duration-200",
                "ut-uploading:bg-slate-400",
                "ut-uploading:cursor-not-allowed",
              ].join(" "),
            }}
            content={{
              label: "Click or Drag Documents Here",
              allowedContent: "PDF, Excel sheets, images up to 4MB",
            }}
          />
        </div>
      )}
*/
/* files.map((item) => (
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
                    rel="noopener noreferrer"
                    className="
                      inline-flex
                      items-center
                      gap-1.5
                      text-xs
                      font-semibold
                      text-blue-600
                      hover:text-blue-700
                      dark:text-blue-400
                      bg-blue-50
                      hover:bg-blue-100
                      dark:bg-blue-950/50
                      dark:hover:bg-blue-950
                      px-3
                      py-1.5
                      rounded-lg
                      transition-all
                    "
                  >
                    {isPreviewable(item.mime_type) ? "View" : "Open"}
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
        )} */
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
