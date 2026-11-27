// app/components/shared/AttachmentsTab.tsx

"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { UploadDropzone } from "@/lib/uploadthing";
import { Icon } from "@iconify/react";
import AttachmentFolderManager from "./AttachmentFolderManager";

export type AttachmentFolder =
  | "Contracts"
  | "Pricing & Rebates"
  | "Finance"
  | "General"
  | string;

export type Attachment = {
  id?: string;
  module: string;
  record_id: string;
  folder?: AttachmentFolder | null;
  file_name?: string;
  file_key?: string;
  file_path?: string;
  mime_type?: string;
  file_size?: number;
  created_at?: string;
  created_by?: string | null;
  created_by_name?: string | null;
};

type Props = {
  module: string;
  recordId: string;
  readonly?: boolean;
  onRequestEdit?: () => void;
};

/** Modules whose records are parties (share the "parties" folder set). */
const PARTY_MODULES = ["crm", "srm", "customer", "supplier", "finance"];

export type AttachmentFolderOption = {
  id: string;
  name: string;
  sort_order: number;
  /** Files in this folder across all records of the module. */
  file_count: number;
};

/**
 * Folder a file belongs to. Keyword guessing (contracts, pricing, finance)
 * only applies to parties, and only to folders that still exist.
 */
function inferFolderFromFile(
  file: Attachment | undefined,
  folderNames: string[],
  isPartyModule: boolean,
): AttachmentFolder {
  if (file?.folder) return file.folder;

  const fallback = folderNames.includes("General")
    ? "General"
    : (folderNames[0] ?? "General");

  if (!isPartyModule) return fallback;

  const has = (name: string) => folderNames.includes(name);
  const name = (file?.file_name || "").toLowerCase();
  const mime = (file?.mime_type || "").toLowerCase();

  if (
    has("Contracts") &&
    (name.includes("contract") ||
      name.includes("agreement") ||
      name.includes("nda"))
  ) {
    return "Contracts";
  }
  if (
    has("Pricing & Rebates") &&
    (name.includes("price") ||
      name.includes("rebate") ||
      name.includes("quote"))
  ) {
    return "Pricing & Rebates";
  }
  if (
    has("Finance") &&
    (name.includes("invoice") ||
      name.includes("statement") ||
      name.includes("credit") ||
      mime.includes("spreadsheet") ||
      mime.includes("excel"))
  ) {
    return "Finance";
  }
  return fallback;
}

export default function AttachmentsTab({
  module,
  recordId,
  readonly = false,
  onRequestEdit,
}: Props) {
  const [files, setFiles] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  // Folder selection state
  const [selectedFolder, setSelectedFolder] = useState<string>("General");
  const [activeFolderFilter, setActiveFolderFilter] = useState<string | null>(
    null,
  );

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);

  /* Folders: per module, configurable at runtime (Manage folders) */
  const isPartyModule = PARTY_MODULES.includes(module.toLowerCase());
  /* Parties get the upload area and the listing side by side */
  const sideBySide = isPartyModule && !readonly;
  const [folders, setFolders] = useState<AttachmentFolderOption[]>([]);
  const [manageOpen, setManageOpen] = useState(false);
  const [maxFolders, setMaxFolders] = useState(8);

  const loadFolders = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/attachments/folders?module=${encodeURIComponent(module)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("Failed to load folders");
      const data = (await res.json()) as {
        folders?: AttachmentFolderOption[];
        max_folders?: number;
      };
      setFolders(data.folders ?? []);
      if (typeof data.max_folders === "number") setMaxFolders(data.max_folders);
    } catch (err) {
      console.error(err);
      /* Keep the tab usable even if folders cannot load */
      setFolders((current) =>
        current.length
          ? current
          : [{ id: "general", name: "General", sort_order: 0, file_count: 0 }],
      );
    }
  }, [module]);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders]);

  const folderNames = useMemo(() => folders.map((f) => f.name), [folders]);

  /* Configured folders + any folder name still used by this record's files */
  const displayFolders = useMemo(() => {
    const names = [...folderNames];
    for (const file of files) {
      const name = inferFolderFromFile(file, folderNames, isPartyModule);
      if (!names.some((n) => n.toLowerCase() === name.toLowerCase())) {
        names.push(name);
      }
    }
    return names;
  }, [folderNames, files, isPartyModule]);

  /* Keep the upload target valid when folders change */
  useEffect(() => {
    if (!folderNames.length) return;
    if (!folderNames.includes(selectedFolder)) {
      setSelectedFolder(
        folderNames.includes("General") ? "General" : folderNames[0],
      );
    }
    if (
      activeFolderFilter &&
      !displayFolders.some(
        (name) => name.toLowerCase() === activeFolderFilter.toLowerCase(),
      )
    ) {
      setActiveFolderFilter(null);
    }
  }, [folderNames, displayFolders, selectedFolder, activeFolderFilter]);

  const formatDate = (date?: string) => {
    if (!date) return "Not available";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "Not available";
    return parsed.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

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

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const name of displayFolders) counts[name.toLowerCase()] = 0;
    for (const file of files) {
      const key = inferFolderFromFile(file, folderNames, isPartyModule).toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [files, displayFolders, folderNames, isPartyModule]);

  const visibleFiles = useMemo(() => {
    if (!activeFolderFilter) return files;
    return files.filter(
      (f) =>
        inferFolderFromFile(f, folderNames, isPartyModule).toLowerCase() ===
        activeFolderFilter.toLowerCase(),
    );
  }, [files, activeFolderFilter, folderNames, isPartyModule]);

  const handleDeleteClick = (attachment: Attachment) => {
    setDeleteTarget(attachment);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) {
      return;
    }

    const id = deleteTarget.id;

    try {
      setDeletingId(id);

      // const res = await fetch(`/api/attachments/${id}`, {
      //   method: "DELETE",
      // });

      const params = new URLSearchParams({
        module,
        record_id: recordId,
      });

      const res = await fetch(`/api/attachments/${id}?${params.toString()}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete attachment");
      }

      setFiles((prev) => prev.filter((item) => item.id !== id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete operation failed:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancelDelete = () => {
    if (deletingId) {
      return;
    }
    setDeleteTarget(null);
  };

  const isPreviewable = (mimeType?: string) => {
    if (!mimeType) return false;
    return mimeType === "application/pdf" || mimeType.startsWith("image/");
  };

  const getFileTypeLabel = (fileName?: string, mimeType?: string) => {
    if (mimeType === "application/pdf") return "PDF";
    if (mimeType?.startsWith("image/")) return "IMAGE";
    if (fileName?.includes(".")) {
      return fileName.split(".").pop()?.toUpperCase() || "DOC";
    }
    return "DOC";
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIconColor = (mimeType?: string) => {
    if (mimeType === "application/pdf") {
      return "text-red-600 bg-red-50 border-red-200/70 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/60";
    }
    if (mimeType?.startsWith("image/")) {
      return "text-purple-600 bg-purple-50 border-purple-200/70 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/60";
    }
    if (mimeType?.includes("spreadsheet") || mimeType?.includes("excel")) {
      return "text-emerald-700 bg-emerald-50 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60";
    }
    if (mimeType?.includes("word") || mimeType?.includes("document")) {
      return "text-sky-700 bg-sky-50 border-sky-200/70 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/60";
    }
    return "text-black bg-slate-100 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800";
  };

  const cardClass =
    "rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#11161D] shadow-2xs transition-colors";

  return (
    <>
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon
              icon="tabler:paperclip"
              className="text-emerald-800 text-3xl"
            />
            <h3 className="text-sm font-semibold text-black dark:text-slate-100">
              Attachments
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60 tabular-nums">
              {files.length} {files.length === 1 ? "file" : "files"}
            </span>
          </div>

          <div className="flex items-center gap-3">
          {!readonly && (
            <button
              type="button"
              onClick={() => setManageOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-emerald-600 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-300"
              title={`Add, rename, re-order or delete folders (max ${maxFolders})`}
            >
              <Icon icon="tabler:folder-cog" className="text-base" />
              Manage folders
              <span className="tabular-nums text-[10px] font-medium text-slate-400">
                {folders.length}/{maxFolders}
              </span>
            </button>
          )}

          {activeFolderFilter && (
            <button
              type="button"
              onClick={() => setActiveFolderFilter(null)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              <Icon icon="tabler:arrow-left" className="text-emerald-800 text-xl" />
              <span>Show All Folders</span>
            </button>
          )}
          </div>
        </div>

        {/* Folder Cards Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 2xl:grid-cols-8 gap-2">
          {displayFolders.map((folderName) => {
            const count = folderCounts[folderName.toLowerCase()] || 0;
            const isSelectedFilter = activeFolderFilter === folderName;

            return (
              <button
                key={folderName}
                type="button"
                onClick={() => {
                  setSelectedFolder(folderName);
                  setActiveFolderFilter((prev) =>
                    prev === folderName ? null : folderName,
                  );
                }}
                title={`${folderName} (${count} ${count === 1 ? "file" : "files"})`}
                className={`${cardClass} px-2.5 py-2 flex items-center gap-2 text-left group min-w-0 hover:border-emerald-600/60 dark:hover:border-emerald-500/60 ${
                  isSelectedFilter
                    ? "ring-1 ring-emerald-600 dark:ring-emerald-500 border-emerald-600/70 dark:border-emerald-500/70 bg-emerald-50/20 dark:bg-emerald-950/20"
                    : ""
                }`}
              >
                <div className="w-7 h-7 shrink-0 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center justify-center">
                  <Icon
                    icon={isSelectedFilter ? "tabler:folder-open" : "tabler:folder"}
                    className="text-emerald-800 dark:text-emerald-400 text-base"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold leading-4 text-black dark:text-slate-100 truncate">
                    {folderName}
                  </p>
                  <p className="text-[10px] leading-4 text-slate-500 dark:text-slate-400 tabular-nums">
                    {count} {count === 1 ? "file" : "files"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {(() => {
          const filesHeader = (
            <span>
              {activeFolderFilter
                ? `Folder: ${activeFolderFilter} (${visibleFiles.length})`
                : `All Files (${visibleFiles.length})`}
            </span>
          );

          const fileItems = (
            <>
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-8 animate-pulse">
              Scanning file directories...
            </p>
          ) : visibleFiles.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-[#11161D]/50 text-slate-400 text-sm">
              {activeFolderFilter
                ? `No attachments found in "${activeFolderFilter}".`
                : "No active asset attachments verified for this record link."}
            </div>
          ) : (
            visibleFiles.map((item) => {
              const previewable = isPreviewable(item.mime_type);
              const folderLabel = inferFolderFromFile(
                item,
                folderNames,
                isPartyModule,
              );

              return (
                <div
                  key={item.id || item.file_key || item.file_name}
                  className={`${cardClass} p-3.5 transition-colors hover:border-slate-300 dark:hover:border-slate-700`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-lg border flex items-center justify-center text-[10px] font-bold tracking-tight shrink-0 ${getFileIconColor(
                          item.mime_type,
                        )}`}
                      >
                        {getFileTypeLabel(item.file_name, item.mime_type)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            className="text-sm font-semibold text-black dark:text-slate-100 truncate"
                            title={item.file_name}
                          >
                            {item.file_name}
                          </p>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-black dark:text-slate-300 border border-slate-200/70 dark:border-slate-700">
                            {folderLabel}
                          </span>
                        </div>

                        <p className="text-[11px] text-black dark:text-slate-400 truncate mt-0.5 tabular-nums">
                          {item.mime_type || "Document"}
                          {item.file_size
                            ? ` • ${formatFileSize(item.file_size)}`
                            : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.file_path && (
                        <a
                          href={item.file_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-950 border border-emerald-200/70 dark:border-emerald-800/60 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Icon
                            icon={
                              previewable
                                ? "tabler:eye"
                                : "tabler:external-link"
                            }
                            className="w-3.5 h-3.5"
                          />
                          <span>{previewable ? "View" : "Open"}</span>
                        </a>
                      )}

                      {!readonly && item.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(item)}
                          disabled={deletingId === item.id}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-700 dark:text-red-400 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950 border border-red-200/70 dark:border-red-900/60 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Icon icon="tabler:trash" className="text-emerald-800 text-xl" />
                          <span>
                            {deletingId === item.id ? "Deleting..." : "Delete"}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-black dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Icon
                        icon="tabler:user"
                        className="text-emerald-800 text-xl"
                      />
                      <span>
                        Created by:{" "}
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {item.created_by_name ||
                            (item.created_by
                              ? `User ${item.created_by}`
                              : "Unknown")}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 tabular-nums">
                      <Icon
                        icon="tabler:calendar-clock"
                        className="text-emerald-800 text-xl"
                      />
                      <span>
                        Created on:{" "}
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {formatDate(item.created_at)}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
            </>
          );

          const uploadCard = (
          <div
            className={`rounded-xl border border-dashed border-emerald-400/80 dark:border-emerald-800/80 bg-emerald-50/15 dark:bg-[#11161D] transition-colors ${
              sideBySide ? "h-full flex flex-col p-4" : "p-5"
            }`}
          >
            <div className={sideBySide ? "flex-1 min-h-0 flex items-center justify-center" : ""}>
            <UploadDropzone
              className="custom-attachment ut-button:bg-emerald-700 ut-button:hover:bg-emerald-800 ut-button:dark:bg-emerald-600 ut-button:dark:hover:bg-emerald-500 ut-button:text-white ut-button:text-sm ut-button:font-semibold ut-button:rounded-lg ut-button:px-4 ut-button:py-2 ut-label:text-emerald-700 ut-label:dark:text-emerald-400 ut-allowed-content:text-black ut-allowed-content:dark:text-slate-400"
              endpoint="attachmentUploader"
              input={{
                module,
                recordId,
                folder: selectedFolder,
              }}
              config={{ mode: "auto" }}
              onUploadBegin={() => {
                setUploading(true);
                setUploadComplete(false);
                onRequestEdit?.();
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
                container: "w-full border-0 bg-transparent p-0 gap-2",
                label:
                  "text-sm font-bold text-black dark:text-slate-100 cursor-pointer",
                uploadIcon: "h-9 w-9 text-emerald-700 dark:text-emerald-400",
                allowedContent:
                  "text-[11px] text-black dark:text-slate-400",
                button: [
                  "h-9",
                  "px-4",
                  "rounded-lg",
                  "text-sm",
                  "font-semibold",
                  "text-white",
                  "shadow-2xs",
                  "transition-colors",
                  !uploading && !uploadComplete
                    ? "bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                    : "",
                  uploading ? "bg-slate-400 cursor-not-allowed" : "",
                  uploadComplete ? "bg-emerald-600 hover:bg-emerald-700" : "",
                ]
                  .filter(Boolean)
                  .join(" "),
              }}
              content={{
                uploadIcon: (
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                    <Icon icon="tabler:cloud-upload" className="text-emerald-800 text-xl" />
                  </div>
                ),
                label: uploading
                  ? "Uploading..."
                  : uploadComplete
                    ? "Upload Complete"
                    : "Upload Files",
                allowedContent:
                  "Drag & drop files here or click to browse • PDF, Excel, Word, Images (max 10 MB)",
                button: uploading ? "Uploading..." : "Upload Files",
              }}
            />

            </div>

            {/* Save to Folder Selector Bar */}
            <div className={`${sideBySide ? "mt-3" : "mt-4"} pt-3.5 border-t border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
              <div className="flex items-center gap-2.5 flex-1 max-w-sm">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  Save to Folder <span className="text-red-500">*</span>
                </label>
                <div className="relative flex-1">
                  {/* <Icon
                    icon="tabler:folder"
                    className="text-emerald-800 text-xl"
                  /> */}
                  <select
                    value={selectedFolder}
                    disabled={uploading}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-medium text-black dark:text-slate-100 outline-none focus:border-emerald-600 dark:focus:border-emerald-500"
                  >
                    {folderNames.map((folder) => (
                      <option key={folder} value={folder}>
                        {folder}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-black dark:text-slate-400">
                <Icon
                  icon="tabler:folder-check"
                  className="text-emerald-800 text-xl"
                />
                <span>
                  Target folder:{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {selectedFolder}
                  </strong>
                </span>
              </div>
            </div>
          </div>
          );

          if (sideBySide) {
            /* Parties: upload and listing side by side, same height, scrolling */
            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:h-[460px]">
                <div className="min-h-0 lg:h-full">{uploadCard}</div>
                <div
                  className={`${cardClass} min-h-0 max-h-[460px] lg:max-h-none lg:h-full flex flex-col overflow-hidden`}
                >
                  <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-200/80 dark:border-slate-800 text-sm font-semibold text-black dark:text-slate-200">
                    <span className="flex items-center gap-2">
                      <Icon icon="tabler:files" className="text-emerald-800 text-lg" />
                      {filesHeader}
                    </span>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
                    {fileItems}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <>
              {!readonly && uploadCard}

              {/* Files List */}
              <div
                className={`space-y-2.5 ${
                  isPartyModule ? "max-h-[460px] overflow-y-auto pr-1" : ""
                }`}
              >
                <div className="flex items-center justify-between text-sm text-black dark:text-slate-400 px-1">
                  {filesHeader}
                </div>
                {fileItems}
              </div>
            </>
          );
        })()}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-xs"
          onClick={handleCancelDelete}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-attachment-title"
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#11161D] border border-slate-200 dark:border-slate-800 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
                  <Icon
                    icon="tabler:trash"
                    className="text-emerald-800 text-xl"
                  />
                </div>

                <div className="min-w-0">
                  <h2
                    id="delete-attachment-title"
                    className="text-base font-semibold text-black dark:text-slate-100"
                  >
                    Delete attachment?
                  </h2>

                  <p className="mt-1 text-sm text-black dark:text-slate-400 leading-5">
                    Are you sure you want to delete this attachment? This action
                    cannot be undone.
                  </p>
                </div>
              </div>

              {deleteTarget.file_name && (
                <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {deleteTarget.file_name}
                  </p>

                  {deleteTarget.mime_type && (
                    <p className="mt-0.5 text-[11px] text-slate-400 dark:text-black truncate">
                      {deleteTarget.mime_type}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 px-6 py-3.5 rounded-b-2xl">
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={!!deletingId}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={!!deletingId}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingId ? "Deleting..." : "Delete Attachment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {manageOpen && (
        <AttachmentFolderManager
          module={module}
          folders={folders}
          isPartyModule={isPartyModule}
          maxFolders={maxFolders}
          onClose={() => setManageOpen(false)}
          onChanged={async () => {
            /* renames / deletes also move files between folders */
            await Promise.all([loadFolders(), loadFiles()]);
          }}
        />
      )}
    </>
  );
}
