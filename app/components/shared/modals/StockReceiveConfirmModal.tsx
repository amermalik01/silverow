// app/components/shared/modals/StockReceiveConfirmModal.tsx
"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";

interface StockReceiveConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const StockReceiveConfirmModal: React.FC<
  StockReceiveConfirmModalProps
> = ({
  isOpen,
  title = "Confirmation",
  message,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full mx-4 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
          <Icon icon="tabler:check" className="w-10 h-10 text-emerald-500" />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {message}
          </p>
        </div>

        <div className="flex justify-center gap-2 pt-2">
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded transition shadow-xs disabled:opacity-50"
          >
            {loading ? "Processing..." : "Confirm"}
          </Button>
          <Button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded transition"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
