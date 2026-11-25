// app/components/shared/AttachmentFolderManager.tsx

"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import type { AttachmentFolderOption } from "./AttachmentsTab";

type Props = {
  module: string;
  folders: AttachmentFolderOption[];
  /** True for crm / srm / customer / supplier / finance (shared folder set). */
  isPartyModule: boolean;
  onClose: () => void;
  /** Called after any change so the tab can reload folders and files. */
  onChanged: () => Promise<void> | void;
};

async function readError(res: Response, fallback: string) {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

const inputClass =
  "h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

/**
 * Add / rename / delete attachment folders for a module. Folders are shared
 * by every record of the module (all parties modules share one set).
 */
export default function AttachmentFolderManager({
  module,
  folders,
  isPartyModule,
  onClose,
  onChanged,
}: Props) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [moveTo, setMoveTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const addFolder = () =>
    run(async () => {
      const res = await fetch("/api/attachments/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module, name: newName }),
      });
      if (!res.ok) throw new Error(await readError(res, "Failed to add folder."));
      setNewName("");
    });

  const renameFolder = (id: string) =>
    run(async () => {
      const res = await fetch(`/api/attachments/folders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      if (!res.ok) throw new Error(await readError(res, "Failed to rename folder."));
      setEditingId(null);
    });

  const deleteFolder = (id: string) =>
    run(async () => {
      const query = moveTo ? `?move_to=${encodeURIComponent(moveTo)}` : "";
      const res = await fetch(`/api/attachments/folders/${id}${query}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await readError(res, "Failed to delete folder."));
      setDeleteId(null);
      setMoveTo("");
    });

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4 backdrop-blur-xs"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#11161D]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Icon icon="tabler:folder-cog" className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Manage folders
              </h3>
              <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {isPartyModule
                  ? "Shared by all CRM, Customer, SRM and Supplier records."
                  : "Shared by all records in this module."}{" "}
                Renaming a folder also updates its files.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Close"
          >
            <Icon icon="tabler:x" className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {folders.map((folder) => {
              const isEditing = editingId === folder.id;
              const isDeleting = deleteId === folder.id;
              const others = folders.filter((f) => f.id !== folder.id);

              return (
                <li key={folder.id} className="px-3 py-2.5">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Icon icon="tabler:folder" className="shrink-0 text-lg text-emerald-700" />
                      <input
                        autoFocus
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void renameFolder(folder.id);
                          if (event.key === "Escape") {
                            event.stopPropagation();
                            setEditingId(null);
                          }
                        }}
                        maxLength={60}
                        className={inputClass}
                      />
                      <button
                        type="button"
                        disabled={busy || !editName.trim()}
                        onClick={() => void renameFolder(folder.id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50"
                        title="Save name"
                      >
                        <Icon icon="tabler:check" />
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setEditingId(null)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700"
                        title="Cancel"
                      >
                        <Icon icon="tabler:x" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Icon icon="tabler:folder" className="shrink-0 text-lg text-emerald-700" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {folder.name}
                      </span>
                      <span className="shrink-0 text-[11px] tabular-nums text-slate-500">
                        {folder.file_count} {folder.file_count === 1 ? "file" : "files"}
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setEditingId(folder.id);
                          setEditName(folder.name);
                          setDeleteId(null);
                        }}
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-700 dark:hover:bg-slate-800"
                        title="Rename folder"
                      >
                        <Icon icon="tabler:pencil" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={busy || folders.length <= 1}
                        onClick={() => {
                          setDeleteId(folder.id);
                          setMoveTo(others[0]?.id ?? "");
                          setEditingId(null);
                        }}
                        className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-red-950/40"
                        title={
                          folders.length <= 1
                            ? "At least one folder must remain"
                            : "Delete folder"
                        }
                      >
                        <Icon icon="tabler:trash" className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {isDeleting && (
                    <div className="mt-2 rounded-lg border border-red-200 bg-red-50/70 p-3 text-xs dark:border-red-900/60 dark:bg-red-950/20">
                      <p className="font-semibold text-red-700 dark:text-red-400">
                        Delete “{folder.name}”?
                      </p>
                      {folder.file_count > 0 ? (
                        <label className="mt-2 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          Move its {folder.file_count}{" "}
                          {folder.file_count === 1 ? "file" : "files"} to
                          <select
                            value={moveTo}
                            onChange={(event) => setMoveTo(event.target.value)}
                            className="h-7 flex-1 rounded-md border border-slate-300 bg-white px-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                          >
                            {others.map((other) => (
                              <option key={other.id} value={other.id}>
                                {other.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <p className="mt-1 text-slate-600 dark:text-slate-400">
                          The folder is empty.
                        </p>
                      )}
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setDeleteId(null)}
                          className="rounded-md border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void deleteFolder(folder.id)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {busy && <Icon icon="tabler:loader-2" className="h-3.5 w-3.5 animate-spin" />}
                          Delete folder
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Add */}
        <form
          className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/40"
          onSubmit={(event) => {
            event.preventDefault();
            if (newName.trim()) void addFolder();
          }}
        >
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="New folder name"
            maxLength={60}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={busy || !newName.trim()}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            <Icon icon="tabler:folder-plus" className="h-4 w-4" />
            Add folder
          </button>
        </form>
      </div>
    </div>
  );
}
