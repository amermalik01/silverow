// app/components/common/FileUploader.tsx

"use client";

import { useEffect, useState, useCallback } from "react";

type Props = {
  module: string;
  recordId: string;
};

type FileItem = {
  id: string;
  file_name: string;
  file_path: string;
};

export default function FileUploader({ module, recordId }: Props) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/attachments?module=${module}&record_id=${recordId}`,
      );
      if (!res.ok) throw new Error("Failed to load list");
      const result = await res.json();
      setFiles(result.data || []);
    } catch (err) {
      console.error("File loading sequence failed:", err);
    }
  }, [module, recordId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("module", module);
    formData.append("record_id", recordId);

    try {
      setUploading(true);
      // Correction made to point to base endpoint path matching router layout
      const res = await fetch("/api/attachments", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Upload target server rejected");
      }

      e.target.value = ""; // Clear file input
      await loadFiles();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Upload operational failure");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this attachment?")) return;
    try {
      const res = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete record");
      await loadFiles();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 border rounded p-4 bg-white shadow-sm">
      <h3 className="font-semibold text-lg border-b pb-2">Attachments</h3>
      <div className="flex items-center gap-2">
        <input
          type="file"
          onChange={uploadFile}
          disabled={uploading}
          className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-5 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer disabled:opacity-50"
        />
        {uploading && (
          <span className="text-xs text-gray-500 animate-pulse">
            Uploading...
          </span>
        )}
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {files.length === 0 ? (
          <p className="text-xs text-gray-400 italic">
            No attachments uploaded yet.
          </p>
        ) : (
          files.map((f) => (
            <div
              key={f.id}
              className="border p-2 rounded flex justify-between items-center text-xs hover:bg-gray-50 transition"
            >
              <span className="truncate max-w-[70%] font-medium text-gray-700">
                {f.file_name}
              </span>
              <div className="flex gap-3 items-center">
                <a
                  href={f.file_path}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  View
                </a>
                <button
                  onClick={() => handleDelete(f.id)}
                  className="text-red-500 hover:text-red-700 font-medium text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
/* "use client";

import { useEffect, useState } from "react";

type Props = {
  module: string;
  recordId: string;
};

type FileItem = {
  id: string;
  file_name: string;
  file_path: string;
};

export default function FileUploader({ module, recordId }: Props) {
  const [files, setFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    const loadFiles = async () => {
      const res = await fetch(
        `/api/attachments?module=${module}&record_id=${recordId}`,
      );

      const data = await res.json();

      setFiles(data);
    };

    loadFiles();
  }, [module, recordId]);

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const formData = new FormData();

    formData.append("file", file);
    formData.append("module", module);
    formData.append("record_id", recordId);

    await fetch("/api/attachments/upload", {
      method: "POST",
      body: formData,
    });

    const loadFiles = async () => {
      const res = await fetch(
        `/api/attachments?module=${module}&record_id=${recordId}`,
      );

      const data = await res.json();

      setFiles(data);
    };

    loadFiles();
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Attachments</h3>

      <input type="file" onChange={uploadFile} />

      <div className="space-y-2">
        {files.map((f) => (
          <div key={f.id} className="border p-2 rounded flex justify-between">
            <span>{f.file_name}</span>

            <a href={f.file_path} target="_blank" className="text-blue-600">
              View
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
 */
