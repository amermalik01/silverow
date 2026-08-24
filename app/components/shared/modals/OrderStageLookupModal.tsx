// app/components/shared/modals/OrderStageLookupModal.tsx

"use client";

import { useEffect, useState } from "react";
import { Search, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type OrderStageItem = {
  id: string;
  stage_type: string;
  name: string;
  rank: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  stageType: "sales_order" | "credit_note" | "purchase_order" | "debit_note";
  onSelect: (stage: OrderStageItem) => void;
  onSelectMultiple?: (stages: OrderStageItem[]) => void;
  multiple?: boolean;
};

export default function OrderStageLookupModal({
  open,
  onClose,
  stageType,
  onSelect,
  onSelectMultiple,
  multiple = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState<OrderStageItem[]>([]);
  const [selectedStages, setSelectedStages] = useState<OrderStageItem[]>([]);

  // Pagination State Variables
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState({
    name: "",
  });

  const fetchStages = async (targetPage = page) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("stage_type", stageType);
      params.append("page", String(targetPage));
      params.append("limit", String(limit));

      if (filters.name) params.append("name", filters.name);

      const res = await fetch(`/api/lookups/order-stages?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load stages reference registry");

      const json = await res.json();
      setStages(json.data || []);

      if (json.pagination) {
        setTotalRecords(json.pagination.total);
        setTotalPages(json.pagination.totalPages);
      } else {
        setTotalRecords(json.data.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchStages(1);
      setPage(1);
      setSelectedStages([]);
    }
  }, [open, stageType]);

  const handleToggleRow = (stage: OrderStageItem) => {
    if (selectedStages.some((item) => item.id === stage.id)) {
      setSelectedStages((prev) => prev.filter((item) => item.id !== stage.id));
    } else {
      setSelectedStages((prev) => [...prev, stage]);
    }
  };

  const handleSelectAllOnPage = () => {
    const allSelected = stages.every((s) =>
      selectedStages.some((r) => r.id === s.id),
    );
    if (allSelected) {
      setSelectedStages((prev) =>
        prev.filter((r) => !stages.some((s) => s.id === r.id)),
      );
    } else {
      setSelectedStages((prev) => {
        const uniqueNew = stages.filter(
          (s) => !prev.some((r) => r.id === s.id),
        );
        return [...prev, ...uniqueNew];
      });
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      fetchStages(newPage);
    }
  };

  const handleSubmitBatch = () => {
    if (onSelectMultiple) {
      onSelectMultiple(selectedStages);
    }
    onClose();
  };

  // Convert the stage type slug to a clean title casing string string (e.g. sales_order -> Sales Order)
  const formatTitle = () => {
    return stageType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white text-slate-800 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[85vh] border border-slate-200 overflow-hidden">
        {/* Header Block Row */}
        <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            Select {formatTitle()} Workflow Target
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition text-xs"
          >
            ✕
          </button>
        </div>

        {/* Filter Input Board */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
          <div className="sm:col-span-3">
            <input
              placeholder="Filter by Stage Name..."
              value={filters.name}
              onChange={(e) => setFilters({ name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && fetchStages(1)}
              className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex gap-1.5 justify-end">
            <Button
              onClick={() => {
                setPage(1);
                fetchStages(1);
              }}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs px-3 py-1.5 rounded flex items-center gap-1 shadow-sm transition"
            >
              <Search className="h-3 w-3" /> Search
            </Button>
            <Button
              onClick={() => {
                setFilters({ name: "" });
                setStages([]);
              }}
              className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1 transition"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
          </div>
        </div>

        {/* Matrix Ledger table grid mapping */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-xs table-fixed">
            <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200 z-10">
              <tr>
                {multiple && (
                  <th className="p-3 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={
                        stages.length > 0 &&
                        stages.every((s) =>
                          selectedStages.some((r) => r.id === s.id),
                        )
                      }
                      onChange={handleSelectAllOnPage}
                      className="rounded border-slate-300 text-emerald-600 h-3.5 w-3.5 cursor-pointer"
                    />
                  </th>
                )}
                <th className="p-3 w-24">Rank No.</th>
                <th className="p-3">Stage Configuration Heading</th>
                <th className="p-3 w-32">Module Context</th>
                {!multiple && <th className="p-3 text-center w-24">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
              {loading ? (
                <tr>
                  <td
                    colSpan={multiple ? 5 : 4}
                    className="p-10 text-center font-sans font-normal text-slate-400 italic"
                  >
                    Retrieving data node metrics arrays...
                  </td>
                </tr>
              ) : stages.length === 0 ? (
                <tr>
                  <td
                    colSpan={multiple ? 5 : 4}
                    className="p-10 text-center font-sans font-normal text-slate-400 italic"
                  >
                    No registry workflows assigned to this parameter.
                  </td>
                </tr>
              ) : (
                stages.map((stage) => {
                  const isChecked = selectedStages.some(
                    (item) => item.id === stage.id,
                  );
                  return (
                    <tr
                      key={stage.id}
                      onClick={() => multiple && handleToggleRow(stage)}
                      className={`hover:bg-slate-50 transition cursor-pointer ${isChecked ? "bg-emerald-50/50" : ""}`}
                    >
                      {multiple && (
                        <td
                          className="p-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleRow(stage)}
                            className="rounded border-slate-300 text-emerald-600 h-3.5 w-3.5 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="p-3 font-bold text-slate-500 tracking-tight">
                        {stage.rank}
                      </td>
                      <td className="p-3 font-sans font-medium text-slate-900">
                        {stage.name}
                      </td>
                      <td className="p-3 font-sans font-normal text-slate-400">
                        {stage.stage_type}
                      </td>
                      {!multiple && (
                        <td
                          className="p-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              onSelect(stage);
                              onClose();
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[10px] font-bold rounded shadow-sm transition"
                          >
                            Select
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Action Controls Footer Panel */}
        <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500 border-t">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {stages.length}
            </span>{" "}
            rows of{" "}
            <span className="font-semibold text-slate-700">{totalRecords}</span>{" "}
            entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="font-sans">
              Page <span className="font-semibold text-slate-700">{page}</span>{" "}
              of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Multi Selection Batch Control Actions Footer */}
        {multiple && (
          <div className="px-6 py-3.5 bg-slate-50 flex items-center justify-between">
            <div className="text-[11px] font-sans font-medium text-slate-500">
              <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded mr-1.5">
                {selectedStages.length} elements selected
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSubmitBatch}
                disabled={selectedStages.length === 0}
                variant="save"
                // className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-1.5 rounded shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Add Selection
              </Button>
              <Button
                onClick={onClose}
                variant="cancel"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* import React, { useState, useEffect } from "react";

interface Stage {
  id: string;
  name: string;
  stage_type: string;
}

interface ModalProps {
  onClose: () => void;
  selectedStages: { id: string; name: string }[];
  onSave: (items: { id: string; name: string }[]) => void;
}

export default function OrderStageLookupModal({
  onClose,
  selectedStages,
  onSave,
}: ModalProps) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [localSelection, setLocalSelection] = useState<string[]>(
    selectedStages.map((s) => s.id),
  );
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Fetch target data mapped filter matching 'sales_order' string types
    fetch(
      `/api/lookup/order-stages?stage_type=sales_order&search=${searchTerm}`,
    )
      .then((res) => res.json())
      .then((data) => setStages(data))
      .catch((err) => console.error(err));
  }, [searchTerm]);

  const toggleSelectAll = () => {
    if (localSelection.length === stages.length) {
      setLocalSelection([]);
    } else {
      setLocalSelection(stages.map((s) => s.id));
    }
  };

  const toggleItem = (id: string) => {
    setLocalSelection((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleAdd = () => {
    const chosenObjects = stages
      .filter((s) => localSelection.includes(s.id))
      .map((s) => ({ id: s.id, name: s.name }));
    onSave(chosenObjects);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          width: "700px",
          borderRadius: "4px",
          overflow: "hidden",
          fontFamily: "sans-serif",
        }}
      >

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 20px",
            borderBottom: "1px solid #eee",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "16px", color: "#333" }}>
            Select Order Stage(s)
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "18px",
              cursor: "pointer",
              color: "#999",
            }}
          >
            ×
          </button>
        </div>


        <div style={{ padding: "15px" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#093009", color: "#fff" }}>
                <th
                  style={{ width: "40px", padding: "8px text-align: center" }}
                >
                  <input
                    type="checkbox"
                    checked={
                      stages.length > 0 &&
                      localSelection.length === stages.length
                    }
                    onChange={toggleSelectAll}
                  />
                </th>
                <th style={{ textAlign: "left", padding: "8px" }}>Name</th>
              </tr>
              <tr style={{ backgroundColor: "#fff" }}>
                <th style={{ padding: "4px", textAlign: "center" }}>
                  <span style={{ fontSize: "14px", color: "#093009" }}>🔍</span>
                </th>
                <th style={{ padding: "4px" }}>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search Order Stage..."
                    style={{
                      width: "100%",
                      padding: "6px",
                      boxSizing: "border-box",
                      border: "1px solid #ccc",
                      borderRadius: "2px",
                    }}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {stages.map((stage) => (
                <tr key={stage.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ textAlign: "center", padding: "8px" }}>
                    <input
                      type="checkbox"
                      checked={localSelection.includes(stage.id)}
                      onChange={() => toggleItem(stage.id)}
                    />
                  </td>
                  <td style={{ padding: "8px", color: "#333" }}>
                    {stage.name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>


          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "15px",
              fontSize: "12px",
              color: "#555",
              borderTop: "1px solid #eee",
              paddingTop: "10px",
            }}
          >
            <div>
              <span style={{ color: "green", fontWeight: "bold" }}>
                {localSelection.length} Selected
              </span>{" "}
              | {stages.length} Total Records
            </div>
            <div>
              <span>Showing 1 to {stages.length} Records &nbsp;</span>
              <select style={{ padding: "2px" }} disabled>
                <option>{stages.length}</option>
              </select>
            </div>
          </div>
        </div>


        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            padding: "12px 20px",
            backgroundColor: "#f9f9f9",
            borderTop: "1px solid #eee",
          }}
        >
          <Button
            onClick={handleAdd}
            style={{
              backgroundColor: "#093009",
              color: "#fff",
              border: "none",
              padding: "6px 16px",
              borderRadius: "3px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Add
          </Button>
          <Button
            onClick={onClose}
            style={{
              backgroundColor: "#fff",
              color: "#333",
              border: "1px solid #ccc",
              padding: "6px 16px",
              borderRadius: "3px",
              cursor: "pointer",
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
} */
