// app/components/inventory/stock-transfer/transfer-stock/components/TransferStockHeader.tsx

"use client";

import React from "react";

import { Button } from "@/components/ui/button";

type Props = {
  isPosted: boolean;
  transferId?: string | null;
  isEditing: boolean;
  readOnly: boolean;
  onEdit: () => void;
};

export default function TransferStockHeader({
  isPosted,
  transferId,
  isEditing,
  readOnly,
  onEdit,
}: Props) {
  return (
    <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">Stock Transfer</h2>

        {isPosted && (
          <span className="inline-flex mt-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
            Posted
          </span>
        )}
      </div>

      {transferId && !readOnly && !isPosted && !isEditing && (
        <Button type="button" variant="outline" onClick={onEdit}>
          Edit
        </Button>
      )}
    </div>
  );
}
