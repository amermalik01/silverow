// app/components/shared/modals/SalespersonLookupModal.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Search, RotateCcw } from "lucide-react";

export interface Employee {
  id: string;
  employee_code: string;
  display_name: string;
  email: string;
  designation?: string;
  employment_type?: string;
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  multiple?: boolean;
  onSelect?: (salesperson: Employee) => void;
  onSelectMultiple?: (salespersons: Employee[]) => void;
}

export default function SalespersonLookupModal({
  open,
  onClose,
  multiple = false,
  onSelect,
  onSelectMultiple,
}: ModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Local Filtering Controls Hooks
  const [searchName, setSearchName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        display_name: searchName,
        email: searchEmail,
        all: "true", // Pull complete database records array matching lookups framework
      }).toString();

      const res = await fetch(`/api/lookups/salespersons?${query}`);
      if (!res.ok) throw new Error("Failed fetching salesperson entities matrix");
      
      const json = await res.json();
      // Handle array extracting whether server wraps payload data explicitly
      setEmployees(Array.isArray(json) ? json : json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchEmployees();
    }
  }, [open, searchName, searchEmail]);

  if (!open) return null;

  const handleToggleRow = (emp: Employee) => {
    if (selectedEmployees.some((item) => item.id === emp.id)) {
      setSelectedEmployees((prev) => prev.filter((item) => item.id !== emp.id));
    } else {
      setSelectedEmployees((prev) => [...prev, emp]);
    }
  };

  const handleSelectAll = () => {
    const isAllSelected = employees.length > 0 && employees.every((e) => selectedEmployees.some((s) => s.id === e.id));
    if (isAllSelected) {
      setSelectedEmployees((prev) => prev.filter((s) => !employees.some((e) => e.id === s.id)));
    } else {
      setSelectedEmployees((prev) => {
        const novel = employees.filter((e) => !prev.some((s) => s.id === e.id));
        return [...prev, ...novel];
      });
    }
  };

  const handleSubmitBatch = () => {
    if (multiple && onSelectMultiple) {
      onSelectMultiple(selectedEmployees);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white text-slate-800 rounded-lg shadow-2xl w-full max-w-4xl flex flex-col max-h-[85vh] border border-slate-200 overflow-hidden font-sans">
        
        {/* Modal Window Top Header Line */}
        <div className="flex justify-between items-center px-5 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="margin-0 text-xs font-bold text-slate-900">Select Salesperson(s) Reference</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition text-lg bg-none border-none cursor-pointer">×</button>
        </div>

        {/* Modal Control Board Filtering Elements */}
        <div className="p-3.5 bg-slate-50/50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Filter by Display Name..."
            className="w-full border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
          />
          <input
            type="text"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            placeholder="Filter by Email Address..."
            className="w-full border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={fetchEmployees} className="bg-[#093009] text-white px-3 py-1.5 rounded font-bold shadow-sm flex items-center gap-1 transition-colors hover:bg-emerald-900">
              <Search className="h-3 w-3" /> Search
            </button>
            <button onClick={() => { setSearchName(""); setSearchEmail(""); }} className="border border-slate-200 bg-white text-slate-600 px-2.5 py-1.5 rounded flex items-center gap-1 hover:bg-slate-50">
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>
        </div>

        {/* Grid Presentation Ledger Sheet */}
        <div className="flex-1 overflow-auto px-2 pb-10">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#093009] text-white font-bold sticky top-0 z-10">
              <tr>
                <th className="p-2.5 w-12 text-center">
                  {multiple && (
                    <input
                      type="checkbox"
                      checked={employees.length > 0 && employees.every((e) => selectedEmployees.some((s) => s.id === e.id))}
                      onChange={handleSelectAll}
                      className="cursor-pointer rounded border-slate-300 text-emerald-700"
                    />
                  )}
                </th>
                <th className="p-2.5">Employee No.</th>
                <th className="p-2.5">Name</th>
                <th className="p-2.5">Email</th>
                <th className="p-2.5">Job Title</th>
                <th className="p-2.5">Employment Type</th>
                {!multiple && <th className="p-2.5 text-center w-24">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px] font-mono text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={multiple ? 6 : 7} className="p-10 text-center font-sans font-normal text-slate-400 italic">
                    Retrieving structural system arrays...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={multiple ? 6 : 7} className="p-10 text-center font-sans font-normal text-slate-400 italic">
                    No matching records found.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const isChecked = selectedEmployees.some((s) => s.id === emp.id);
                  return (
                    <tr 
                      key={emp.id} 
                      onClick={() => multiple && handleToggleRow(emp)}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${isChecked ? "bg-emerald-50/60" : ""}`}
                    >
                      <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={multiple ? isChecked : false}
                          disabled={!multiple}
                          onChange={() => handleToggleRow(emp)}
                          className="disabled:opacity-0 cursor-pointer rounded border-slate-300 text-emerald-700"
                        />
                      </td>
                      <td className="p-2.5 text-slate-500 font-bold">{emp.employee_code}</td>
                      <td className="p-2.5 font-sans font-semibold text-slate-900">{emp.display_name}</td>
                      <td className="p-2.5 text-blue-600 font-sans">{emp.email}</td>
                      <td className="p-2.5 font-sans text-slate-600">{emp.designation || "-"}</td>
                      <td className="p-2.5 font-sans text-slate-500">{emp.employment_type || "-"}</td>
                      {!multiple && (
                        <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              if (onSelect) onSelect(emp);
                              onClose();
                            }}
                            className="bg-emerald-700 text-white font-bold px-2 py-0.5 rounded text-[10px] shadow-sm hover:bg-emerald-800"
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

        {/* Aggregate Control Summary Footer Row */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <div className="font-medium text-slate-500">
            <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded mr-1.5">
              {selectedEmployees.length} Elements Selected
            </span>
            | Total Records Count: {employees.length}
          </div>
          <div className="flex gap-1.5">
            {multiple && (
              <button
                onClick={handleSubmitBatch}
                disabled={selectedEmployees.length === 0}
                className="bg-[#093009] text-white font-bold px-4 py-1.5 rounded shadow-sm disabled:opacity-40 disabled:cursor-not-allowed text-xs transition"
              >
                Add Selection
              </button>
            )}
            <button onClick={onClose} className="border border-slate-200 bg-white text-slate-700 font-semibold px-3 py-1.5 rounded text-xs hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}