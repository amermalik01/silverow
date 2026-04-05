// app/components/common/FileUploader.tsx
"use client";

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
