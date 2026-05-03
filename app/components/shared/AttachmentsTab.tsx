// app/components/shared/AttachmentsTab.tsx

"use client";

import { useEffect, useState } from "react";

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

export default function AttachmentsTab({ module, recordId }: Props) {
  const [files, setFiles] = useState<Attachment[]>([]);

  const [loading, setLoading] = useState(true);

  const [uploading, setUploading] = useState(false);

  const loadFiles = async () => {
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
  };

  useEffect(() => {
    loadFiles();
  }, [module, recordId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

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

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Upload failed");
      }

      await loadFiles();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border rounded p-4 space-y-4">
        <h2 className="font-semibold text-lg">Upload Attachment</h2>

        <input type="file" onChange={handleUpload} />

        {uploading && <p>Uploading...</p>}
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold text-lg">Attachments</h2>

        {loading ? (
          <p>Loading attachments...</p>
        ) : files.length === 0 ? (
          <p>No attachments found</p>
        ) : (
          files.map((item) => (
            <div
              key={item.id}
              className="border rounded p-4 flex justify-between"
            >
              <div>
                <p className="font-medium">{item.file_name}</p>

                <p className="text-xs text-gray-500">{item.mime_type}</p>
              </div>

              {item.file_path && (
                <a
                  href={item.file_path}
                  target="_blank"
                  className="text-blue-600"
                >
                  View
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
