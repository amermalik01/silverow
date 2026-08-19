// app/components/shared/modals/CRMLookupModal.tsx

"use client";

import { useEffect, useState } from "react";
import { Search, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export type CRMLookupItem = {
  id: string;
  crm_code?: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  postcode?: string;
  country?: string;
  billing_address?: CRMAddress | null;
  shipping_address?: CRMAddress | null;
};

export type CRMAddress = {
  address_type: "billing" | "shipping";
  name?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  phone?: string;
  email?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (crm: CRMLookupItem) => void;
  onSelectMultiple?: (crms: CRMLookupItem[]) => void;
  multiple?: boolean;
};

export default function CRMLookupModal({
  open,
  onClose,
  onSelect,
  onSelectMultiple,
  multiple = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [crms, setCrms] = useState<CRMLookupItem[]>([]);
  const [selectedCRMs, setSelectedCRMs] = useState<CRMLookupItem[]>([]);

  const [filters, setFilters] = useState({
    crm_code: "",
    name: "",
    city: "",
    postcode: "",
    email: "",
  });

  const fetchCRMs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.crm_code) params.append("crm_code", filters.crm_code);
      if (filters.name) params.append("name", filters.name);
      if (filters.city) params.append("city", filters.city);
      if (filters.postcode) params.append("postcode", filters.postcode);
      if (filters.email) params.append("email", filters.email);

      const res = await fetch(`/api/sales/crm/leads?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load CRM records");

      const json = await res.json();
      setCrms(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCRMs();
      setSelectedCRMs([]); // Reset selection state tracking buffer
    }
  }, [open]);

  const handleToggleRow = (crm: CRMLookupItem) => {
    if (selectedCRMs.some((item) => item.id === crm.id)) {
      setSelectedCRMs((prev) => prev.filter((item) => item.id !== crm.id));
    } else {
      setSelectedCRMs((prev) => [...prev, crm]);
    }
  };

  const handleSelectAllOnPage = () => {
    const allSelected = crms.every((c) =>
      selectedCRMs.some((r) => r.id === c.id),
    );
    if (allSelected) {
      setSelectedCRMs((prev) =>
        prev.filter((r) => !crms.some((c) => c.id === r.id)),
      );
    } else {
      setSelectedCRMs((prev) => {
        const uniqueNew = crms.filter((c) => !prev.some((r) => r.id === c.id));
        return [...prev, ...uniqueNew];
      });
    }
  };

  const handleSubmitBatch = () => {
    if (onSelectMultiple) {
      onSelectMultiple(selectedCRMs);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white text-slate-800 rounded-xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[85vh] border border-slate-200 overflow-hidden">
        {/* Header Block Row */}
        <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            Select CRM Scope Target
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition text-xs"
          >
            ✕
          </button>
        </div>

        {/* Filter Input Board */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-5 gap-2">
          <input
            placeholder="CRM Code"
            value={filters.crm_code}
            onChange={(e) =>
              setFilters({ ...filters, crm_code: e.target.value })
            }
            className="border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <input
            placeholder="CRM Name"
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            className="border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <input
            placeholder="City"
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            className="border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <input
            placeholder="Postcode"
            value={filters.postcode}
            onChange={(e) =>
              setFilters({ ...filters, postcode: e.target.value })
            }
            className="border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <input
            placeholder="Email"
            value={filters.email}
            onChange={(e) => setFilters({ ...filters, email: e.target.value })}
            className="border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Action Board */}
        <div className="flex justify-end gap-2 px-4 py-2 bg-slate-100/60 border-b border-slate-200">
          <Button
            onClick={fetchCRMs}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs px-4 py-1.5 rounded flex items-center gap-1 shadow-sm transition"
          >
            <Search className="h-3 w-3" /> Search
          </Button>
          <Button
            onClick={() => {
              setFilters({
                crm_code: "",
                name: "",
                city: "",
                postcode: "",
                email: "",
              });
              setCrms([]);
            }}
            className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 transition"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </Button>
        </div>

        {/* Matrix Ledger view panel */}
        <div className="flex-1 overflow-auto px-2 pb-10">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200 z-10">
              <tr>
                {multiple && (
                  <th className="p-3 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={
                        crms.length > 0 &&
                        crms.every((c) =>
                          selectedCRMs.some((r) => r.id === c.id),
                        )
                      }
                      onChange={handleSelectAllOnPage}
                      className="rounded border-slate-300 text-emerald-600 h-3.5 w-3.5 cursor-pointer"
                    />
                  </th>
                )}
                <th className="p-3 w-28">Code</th>
                <th className="p-3">CRM Name</th>
                <th className="p-3 w-44">Email</th>
                <th className="p-3 w-32">Phone</th>
                <th className="p-3 w-28">City</th>
                <th className="p-3 w-24">Postcode</th>
                {!multiple && <th className="p-3 text-center w-24">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
              {loading ? (
                <tr>
                  <td
                    colSpan={multiple ? 8 : 7}
                    className="p-10 text-center font-sans font-normal text-slate-400 italic"
                  >
                    Retrieving CRM registries...
                  </td>
                </tr>
              ) : crms.length === 0 ? (
                <tr>
                  <td
                    colSpan={multiple ? 8 : 7}
                    className="p-10 text-center font-sans font-normal text-slate-400 italic"
                  >
                    No active CRM entries match defined filter constraints.
                  </td>
                </tr>
              ) : (
                crms.map((crm) => {
                  const isChecked = selectedCRMs.some(
                    (item) => item.id === crm.id,
                  );
                  return (
                    <tr
                      key={crm.id}
                      onClick={() => multiple && handleToggleRow(crm)}
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
                            onChange={() => handleToggleRow(crm)}
                            className="rounded border-slate-300 text-emerald-600 h-3.5 w-3.5 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="p-3 font-bold text-slate-900 tracking-tight">
                        {crm.crm_code || "—"}
                      </td>
                      <td className="p-3 font-sans font-medium text-slate-800">
                        {crm.name}
                      </td>
                      <td className="p-3 truncate max-w-[170px] font-sans font-normal">
                        {crm.email || "—"}
                      </td>
                      <td className="p-3">{crm.phone || "—"}</td>
                      <td className="p-3 font-sans font-normal">
                        {crm.city || "—"}
                      </td>
                      <td className="p-3">{crm.postcode || "—"}</td>
                      {!multiple && (
                        <td
                          className="p-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            onClick={() => {
                              onSelect(crm);
                              onClose();
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[10px] font-bold rounded shadow-sm transition"
                          >
                            Select
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Multi Selection Batch Control Actions Footer */}
        {multiple && (
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-[11px] font-sans font-medium text-slate-500">
              <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded mr-1.5">
                {selectedCRMs.length} selected
              </span>
              across target report payload array profiles
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSubmitBatch}
                disabled={selectedCRMs.length === 0}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-1.5 rounded shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Add Selection
              </Button>
              <Button
                onClick={onClose}
                className="border border-slate-200 bg-white hover:bg-slate-50 font-medium text-xs px-3 py-1.5 rounded transition"
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
