// app/components/DataTable/CustomisationModal.tsx

"use client";

import React, { useState, useEffect } from "react";
import { ColumnConfig } from "@/types/table";
import { Button } from "@/components/ui/button";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnConfig[];
  onSave: (updatedCols: ColumnConfig[]) => void;
  onResetDefault: () => void;
}

const COLOR_OPTIONS = [
  "#064e3b", // Dark Emerald
  "#1e293b", // Dark Slate
  "#1e3a8a", // Dark Navy
  "#701a75", // Dark Plum
  "#7f1d1d", // Dark Red
];

export const CustomisationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  columns,
  onSave,
  onResetDefault,
}) => {
  const [cols, setCols] = useState<ColumnConfig[]>(() =>
    [...columns].sort((a, b) => a.columnOrder - b.columnOrder),
  );
  //   const [cols, setCols] = useState<ColumnConfig[]>([]);

  //   // 🌟 FIX: Sync local modal state when columns prop changes or modal opens
  //   useEffect(() => {
  //     if (isOpen && columns.length > 0) {
  //       setCols([...columns].sort((a, b) => a.columnOrder - b.columnOrder));
  //     }
  //   }, [isOpen, columns]);

  if (!isOpen) return null;

  const handleToggleVisible = (index: number) => {
    const updated = [...cols];
    updated[index] = {
      ...updated[index],
      isVisible: !updated[index].isVisible,
    };
    setCols(updated);
  };

  const handleTogglePinned = (index: number) => {
    const updated = [...cols];
    updated[index] = { ...updated[index], isPinned: !updated[index].isPinned };
    setCols(updated);
  };

  const handleColorChange = (index: number, color: string) => {
    const updated = [...cols];
    const currentColor = updated[index].headerColor;
    updated[index] = {
      ...updated[index],
      headerColor: currentColor === color ? undefined : color,
    };
    setCols(updated);
  };

  const handleWidthChange = (index: number, width: number) => {
    const updated = [...cols];
    updated[index] = { ...updated[index], columnWidth: width };
    setCols(updated);
  };

  const moveColumn = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === cols.length - 1)
    ) {
      return;
    }
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const updated = [...cols];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);

    // Reassign sequence orders
    setCols(updated.map((c, i) => ({ ...c, columnOrder: i + 1 })));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl dark:bg-slate-900 ">
        {/* Header */}
        <div className="flex items-center justify-between p-6 dark:border-slate-800 justify-between bg-emerald-950 text-white border-b border-emerald-900">
          <div>
            <h3 className="text-lg font-bold text-white">
              Table Customisation
            </h3>
            <p className="text-xs">
              Reorder, pin, hide, or format grid columns for your profile.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Content Table */}
        <div className="max-h-[60vh] overflow-y-auto my-4 px-6 border rounded-lg border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-800">
              <tr className="text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                <th className="p-3 w-12 text-center">Order</th>
                <th className="p-3">Column Name</th>
                <th className="p-3 text-center w-20">Visible</th>
                <th className="p-3 text-center w-20">Pinned</th>
                <th className="p-3 text-center">Header Color</th>
                <th className="p-3 text-center w-36">Width (px)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {cols.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No column configuration parameters available.
                  </td>
                </tr>
              ) : (
                cols.map((col, idx) => (
                  <tr
                    key={col.columnKey}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {/* Order Controls */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          disabled={idx === 0}
                          onClick={() => moveColumn(idx, "up")}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-600 dark:text-slate-300"
                        >
                          ▲
                        </button>
                        <button
                          disabled={idx === cols.length - 1}
                          onClick={() => moveColumn(idx, "down")}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-600 dark:text-slate-300"
                        >
                          ▼
                        </button>
                      </div>
                    </td>

                    {/* Column Name */}
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                      {col.label}
                    </td>

                    {/* Visible Toggle */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={col.isVisible}
                        onChange={() => handleToggleVisible(idx)}
                        className="h-4 w-4 rounded accent-emerald-700 cursor-pointer"
                      />
                    </td>

                    {/* Pinned Toggle */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={col.isPinned}
                        onChange={() => handleTogglePinned(idx)}
                        className="h-4 w-4 rounded accent-emerald-700 cursor-pointer"
                      />
                    </td>

                    {/* Header Color Choices */}
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1.5">
                        {COLOR_OPTIONS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => handleColorChange(idx, color)}
                            className={`h-5 w-5 rounded-full border border-slate-300 transition-transform ${
                              col.headerColor === color
                                ? "scale-125 ring-2 ring-emerald-500 ring-offset-1"
                                : "hover:scale-110"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </td>

                    {/* Width Adjustment Slider */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="range"
                          min="100"
                          max="350"
                          step="10"
                          value={col.columnWidth || 150}
                          onChange={(e) =>
                            handleWidthChange(idx, Number(e.target.value))
                          }
                          className="w-20 accent-emerald-700 cursor-pointer"
                        />
                        <span className="w-8 text-[11px] font-mono text-slate-500">
                          {col.columnWidth || 150}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t pt-4 px-6 pb-6 dark:border-slate-800">
          <Button
            onClick={onResetDefault}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button
              onClick={onClose}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={() => onSave(cols)}
              className="rounded-lg bg-emerald-800 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-900 shadow-sm transition-colors"
            >
              Save Custom Layout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* export const CustomisationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  columns,
  onSave,
  onResetDefault,
}) => {
  const [cols, setCols] = useState<ColumnConfig[]>(
    [...columns].sort((a, b) => a.columnOrder - b.columnOrder)
  );

  if (!isOpen) return null;

  const handleToggleVisible = (index: number) => {
    const updated = [...cols];
    updated[index].isVisible = !updated[index].isVisible;
    setCols(updated);
  };

  const handleTogglePinned = (index: number) => {
    const updated = [...cols];
    updated[index].isPinned = !updated[index].isPinned;
    setCols(updated);
  };

  const handleColorChange = (index: number, color: string) => {
    const updated = [...cols];
    updated[index].headerColor = updated[index].headerColor === color ? undefined : color;
    setCols(updated);
  };

  const handleWidthChange = (index: number, width: number) => {
    const updated = [...cols];
    updated[index].columnWidth = width;
    setCols(updated);
  };

  const moveRow = (dragIndex: number, hoverIndex: number) => {
    const updated = [...cols];
    const [dragged] = updated.splice(dragIndex, 1);
    updated.splice(hoverIndex, 0, dragged);
    setCols(updated.map((col, idx) => ({ ...col, columnOrder: idx + 1 })));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Table Customisation
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">✕</button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-slate-500 uppercase">
                <th className="p-2">Name</th>
                <th className="p-2 text-center">Visible</th>
                <th className="p-2 text-center">Pinned</th>
                <th className="p-2 text-center">Colour</th>
                <th className="p-2 text-center">Width</th>
              </tr>
            </thead>
            <tbody>
              {cols.map((col, idx) => (
                <tr key={col.columnKey} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="p-2 font-medium flex items-center gap-2">
                    <span className="cursor-grab text-slate-400">⋮⋮</span>
                    {col.label}
                  </td>
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={col.isVisible}
                      onChange={() => handleToggleVisible(idx)}
                      className="h-4 w-4 rounded accent-emerald-600"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <input
                      type="radio"
                      checked={col.isPinned}
                      onChange={() => handleTogglePinned(idx)}
                      className="h-4 w-4 accent-emerald-600"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <div className="flex justify-center gap-1">
                      {COLOR_OPTIONS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleColorChange(idx, color)}
                          className={`h-4 w-4 rounded border ${
                            col.headerColor === color ? 'ring-2 ring-emerald-500' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="p-2 text-center">
                    <input
                      type="range"
                      min="80"
                      max="300"
                      value={col.columnWidth || 150}
                      onChange={(e) => handleWidthChange(idx, Number(e.target.value))}
                      className="w-24 accent-emerald-600"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <button
            onClick={onResetDefault}
            className="rounded border border-slate-300 px-4 py-1.5 text-sm font-medium hover:bg-slate-100"
          >
            Default
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(cols)}
              className="rounded bg-emerald-700 px-4 py-1.5 text-sm text-white hover:bg-emerald-800"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; */
