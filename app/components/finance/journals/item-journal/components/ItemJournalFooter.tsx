// app/components/finance/journals/item-journal/components/ItemJournalFooter.tsx

"use client";

import React from "react";

import { Button } from "@/components/ui/button";

type Props = {
  formDisabled: boolean;
  loading: boolean;
  isPosted: boolean;
  isEditing: boolean;

  onPost: () => void;
  onSave: () => void;
  onCancel: () => void;
  onNavigate: () => void;
  onEdit: () => void;
};

export default function ItemJournalFooter({
  formDisabled,
  loading,
  isPosted,
  isEditing,
  onPost,
  onSave,
  onCancel,
  onNavigate,
  onEdit,
}: Props) {
  return (
    <div className="flex flex-col lg:flex-row justify-between gap-4 pt-2">
      <div className="flex items-center gap-4 text-xs font-medium text-zinc-600 dark:text-zinc-300">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
          <span>Unallocated</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
          <span>Partial</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          <span>Allocated</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isPosted && (
          <Button type="button" onClick={onNavigate} variant="add_line">
            Navigate
          </Button>
        )}
        {!formDisabled && !isPosted && (
          <>
            <Button
              type="button"
              onClick={onPost}
              variant="post"
              disabled={loading}
            >
              {loading ? "Processing..." : "Post Journal"}
            </Button>
          </>
        )}

        {!isEditing ? (
          <>
            <Button
              type="button"
              onClick={onEdit}
              disabled={isPosted}
              variant="edit"
            >
              Edit
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              onClick={onSave}
              disabled={loading}
              variant="save"
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
