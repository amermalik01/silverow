// app/[slug]/reports/fin_cust_list/page.tsx

"use client";

import React, { useState } from "react";
import { ReportHeader } from "@/app/components/reports/ReportHeader";
import { Loader2, Search, FileText, Printer, X, RefreshCw } from "lucide-react";
import CustomerLookupModal, {
  CustomerLookupItem,
} from "@/app/components/shared/modals/CustomerLookupModal";

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

interface CustomerReportGroup {
  id: string;
  customerCode: string;
  name: string;
  status: string;
  addresses: AddressPayload[];
}

export default function LegacyCustomerListing() {
  const [dateAsAt, setDateAsAt] = useState("2026-06-14");
  const [selectedCustomers, setSelectedCustomers] = useState<
    CustomerLookupItem[]
  >([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isProcessing, setIsProcessing] = useState<"pdf" | "xlsx" | null>(null);

  // Legacy Checkbox Criteria Filters Configuration
  const [statusFilters, setStatusFilters] = useState({
    active: true,
    financeCharges: false,
    insuranceCharges: false,
  });

  const [displayFilters, setDisplayFilters] = useState({
    showAddresses: true,
    showOtherLocations: true,
  });

  const [records, setRecords] = useState<CustomerReportGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerateReport = async () => {
    try {
      setIsLoading(true);
      setHasGenerated(true);
      const res = await fetch("/api/reports/customer-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateAsAt,
          customerIds: selectedCustomers.map((c) => c.id),
          statusFilters,
          displayFilters,
          format: "json",
        }),
      });
      if (!res.ok) throw new Error("Failed to retrieve ledger arrays.");
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
      const res = await fetch("/api/reports/customer-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateAsAt,
          customerIds: selectedCustomers.map((c) => c.id),
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
        title="Customer Listing"
        subtitle="Review global corporate registry lines, credit authorization policies, and physical primary contact records"
        onExportPdf={() => handlePrintPDF()}
        onExportExcel={() => console.log("no excel option")}
        isProcessing={isProcessing}
      />

      {/* Legacy Control Filter Panel Bar Wrapper */}
      <div className="bg-[#0f341d] rounded-lg p-5 text-white shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Left Column: Dates & Lookups */}
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
                Select Customer(s)
              </label>
              <div
                onClick={() => setIsModalOpen(true)}
                className="bg-white text-slate-700 px-3 py-1 text-xs rounded flex items-center justify-between cursor-pointer w-full max-w-[320px] min-h-[26px]"
              >
                <span className="truncate max-w-[260px] italic">
                  {selectedCustomers.length === 0
                    ? "All Selected"
                    : selectedCustomers.map((c) => c.name).join("; ")}
                </span>
                <Search className="h-3 w-3 text-slate-400 flex-shrink-0" />
              </div>
            </div>
          </div>

          {/* Center Column: Status Checkbox Rules */}
          <div className="space-y-2 border-l border-white/10 pl-6 h-full flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block mb-1">
              Filter by
            </span>
            <div className="flex flex-wrap gap-4 items-center">
              <label className="flex items-center space-x-1.5 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={statusFilters.active}
                  onChange={(e) =>
                    setStatusFilters({
                      ...statusFilters,
                      active: e.target.checked,
                    })
                  }
                  className="rounded bg-white/20 border-0 text-emerald-700 h-3.5 w-3.5"
                />
                <span>Active</span>
              </label>
              <label className="flex items-center space-x-1.5 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={statusFilters.financeCharges}
                  onChange={(e) =>
                    setStatusFilters({
                      ...statusFilters,
                      financeCharges: e.target.checked,
                    })
                  }
                  className="rounded bg-white/20 border-0 text-emerald-700 h-3.5 w-3.5"
                />
                <span>Finance Charges</span>
              </label>
              <label className="flex items-center space-x-1.5 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={statusFilters.insuranceCharges}
                  onChange={(e) =>
                    setStatusFilters({
                      ...statusFilters,
                      insuranceCharges: e.target.checked,
                    })
                  }
                  className="rounded bg-white/20 border-0 text-emerald-700 h-3.5 w-3.5"
                />
                <span>Insurance Charges</span>
              </label>
            </div>
          </div>

          {/* Right Column: Address Display Visibility Toggles */}
          <div className="space-y-2 border-l border-white/10 pl-6 h-full flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block mb-1">
              Display Configuration
            </span>
            <div className="flex flex-col space-y-1.5">
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

        {/* Filter Bar Action Footer Row Controls */}
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
              setSelectedCustomers([]);
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

      {/* Target Selected Filter Badges Panel */}
      {selectedCustomers.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5 items-center bg-white p-2.5 rounded border border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Targets:
          </span>
          {selectedCustomers.map((c) => (
            <div
              key={c.id}
              className="inline-flex items-center bg-slate-100 text-slate-800 text-[11px] px-2 py-0.5 rounded border font-mono"
            >
              <span>
                {c.customer_code} - {c.name}
              </span>
              <button
                onClick={() =>
                  setSelectedCustomers((prev) =>
                    prev.filter((x) => x.id !== c.id),
                  )
                }
                className="ml-1 text-slate-400 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Report Canvas Print Document View Frame Area */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 min-h-[500px]">
        {!hasGenerated ? (
          <div className="text-center py-20 text-slate-400 italic text-sm">
            Configure report parameters and click Generate Report to build the
            document preview matrix canvas.
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-20 text-slate-400 italic text-sm">
            No matching customer registry profiles correspond to the specified
            filter bounds.
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-8 font-sans text-xs text-slate-800">
            {/* Embedded Corporate Branding Header Component */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  Customer Listing
                </h1>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  As-of Target Evaluation Constraint: {dateAsAt}
                </p>
              </div>
              <div className="text-right">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Hygge Bikes Ltd
                </h2>
                <p className="text-[10px] text-slate-400">
                  System Report Ledger Node
                </p>
              </div>
            </div>

            {/* Rendered Document Loop Blocks */}
            <div className="divide-y divide-slate-200 space-y-6">
              {records.map((customer) => {
                const primaryAddress = customer.addresses.find(
                  (a) => a.isPrimary,
                );
                const supplementaryLocations = customer.addresses.filter(
                  (a) => !a.isPrimary,
                );

                return (
                  <div key={customer.id} className="pt-5 first:pt-0 space-y-3">
                    {/* Header Label Row Block */}
                    <div className="font-bold text-sm text-slate-900 font-mono">
                      ({customer.customerCode || "N/A"}) - {customer.name}
                    </div>

                    {/* Primary Registered Address Frame */}
                    {displayFilters.showAddresses && primaryAddress && (
                      <div className="pl-4 border-l-2 border-emerald-700 space-y-0.5 text-slate-600 font-mono leading-relaxed">
                        <div className="font-bold text-slate-700 text-[11px] font-sans mb-0.5">
                          1 - {primaryAddress.label}
                        </div>
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
                        {primaryAddress.country && (
                          <div>{primaryAddress.country}</div>
                        )}
                      </div>
                    )}

                    {/* Alternate Sub-Locations Address Map Matrix */}
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

      {/* Multi-Select Customer Scoping Lookup Modal Instance Integration */}
      <CustomerLookupModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        multiple={true}
        onSelect={() => {}}
        onSelectMultiple={(customers) => setSelectedCustomers(customers)}
      />
    </div>
  );
}

/* 'use client';

import React, { useState } from 'react';
import { ReportHeader } from "@/app/components/reports/ReportHeader";
import { ReportFilters } from "@/app/components/reports/ReportFilters";
import { Loader2, Search, X } from 'lucide-react';
import CustomerLookupModal, {
  CustomerLookupItem,
} from "@/app/components/shared/modals/CustomerLookupModal";

interface CustomerReportLine {
  id: string;
  customerCode: string;
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  city: string;
  postcode: string;
  creditLimit: number;
  status: string;
}

export default function CustomerListingReport() {
  const [fromDate, setFromDate] = useState('2026-01-01');
  const [toDate, setToDate] = useState('2026-06-14');
  const [selectedCustomers, setSelectedCustomers] = useState<CustomerLookupItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState<'pdf' | 'xlsx' | null>(null);
  const [lines, setLines] = useState<CustomerReportLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerate = async () => {
    try {
      setIsLoading(true);
      setHasGenerated(true);
      const response = await fetch('/api/reports/customer-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromDate,
          toDate,
          customerIds: selectedCustomers.map(c => c.id), // Array boundary filters. Empty array tracks all customers
          format: 'json'
        })
      });

      if (!response.ok) throw new Error('Failed to download ledger customer listings.');
      const data = await response.json();
      setLines(data);
    } catch (err) {
      console.error(err);
      alert("Error compiling data metrics lines.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'xlsx') => {
    if (lines.length === 0) {
      alert("No data lines found. Generate the view frame layout first.");
      return;
    }
    try {
      setIsProcessing(format);
      const response = await fetch('/api/reports/customer-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromDate,
          toDate,
          customerIds: selectedCustomers.map(c => c.id),
          format
        })
      });

      if (!response.ok) throw new Error('File download processing timeout.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      if (format === 'pdf') {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `Customer_Listing_${toDate}.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(null);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const totalCreditLimit = lines.reduce((sum, item) => sum + item.creditLimit, 0);

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 text-slate-800">
      <ReportHeader 
        title="Customer Listing" 
        subtitle="Review global corporate registry lines, credit authorization policies, and physical primary contact records" 
        onExportPdf={() => handleExport('pdf')}
        onExportExcel={() => handleExport('xlsx')}
        isProcessing={isProcessing}
      />

      <ReportFilters
        fromDate={fromDate} setFromDate={setFromDate}
        toDate={toDate} setToDate={setToDate}
        onGenerate={handleGenerate}
        onClear={() => {
          setLines([]);
          setSelectedCustomers([]);
          setHasGenerated(false);
        }}
        showAccountRanges={false}
        showOpeningClosingToggle={false}
      >
    
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-medium text-emerald-300">Select Customer Scope Filter</label>
          <div 
            onClick={() => setIsModalOpen(true)}
            className="h-9 w-full rounded border-0 bg-white/10 px-3 flex items-center justify-between cursor-pointer text-xs text-emerald-100 hover:bg-white/15 ring-1 ring-white/20"
          >
            <span className="truncate">
              {selectedCustomers.length === 0 ? "All Customers (Blank Selection)" : `${selectedCustomers.length} Scoped Customers`}
            </span>
            <Search className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 ml-1" />
          </div>
        </div>
      </ReportFilters>

 
      {selectedCustomers.length > 0 && (
        <div className="mb-6 p-3 bg-white border border-slate-200 rounded-xl flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Target Filters:</span>
          {selectedCustomers.map((cust) => (
            <div key={cust.id} className="inline-flex items-center space-x-1 bg-slate-50 text-slate-700 text-[11px] px-2 py-0.5 rounded-md border border-slate-200 font-medium font-mono">
              <span>{cust.customer_code || 'Unnamed'} - {cust.name}</span>
              <button 
                onClick={() => setSelectedCustomers(prev => prev.filter(item => item.id !== cust.id))} 
                className="text-slate-400 hover:text-slate-600 transition ml-1"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

 
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-20 backdrop-blur-[0.5px]">
            <div className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-semibold">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
              <span>Querying Profile Registry Rows...</span>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold">
                <th className="px-4 py-3 w-28">Code</th>
                <th className="px-4 py-3 w-48">Customer Name</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3 w-28">City</th>
                <th className="px-4 py-3 w-24">Postcode</th>
                <th className="px-4 py-3 w-36">Email</th>
                <th className="px-4 py-3 w-28 text-right">Credit Limit</th>
                <th className="px-4 py-3 w-24 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
              {!hasGenerated ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 font-sans font-normal italic">
                    Configure your data filter rules above and click <strong className="text-emerald-700 font-bold">Generate Report</strong> to inspect records.
                  </td>
                </tr>
              ) : lines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 font-sans font-normal italic">
                    No matching customer directory profiles match selection parameter ranges.
                  </td>
                </tr>
              ) : (
                lines.map((line) => (
                  <tr key={line.id} className="hover:bg-slate-50/60 transition font-normal text-slate-600">
                    <td className="px-4 py-2.5 font-bold text-slate-900">{line.customerCode || '—'}</td>
                    <td className="px-4 py-2.5 font-sans font-medium text-slate-800">{line.name}</td>
                    <td className="px-4 py-2.5 font-sans text-slate-500 truncate max-w-xs" title={line.addressLine1}>{line.addressLine1 || '—'}</td>
                    <td className="px-4 py-2.5 font-sans">{line.city || '—'}</td>
                    <td className="px-4 py-2.5">{line.postcode || '—'}</td>
                    <td className="px-4 py-2.5 font-sans truncate max-w-[150px]">{line.email || '—'}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-900">{formatCurrency(line.creditLimit)}</td>
                    <td className="px-4 py-2.5 text-center font-sans">
                      <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[9px] uppercase border ${
                        line.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {line.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {lines.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold font-sans text-xs text-slate-900">
                  <td colSpan={6} className="px-4 py-3 text-right font-bold uppercase tracking-wider text-slate-500 text-[10px]">Total Credit Exposure Allowed</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-slate-900 bg-slate-100/30 font-bold">{formatCurrency(totalCreditLimit)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
 
      <CustomerLookupModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        multiple={true}
        onSelect={() => {}}
        onSelectMultiple={(customers) => {
          setSelectedCustomers(customers);
        }}
      />
    </div>
  );
} */
