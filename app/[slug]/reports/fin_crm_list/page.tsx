// app/[slug]/reports/fin_crm_list/page.tsx

"use client";

import React, { useState } from "react";
import { ReportHeader } from "@/app/components/reports/ReportHeader";
import { Loader2, Search, Printer, X } from "lucide-react";
import CRMLookupModal, {
  CRMLookupItem,
} from "@/app/components/shared/modals/CRMLookupModal";

interface AddressPayload {
  id: string;
  label: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  country: string;
  postcode: string;
  isPrimary: boolean;
}

interface CRMReportGroup {
  id: string;
  crmCode: string;
  name: string;
  status: string;
  addresses: AddressPayload[];
}

export default function LegacyCRMListing() {
  const [dateAsAt, setDateAsAt] = useState("2026-06-14");
  const [selectedCRMs, setSelectedCRMs] = useState<CRMLookupItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isProcessing, setIsProcessing] = useState<"pdf" | "xlsx" | null>(null);

  // Legacy Checkbox Criteria Filters matching CRM configuration
  const [statusFilters, setStatusFilters] = useState({
    active: true,
  });

  const [displayFilters, setDisplayFilters] = useState({
    showAddresses: true,
    showOtherLocations: false,
  });

  const [records, setRecords] = useState<CRMReportGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerateReport = async () => {
    try {
      setIsLoading(true);
      setHasGenerated(true);
      const res = await fetch("/api/reports/crm-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateAsAt,
          crmIds: selectedCRMs.map((c) => c.id),
          statusFilters,
          displayFilters,
          format: "json",
        }),
      });
      if (!res.ok) throw new Error("Failed to retrieve CRM record logs.");
      const data = await res.json();
      setRecords(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintPDF = async () => {
    try {
      setIsPrinting(true);
      setIsProcessing("pdf");
      const res = await fetch("/api/reports/crm-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateAsAt,
          crmIds: selectedCRMs.map((c) => c.id),
          statusFilters,
          displayFilters,
          format: "pdf",
        }),
      });
      if (!res.ok) throw new Error("PDF render failure.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      console.error(err);
    } finally {
      setIsPrinting(false);
      setIsProcessing(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 text-slate-800">
      <ReportHeader
        title="CRM Listing"
        subtitle="Review global corporate registry lines, credit authorization policies, and physical primary contact records"
        onExportPdf={() => handlePrintPDF()}
        onExportExcel={() => console.log("no excel option")}
        isProcessing={isProcessing}
      />

      {/* Dark Control Filter Dashboard Panel */}
      <div className="bg-[#0f341d] rounded-lg p-5 text-white shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Left Column: Constraints & Target Entities Selection */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold w-24 text-slate-200">
                Date as at <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={dateAsAt}
                onChange={(e) => setDateAsAt(e.target.value)}
                className="bg-white text-slate-900 px-2 py-1 text-xs rounded border-0 focus:outline-none w-full max-w-[180px]"
              />
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold w-24 text-slate-200">
                Select CRM(s)
              </label>
              <div
                onClick={() => setIsModalOpen(true)}
                className="bg-white text-slate-700 px-3 py-1 text-xs rounded flex items-center justify-between cursor-pointer w-full max-w-[320px] min-h-[26px]"
              >
                <span className="truncate max-w-[260px] italic">
                  {selectedCRMs.length === 0
                    ? "All Selected"
                    : selectedCRMs.map((c) => c.name).join("; ")}
                </span>
                <Search className="h-3 w-3 text-slate-400 flex-shrink-0" />
              </div>
            </div>
          </div>

          {/* Center Column: Status Checkbox Rules */}
          <div className="space-y-2 border-l border-white/10 pl-6 h-full flex flex-col justify-center">
            <span className="text-[10px] capitalize font-bold text-emerald-400 tracking-wider block mb-1">
              Filter by
            </span>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-1.5 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={statusFilters.active}
                  onChange={(e) =>
                    setStatusFilters({ active: e.target.checked })
                  }
                  className="rounded bg-white/20 border-0 text-emerald-700 h-3.5 w-3.5"
                />
                <span>Active</span>
              </label>
            </div>
          </div>

          {/* Right Column: Address Sub-Matrix Display Controls */}
          <div className="space-y-2 border-l border-white/10 pl-6 h-full flex flex-col justify-center">
            <span className="text-[10px] capitalize font-bold text-emerald-400 tracking-wider block mb-1">
              Display Options
            </span>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-1.5 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={displayFilters.showAddresses}
                  onChange={(e) =>
                    setDisplayFilters({
                      ...displayFilters,
                      showAddresses: e.target.checked,
                    })
                  }
                  className="rounded bg-white/20 border-0 text-emerald-700 h-3.5 w-3.5"
                />
                <span>Show Addresses</span>
              </label>
              <label className="flex items-center space-x-1.5 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={displayFilters.showOtherLocations}
                  onChange={(e) =>
                    setDisplayFilters({
                      ...displayFilters,
                      showOtherLocations: e.target.checked,
                    })
                  }
                  className="rounded bg-white/20 border-0 text-emerald-700 h-3.5 w-3.5"
                />
                <span>Show Other Locations</span>
              </label>
            </div>
          </div>
        </div>

        {/* Dynamic Parameter Trigger Actions Footer Block */}
        <div className="mt-5 pt-4 border-t border-white/10 flex justify-end items-center space-x-2">
          <button
            onClick={handleGenerateReport}
            disabled={isLoading}
            className="bg-[#218838] hover:bg-[#1e7e34] font-medium text-xs px-4 py-1.5 rounded transition shadow-sm flex items-center space-x-1"
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            <span>Generate Report</span>
          </button>
          <button
            onClick={() => {
              setRecords([]);
              setSelectedCRMs([]);
              setHasGenerated(false);
            }}
            className="bg-[#6c757d] hover:bg-[#5a6268] font-medium text-xs px-3 py-1.5 rounded transition"
          >
            Clear Filter
          </button>
          <button
            onClick={handlePrintPDF}
            disabled={records.length === 0 || isPrinting}
            className="bg-[#17a2b8] hover:bg-[#138496] font-medium text-xs px-3 py-1.5 rounded transition flex items-center space-x-1 disabled:opacity-40"
          >
            {isPrinting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Printer className="h-3 w-3" />
            )}
            <span>Print Preview</span>
          </button>
        </div>
      </div>

      {/* Selected Scoped Item Badge Container */}
      {selectedCRMs.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5 items-center bg-white p-2.5 rounded border border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 capitalize tracking-wider mr-1">
            Targets:
          </span>
          {selectedCRMs.map((c) => (
            <div
              key={c.id}
              className="inline-flex items-center bg-slate-100 text-slate-800 text-[11px] px-2 py-0.5 rounded border font-mono"
            >
              <span>
                {c.crm_code} - {c.name}
              </span>
              <button
                onClick={() =>
                  setSelectedCRMs((prev) => prev.filter((x) => x.id !== c.id))
                }
                className="ml-1 text-slate-400 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Structured Print Layout Canvas Panel View Window */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 min-h-[500px]">
        {!hasGenerated ? (
          <div className="text-center py-20 text-slate-400 italic text-xs">
            Configure report parameters and click Generate Report to build the
            document preview matrix canvas.
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-20 text-slate-400 italic text-xs">
            No matching CRM entries match the specified query definitions.
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-8 font-sans text-xs text-slate-800">
            {/* Embedded Corporate Branding Header Component */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  CRM Listing
                </h1>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  As-of Target Evaluation Constraint: {dateAsAt}
                </p>
              </div>
              <div className="text-right">
                <h2 className="text-xs font-bold capitalize tracking-wider text-slate-900">
                  Hygge Bikes Ltd
                </h2>
                <p className="text-[10px] text-slate-400">
                  System Report Ledger Node
                </p>
              </div>
            </div>

            {/* Rendered Document Loop Blocks matching image_6272e5.png perfectly */}
            <div className="divide-y divide-slate-200 space-y-6">
              {records.map((crm) => {
                const primaryAddress = crm.addresses.find((a) => a.isPrimary);
                const supplementaryLocations = crm.addresses.filter(
                  (a) => !a.isPrimary,
                );

                return (
                  <div key={crm.id} className="pt-5 first:pt-0 space-y-3">
                    {/* Header Entity Tag Label Row Block */}
                    <div className="font-bold text-xs text-slate-900 font-mono">
                      ({crm.crmCode || "N/A"}) - {crm.name}
                    </div>

                    {/* Primary Registered Address Frame */}
                    {displayFilters.showAddresses && primaryAddress && (
                      <div className="pl-4 border-l-2 border-emerald-700 space-y-0.5 text-slate-600 font-mono leading-relaxed">
                        <div>{primaryAddress.address1}</div>
                        {primaryAddress.address2 && (
                          <div>{primaryAddress.address2}</div>
                        )}
                        <div>
                          {primaryAddress.city}
                          {primaryAddress.postcode
                            ? `, ${primaryAddress.postcode}`
                            : ""}
                        </div>
                        {primaryAddress.state && (
                          <div>{primaryAddress.state}</div>
                        )}
                        {primaryAddress.country && (
                          <div>{primaryAddress.country}</div>
                        )}
                      </div>
                    )}

                    {/* Supplementary Address Map Matrix Grid Block Row */}
                    {displayFilters.showOtherLocations &&
                      supplementaryLocations.length > 0 && (
                        <div className="pl-4 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {supplementaryLocations.map((loc, idx) => (
                            <div
                              key={loc.id}
                              className="bg-slate-50 border border-slate-200 rounded p-2.5 space-y-0.5 font-mono text-[11px] text-slate-600"
                            >
                              <div className="font-bold text-slate-800 text-xs font-sans mb-1">
                                {idx + 2} - {loc.label}
                              </div>
                              <div>{loc.address1}</div>
                              {loc.address2 && <div>{loc.address2}</div>}
                              <div>
                                {loc.city}
                                {loc.postcode ? `, ${loc.postcode}` : ""}
                              </div>
                              {loc.country && <div>{loc.country}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Multi-Select CRM Scoping Lookup Modal Instance Integration */}
      <CRMLookupModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        multiple={true}
        onSelect={() => {}}
        onSelectMultiple={(crms) => setSelectedCRMs(crms)}
      />
    </div>
  );
}
