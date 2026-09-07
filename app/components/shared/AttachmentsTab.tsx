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
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);

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

  // Open confirmation modal
  const handleDeleteClick = (attachment: Attachment) => {
    setDeleteTarget(attachment);
  };

  // Actually delete the attachment
  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) {
      return;
    }

    const id = deleteTarget.id;

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

      // Close modal after successful deletion
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete operation failed:", err);
    } finally {
      setDeletingId(null);
    }
  };

  // Close confirmation modal
  const handleCancelDelete = () => {
    if (deletingId) {
      return;
    }

    setDeleteTarget(null);
  };

  /* const handleDelete = async (id: string) => {
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
  }; */

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
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {!readonly && (
          <div className=" lg:col-span-1 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-1 text-center transition-all hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/10 ">
            {" "}
            <UploadDropzone
              className="custom-attachment"
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
                container: "w-full max-h-[150px] border-0 bg-transparent ",
                label:
                  "text-sm font-semibold text-slate-700 dark:text-slate-200",
                uploadIcon: "h-8 w-8",
                allowedContent:
                  "text-[11px] text-slate-400 dark:text-slate-500",
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
                        onClick={() => handleDeleteClick(item)}
                        disabled={deletingId === item.id}
                        className="inline-flex items-center text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950 px-2 py-1 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingId === item.id ? "Deleting..." : "Delete"}
                      </button>
                    )}
                    {/* {!readonly && item.id && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id!)}
                      disabled={deletingId === item.id}
                      className=" inline-flex items-center text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950 px-2 py-1 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed "
                    >
                      {" "}
                      {deletingId === item.id ? "Deleting..." : "Delete"}{" "}
                    </button>
                  )}{" "} */}
                  </div>{" "}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
          onClick={handleCancelDelete}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-attachment-title"
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
                  <svg
                    className="h-5 w-5 text-red-600 dark:text-red-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </div>

                <div className="min-w-0">
                  <h2
                    id="delete-attachment-title"
                    className="text-base font-semibold text-slate-900 dark:text-slate-100"
                  >
                    Delete attachment?
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Are you sure you want to delete this attachment? This action
                    cannot be undone.
                  </p>
                </div>
              </div>

              {/* File being deleted */}
              {deleteTarget.file_name && (
                <div className="mt-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2.5">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                    {deleteTarget.file_name}
                  </p>

                  {deleteTarget.mime_type && (
                    <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      {deleteTarget.mime_type}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 px-6 py-4 rounded-b-2xl">
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={!!deletingId}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={!!deletingId}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingId ? (
                  <>
                    <svg
                      className="h-3.5 w-3.5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete Attachment"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
