// app/components/DataTable/CustomisationModal.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";

import { ColumnConfig } from "@/types/table";
import { Button } from "@/components/ui/button";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnConfig[];

  onSave: (updatedCols: ColumnConfig[]) => Promise<void>;

  onResetDefault: () => Promise<void>;
}

const COLOR_OPTIONS = ["#064e3b", "#1e293b", "#1e3a8a", "#701a75", "#7f1d1d"];

export const CustomisationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  columns,
  onSave,
  onResetDefault,
}) => {
  const [cols, setCols] = useState<ColumnConfig[]>([]);

  const [saving, setSaving] = useState(false);

  const [resetting, setResetting] = useState(false);

  /* ---------------------------------------------------------------------- */
  /* Sync local state whenever modal opens                                  */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCols([...columns].sort((a, b) => a.columnOrder - b.columnOrder));
  }, [isOpen, columns]);

  /* ---------------------------------------------------------------------- */
  /* Toggle Visibility                                                      */
  /* ---------------------------------------------------------------------- */

  const handleToggleVisible = useCallback((index: number) => {
    setCols((previous) => {
      const updated = [...previous];

      updated[index] = {
        ...updated[index],
        isVisible: !updated[index].isVisible,
      };

      return updated;
    });
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Toggle Pinned                                                          */
  /* ---------------------------------------------------------------------- */

  const handleTogglePinned = useCallback((index: number) => {
    setCols((previous) => {
      const updated = [...previous];

      updated[index] = {
        ...updated[index],
        isPinned: !updated[index].isPinned,
      };

      return updated;
    });
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Header Color                                                           */
  /* ---------------------------------------------------------------------- */

  const handleColorChange = useCallback((index: number, color: string) => {
    setCols((previous) => {
      const updated = [...previous];

      const currentColor = updated[index].headerColor;

      updated[index] = {
        ...updated[index],
        headerColor: currentColor === color ? undefined : color,
      };

      return updated;
    });
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Width                                                                  */
  /* ---------------------------------------------------------------------- */

  const handleWidthChange = useCallback((index: number, width: number) => {
    setCols((previous) => {
      const updated = [...previous];

      updated[index] = {
        ...updated[index],
        columnWidth: width,
      };

      return updated;
    });
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Move Column                                                            */
  /* ---------------------------------------------------------------------- */

  const moveColumn = useCallback((index: number, direction: "up" | "down") => {
    setCols((previous) => {
      if (
        (direction === "up" && index === 0) ||
        (direction === "down" && index === previous.length - 1)
      ) {
        return previous;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;

      const updated = [...previous];

      const [movedColumn] = updated.splice(index, 1);

      updated.splice(targetIndex, 0, movedColumn);

      return updated.map((column, columnIndex) => ({
        ...column,
        columnOrder: columnIndex + 1,
      }));
    });
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Save                                                                    */
  /* ---------------------------------------------------------------------- */

  const handleSave = useCallback(async () => {
    if (saving || resetting) {
      return;
    }

    setSaving(true);

    try {
      await onSave(cols);
    } catch (error) {
      console.error("Failed to save table configuration:", error);
    } finally {
      setSaving(false);
    }
  }, [cols, onSave, saving, resetting]);

  /* ---------------------------------------------------------------------- */
  /* Reset                                                                   */
  /* ---------------------------------------------------------------------- */

  const handleReset = useCallback(async () => {
    if (saving || resetting) {
      return;
    }

    setResetting(true);

    try {
      await onResetDefault();
    } catch (error) {
      console.error("Failed to reset table configuration:", error);
    } finally {
      setResetting(false);
    }
  }, [onResetDefault, saving, resetting]);

  /* ---------------------------------------------------------------------- */
  /* Don't render when closed                                               */
  /* ---------------------------------------------------------------------- */

  if (!isOpen) {
    return null;
  }

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between p-6 dark:border-slate-800 bg-emerald-950 text-white border-b border-emerald-900">
          <div>
            <h3 className="text-lg font-bold text-white">
              Table Customisation
            </h3>

            <p className="text-xs text-emerald-200">
              Reorder, pin, hide, or format grid columns for your profile.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving || resetting}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-900 hover:text-white disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto my-4 mx-6 border rounded-lg border-slate-200 dark:border-slate-800">
          <table className="w-full text-left table-fixed text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-800 z-10">
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
                cols.map((col, index) => (
                  <tr
                    key={col.columnKey}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {/* Order */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0 || saving || resetting}
                          onClick={() => moveColumn(index, "up")}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-600 dark:text-slate-300"
                        >
                          ▲
                        </button>

                        <button
                          type="button"
                          disabled={
                            index === cols.length - 1 || saving || resetting
                          }
                          onClick={() => moveColumn(index, "down")}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-600 dark:text-slate-300"
                        >
                          ▼
                        </button>
                      </div>
                    </td>

                    {/* Name */}
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                      {col.label}
                    </td>

                    {/* Visible */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={col.isVisible}
                        disabled={saving || resetting}
                        onChange={() => handleToggleVisible(index)}
                        className="h-4 w-4 rounded accent-emerald-700 cursor-pointer"
                      />
                    </td>

                    {/* Pinned */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={col.isPinned}
                        disabled={saving || resetting}
                        onChange={() => handleTogglePinned(index)}
                        className="h-4 w-4 rounded accent-emerald-700 cursor-pointer"
                      />
                    </td>

                    {/* Colors */}
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1.5">
                        {COLOR_OPTIONS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            disabled={saving || resetting}
                            onClick={() => handleColorChange(index, color)}
                            className={`h-5 w-5 rounded-full border border-slate-300 transition-transform ${
                              col.headerColor === color
                                ? "scale-125 ring-2 ring-emerald-500 ring-offset-1"
                                : "hover:scale-110"
                            } disabled:opacity-40`}
                            style={{
                              backgroundColor: color,
                            }}
                            aria-label={`Set header color ${color}`}
                          />
                        ))}
                      </div>
                    </td>

                    {/* Width */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="range"
                          min="100"
                          max="350"
                          step="10"
                          value={col.columnWidth || 150}
                          disabled={saving || resetting}
                          onChange={(event) =>
                            handleWidthChange(index, Number(event.target.value))
                          }
                          className="w-20 accent-emerald-700 cursor-pointer disabled:opacity-40"
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

        {/* Footer */}
        <div className="flex items-center justify-between border-t pt-4 px-6 pb-6 dark:border-slate-800">
          <Button
            onClick={handleReset}
            variant="cancel"
            disabled={saving || resetting}
          >
            {resetting ? "Resetting..." : "Reset to Default"}
          </Button>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              variant="save"
              disabled={saving || resetting}
            >
              {saving ? "Saving..." : "Save Custom Layout"}
            </Button>

            <Button
              onClick={onClose}
              variant="cancel"
              disabled={saving || resetting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* "use client";

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


        <div className="max-h-[60vh] overflow-y-auto my-4 px-6 border rounded-lg border-slate-200 dark:border-slate-800">
          <table className="w-full text-left table-fixed text-xs border-collapse">
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


                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                      {col.label}
                    </td>


                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={col.isVisible}
                        onChange={() => handleToggleVisible(idx)}
                        className="h-4 w-4 rounded accent-emerald-700 cursor-pointer"
                      />
                    </td>

      
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={col.isPinned}
                        onChange={() => handleTogglePinned(idx)}
                        className="h-4 w-4 rounded accent-emerald-700 cursor-pointer"
                      />
                    </td>

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


        <div className="flex items-center justify-between border-t pt-4 px-6 pb-6 dark:border-slate-800">
          <Button onClick={onResetDefault} variant="cancel">
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button onClick={() => onSave(cols)} variant="save">
              Save Custom Layout
            </Button>
            <Button onClick={onClose} variant="cancel">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}; */
