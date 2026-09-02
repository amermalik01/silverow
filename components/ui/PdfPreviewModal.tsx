// components/ui/PdfPreviewModal.tsx

"use client";

import { useState } from "react";
import {
  Printer,
  Download,
  X,
  ExternalLink,
  Loader2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PdfPreviewModalProps {
  buttonText?: string;
  pdfApiUrl: string;
  fileName?: string;
  className?: string;
}

export function PdfPreviewModal({
  buttonText = "Print / View PDF",
  pdfApiUrl,
  fileName = "document.pdf",
  className = "",
}: PdfPreviewModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPdf = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(pdfApiUrl);

      if (!response.ok) {
        throw new Error("Failed to generate PDF document.");
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" }),
      );
      setPdfBlobUrl(blobUrl);
      setIsOpen(true);
    } catch (err) {
      console.error("[PDF_FETCH_ERROR]:", err);
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
  };

  const handleDownload = () => {
    if (!pdfBlobUrl) return;
    const a = document.createElement("a");
    a.href = pdfBlobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <>

      <Button
        type="button"
        onClick={fetchPdf}
        disabled={isLoading}
        variant="post"
        // className={`inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50 ${className}`}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Printer className="h-4 w-4" />
        )}
        {isLoading ? "Generating PDF..." : buttonText}
      </Button>

      {/* Error Toast / Alert */}
      {error && (
        <div className="mt-2 text-xs font-medium text-red-600">{error}</div>
      )}

      {/* Preview Modal */}
      {isOpen && pdfBlobUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-600" />
                <h3 className="font-semibold text-slate-800">{fileName}</h3>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleDownload}
                  variant="save"
                  //   className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>

                {/* Open in New Tab */}
                <a
                  href={pdfBlobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open in Tab
                </a>

                <Button
                  onClick={handleClose}
                  variant="cancel"
                  //   className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors ml-2"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Modal Body / PDF Viewer Iframe */}
            <div className="relative flex-1 bg-slate-100">
              <iframe
                src={pdfBlobUrl}
                className="h-full w-full border-none"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
