// app/components/parties/tabs/OpportunityCycleTab.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export type Opportunity = {
  id: string;
  opp_no: string;
  name: string;
  approval_process?: string;
  contact_person_1?: string;
  role_1?: string;
  contact_person_2?: string;
  role_2?: string;
  contact_person_3?: string;
  role_3?: string;
  forecast_amount: number;
  currency: string;
  converted_amount?: number;
  frequency?: string;
  created_by?: string;
  probability: number;
  stage_start_date?: string;
  estimated_stage_end_date?: string;
  expected_close_date?: string;
  salesperson?: string;
  support_staff?: string;
  notes?: string;
  stage: "Early Contact" | "Meeting/Present" | "Proposal" | "Account Setup" | "Win/Loss";
  status: "active" | "completed" | "missed";
  created_at: string;
};

const PIPELINE_STAGES = [
  "Early Contact",
  "Meeting/Present",
  "Proposal",
  "Account Setup",
  "Win/Loss",
] as const;

type Props = {
  partyId: string;
  readonly?: boolean;
};

// Helper to format ISO dates to YYYY-MM-DD for date inputs
const formatDateForInput = (dateStr?: string) => {
  if (!dateStr) return "";
  return dateStr.split("T")[0];
};

export default function OpportunityCycleTab({ partyId, readonly = false }: Props) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "detail" | "form">("list");
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Opportunity>>({});

  // 1. Fetch Opportunities from API
  const fetchOpportunities = useCallback(async () => {
    if (!partyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/parties/${partyId}/opportunities`);
      if (!res.ok) throw new Error("Failed to fetch opportunities");
      const data = await res.json();
      setOpportunities(data);
    } catch (err) {
      console.error("Error loading opportunities:", err);
    } finally {
      setLoading(false);
    }
  }, [partyId]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  // Filtered List for Table
  const filteredOpps = opportunities.filter(
    (o) =>
      o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.opp_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Open Form for New Opportunity
  const handleAddNew = () => {
    setFormData({
      opp_no: "Auto-Generated",
      name: "",
      forecast_amount: 0,
      currency: "GBP",
      probability: 10,
      stage: "Early Contact",
      status: "active",
      created_by: "Super Admin",
      stage_start_date: new Date().toISOString().split("T")[0],
    });
    setSelectedOpp(null);
    setViewMode("form");
  };

  // Open Detail View
  const handleSelectOpp = (opp: Opportunity) => {
    setSelectedOpp(opp);
    setFormData({
      ...opp,
      stage_start_date: formatDateForInput(opp.stage_start_date),
      estimated_stage_end_date: formatDateForInput(opp.estimated_stage_end_date),
      expected_close_date: formatDateForInput(opp.expected_close_date),
    });
    setViewMode("detail");
  };

  // Switch to Edit Mode
  const handleEdit = () => {
    setViewMode("form");
  };

  // 2. Save Record (POST or PUT API)
  const handleSave = async () => {
    if (!formData.name || formData.name.trim() === "") {
      alert("Name is required");
      return;
    }

    setSaving(true);
    try {
      if (selectedOpp) {
        // PUT /api/opportunities/[oppId]
        const res = await fetch(`/api/opportunities/${selectedOpp.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!res.ok) throw new Error("Failed to update opportunity");
        const updatedRecord = await res.json();

        setOpportunities((prev) =>
          prev.map((item) => (item.id === selectedOpp.id ? updatedRecord : item))
        );
      } else {
        // POST /api/parties/[partyId]/opportunities
        const res = await fetch(`/api/parties/${partyId}/opportunities`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!res.ok) throw new Error("Failed to create opportunity");
        const newRecord = await res.json();

        setOpportunities((prev) => [newRecord, ...prev]);
      }

      setViewMode("list");
    } catch (err) {
      console.error("Save Opportunity Error:", err);
      alert("Error saving record. Please check server logs.");
    } finally {
      setSaving(false);
    }
  };

  // 3. Complete Stage Action (Updates DB if existing)
  const handleCompleteStage = async () => {
    if (!formData.stage) return;
    const currentIndex = PIPELINE_STAGES.indexOf(formData.stage);
    let nextStage = formData.stage;
    let nextStatus = formData.status || "active";

    if (currentIndex < PIPELINE_STAGES.length - 1) {
      nextStage = PIPELINE_STAGES[currentIndex + 1];
    } else {
      nextStatus = "completed";
    }

    const updatedData = { ...formData, stage: nextStage, status: nextStatus };
    setFormData(updatedData);

    // If editing existing record, update immediately via API
    if (selectedOpp) {
      try {
        const res = await fetch(`/api/opportunities/${selectedOpp.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedData),
        });
        if (res.ok) {
          const updatedRecord = await res.json();
          setSelectedOpp(updatedRecord);
          setOpportunities((prev) =>
            prev.map((item) => (item.id === selectedOpp.id ? updatedRecord : item))
          );
        }
      } catch (err) {
        console.error("Complete Stage API Error:", err);
      }
    }
  };

  // LISTING VIEW
  if (viewMode === "list") {
    return (
      <div className="space-y-4">
        {/* Top Search & Add Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-xs">
            <Icon
              icon="lucide:search"
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {!readonly && (
            <Button
              type="button"
              onClick={handleAddNew}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-sm"
            >
              <Icon icon="lucide:plus" className="w-3.5 h-3.5" />
              <span>Add</span>
            </Button>
          )}
        </div>

        {/* Opportunity Table */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
              <tr>
                <th className="py-3 px-4">Opp. No.</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4 text-right">Forecast Amount</th>
                <th className="py-3 px-4 text-center">Probability</th>
                <th className="py-3 px-4">Expected Date</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4">Creation Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <Icon icon="lucide:loader-2" className="w-5 h-5 animate-spin inline-block mr-2" />
                    Loading opportunities...
                  </td>
                </tr>
              ) : filteredOpps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No opportunity records found.
                  </td>
                </tr>
              ) : (
                filteredOpps.map((opp) => (
                  <tr
                    key={opp.id}
                    onClick={() => handleSelectOpp(opp)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-blue-600 dark:text-blue-400">
                      {opp.opp_no}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {opp.name}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {Number(opp.forecast_amount).toLocaleString("en-GB", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-4 text-center">{opp.probability}%</td>
                    <td className="py-3 px-4 text-slate-500">
                      {formatDateForInput(opp.expected_close_date) || "-"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        {opp.stage}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {formatDateForInput(opp.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // FORM / DETAIL VIEW
  const isFormMode = viewMode === "form";

  return (
    <div className="space-y-6">
      {/* 1. Pipeline Chevron Tracker */}
      <div className="space-y-2">
        <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Active
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Completed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Missed
          </span>
        </div>

        {/* Pipeline Bar */}
        <div className="grid grid-cols-5 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
          {PIPELINE_STAGES.map((stg, idx) => {
            const isActive = formData.stage === stg;
            const currentIdx = PIPELINE_STAGES.indexOf(formData.stage || "Early Contact");
            const isPassed = idx < currentIdx;

            return (
              <div
                key={stg}
                onClick={() => isFormMode && setFormData((prev) => ({ ...prev, stage: stg }))}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-lg transition-all ${
                  isFormMode ? "cursor-pointer" : ""
                } ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : isPassed
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    isActive
                      ? "bg-white text-blue-600 font-bold"
                      : isPassed
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-600"
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="truncate">{stg}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Form Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Left Column */}
        <div className="space-y-3">
          {/* Opp. No. */}
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-slate-500 dark:text-slate-400 font-medium">Opp. No.</label>
            <input
              type="text"
              readOnly
              value={formData.opp_no || "Auto-Generated"}
              className="col-span-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-mono"
            />
          </div>

          {/* Name */}
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-slate-600 dark:text-slate-300 font-medium">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              disabled={!isFormMode}
              value={formData.name || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. 04th Feb Visit"
              className="col-span-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:bg-slate-50 dark:disabled:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Opp. Approval Process */}
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-slate-500 font-medium">Opp. Approval Process</label>
            <select
              disabled={!isFormMode}
              value={formData.approval_process || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, approval_process: e.target.value }))}
              className="col-span-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:bg-slate-50 dark:disabled:bg-slate-800"
            >
              <option value="">Select Opp. Approval Process</option>
              <option value="standard">Standard Approval</option>
              <option value="executive">Executive Approval</option>
            </select>
          </div>

          {/* Contact Person 1 */}
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-slate-500 font-medium">Contact Person 1</label>
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <input
                type="text"
                disabled={!isFormMode}
                value={formData.contact_person_1 || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, contact_person_1: e.target.value }))}
                placeholder="Contact Person 1"
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:bg-slate-50 dark:disabled:bg-slate-800"
              />
              <select
                disabled={!isFormMode}
                value={formData.role_1 || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, role_1: e.target.value }))}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:bg-slate-50 dark:disabled:bg-slate-800"
              >
                <option value="">Select Role 1</option>
                <option value="decision_maker">Decision Maker</option>
                <option value="evaluator">Evaluator</option>
              </select>
            </div>
          </div>

          {/* Contact Person 2 */}
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-slate-500 font-medium">Contact Person 2</label>
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <input
                type="text"
                disabled={!isFormMode}
                value={formData.contact_person_2 || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, contact_person_2: e.target.value }))}
                placeholder="Contact Person 2"
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:bg-slate-50 dark:disabled:bg-slate-800"
              />
              <select
                disabled={!isFormMode}
                value={formData.role_2 || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, role_2: e.target.value }))}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:bg-slate-50 dark:disabled:bg-slate-800"
              >
                <option value="">Select Role 2</option>
                <option value="influencer">Influencer</option>
                <option value="user">End User</option>
              </select>
            </div>
          </div>

          {/* Contact Person 3 */}
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-slate-500 font-medium">Contact Person 3</label>
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <input
                type="text"
                disabled={!isFormMode}
                value={formData.contact_person_3 || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, contact_person_3: e.target.value }))}
                placeholder="Contact Person 3"
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:bg-slate-50 dark:disabled:bg-slate-800"
              />
              <select
                disabled={!isFormMode}
                value={formData.role_3 || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, role_3: e.target.value }))}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:bg-slate-50 dark:disabled:bg-slate-800"
              >
                <option value="">Select Role 3</option>
                <option value="champion">Champion</option>
              </select>
            </div>
          </div>

          {/* Forecast Amount */}
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-slate-600 dark:text-slate-300 font-medium">
              Forecast Amount <span className="text-red-500">*</span>
            </label>
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <input
                type="number"
                disabled={!isFormMode}
                value={formData.forecast_amount || 0}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    forecast_amount: parseFloat(e.target.value) || 0,
                    converted_amount: parseFloat(e.target.value) || 0,
                  }))
                }
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:bg-slate-50 dark:disabled:bg-slate-800 font-mono"
              />
              <select
                disabled={!isFormMode}
                value={formData.currency || "GBP"}
                onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:bg-slate-50 dark:disabled:bg-slate-800"
              >
                <option value="GBP">GBP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="PKR">PKR</option>
              </select>
            </div>
          </div>

          {/* Converted Amount */}
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-slate-500 font-medium">Converted Amount</label>
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={Number(formData.converted_amount || 0).toLocaleString("en-GB", {
                  minimumFractionDigits: 2,
                })}
                className="flex-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-700 dark:text-slate-300"
              />
              <span className="text-xs text-slate-400 font-semibold">{formData.currency || "GBP"}</span>
            </div>
          </div>

          {/* Frequency */}
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-slate-500 font-medium">Frequency</label>
            <select
              disabled={!isFormMode}
              value={formData.frequency || "Monthly"}
              onChange={(e) => setFormData((prev) => ({ ...prev, frequency: e.target.value }))}
              className="col-span-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:bg-slate-50 dark:disabled:bg-slate-800"
            >
              <option value="One-Time">One-Time</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Annually">Annually</option>
            </select>
          </div>

          {/* Created By */}
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-slate-500 font-medium">Created By</label>
            <input
              type="text"
              readOnly
              value={formData.created_by || "Super Admin"}
              className="col-span-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          {/* Probability */}
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-slate-600 dark:text-slate-300 font-medium">
              Probability <span className="text-red-500">*</span>
            </label>
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="number"
                disabled={!isFormMode}
                value={formData.probability || 10}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    probability: parseInt(e.target.value) || 0,
                  }))
                }
                className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:bg-slate-50 dark:disabled:bg-slate-800"
              />
              <span className="text-slate-500">%</span>
            </div>
          </div>

          {/* Stage Start Date */}
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-slate-500 font-medium">Stage Start Date</label>
            <input
              type="date"
              disabled={!isFormMode}
              value={formData.stage_start_date || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, stage_start_date: e.target.value }))}
              className="col-span-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:bg-slate-50 dark:disabled:bg-slate-800"
            />
          </div>

          {/* Estimated Stage End Date */}
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-slate-500 font-medium">Estimated Stage End Date</label>
            <input
              type="date"
              disabled={!isFormMode}
              value={formData.estimated_stage_end_date || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, estimated_stage_end_date: e.target.value }))
              }
              className="col-span-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:bg-slate-50 dark:disabled:bg-slate-800"
            />
          </div>

          {/* Expected Deal Close Date */}
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-slate-500 font-medium">Expected Deal Close Date</label>
            <input
              type="date"
              disabled={!isFormMode}
              value={formData.expected_close_date || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, expected_close_date: e.target.value }))
              }
              className="col-span-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:bg-slate-50 dark:disabled:bg-slate-800"
            />
          </div>

          {/* Salesperson */}
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-slate-500 font-medium">Salesperson</label>
            <input
              type="text"
              disabled={!isFormMode}
              value={formData.salesperson || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, salesperson: e.target.value }))}
              placeholder="Assign Salesperson"
              className="col-span-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:bg-slate-50 dark:disabled:bg-slate-800"
            />
          </div>

          {/* Support Staff */}
          <div className="grid grid-cols-3 items-center gap-2">
            <label className="text-slate-500 font-medium">Support Staff</label>
            <input
              type="text"
              disabled={!isFormMode}
              value={formData.support_staff || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, support_staff: e.target.value }))}
              placeholder="Assign Support Staff"
              className="col-span-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:bg-slate-50 dark:disabled:bg-slate-800"
            />
          </div>

          {/* Opportunity Notes */}
          <div className="grid grid-cols-3 items-start gap-2">
            <label className="text-slate-500 font-medium pt-1.5">Opportunity Notes</label>
            <textarea
              rows={3}
              disabled={!isFormMode}
              value={formData.notes || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Enter notes..."
              className="col-span-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg disabled:bg-slate-50 dark:disabled:bg-slate-800"
            />
          </div>
        </div>
      </div>

      {/* 3. Bottom Action Buttons Bar */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
        {!readonly && (
          <Button
            type="button"
            onClick={handleCompleteStage}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <Icon icon="lucide:check" className="w-3.5 h-3.5" />
            <span>Complete Stage</span>
          </Button>
        )}

        {isFormMode ? (
          <Button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            {saving && <Icon icon="lucide:loader-2" className="w-3 h-3 animate-spin" />}
            <span>Save</span>
          </Button>
        ) : (
          !readonly && (
            <Button
              type="button"
              onClick={handleEdit}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
            >
              Edit
            </Button>
          )
        )}

        <Button
          type="button"
          onClick={() => setViewMode("list")}
          className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}