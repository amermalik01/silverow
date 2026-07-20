// components/reports/ReportFilters.tsx

'use client';

import React from 'react';
import { SlidersHorizontal } from 'lucide-react';

export interface AccountOption {
  id: string;
  code: string;
  name: string;
}

interface ReportFiltersProps {
  fromDate: string;
  setFromDate: (date: string) => void;
  toDate: string;
  setToDate: (date: string) => void;
  fromAccount?: string;
  setFromAccount?: (id: string) => void;
  toAccount?: string;
  setToAccount?: (id: string) => void;
  showBalances?: boolean;
  setShowBalances?: (show: boolean) => void;
  accountsList?: AccountOption[];
  onGenerate: () => void;
  onClear: () => void;
  children?: React.ReactNode;
  
  // --- NEW FEATURE FLAGS ---
  showAccountRanges?: boolean;       // Control the G/L Code inputs
  showOpeningClosingToggle?: boolean; // Control the Trial Balance checkbox
  hideFromDate?: boolean;             // Balance Sheets only need a target cutoff date
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  fromDate, setFromDate,
  toDate, setToDate,
  fromAccount = '', setFromAccount,
  toAccount = '', setToAccount,
  showBalances = false, setShowBalances,
  accountsList = [],
  onGenerate,
  onClear,
  children,
  showAccountRanges = false,
  showOpeningClosingToggle = false,
  hideFromDate = false
}) => {
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-emerald-950 p-4 text-white shadow-sm">
      <div className="flex items-center space-x-2 border-b border-emerald-800/60 pb-2.5 mb-4">
        <SlidersHorizontal className="h-4 w-4 text-emerald-400" />
        <h2 className="text-xs font-semibold tracking-wide">Report Parameters</h2>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 items-end">
          
          {/* Date From (Hidden on Balance Sheets) */}
          {!hideFromDate && (
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medium text-emerald-300">Date From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 w-full rounded border-0 bg-white/10 px-3 text-xs text-white outline-none ring-1 ring-white/20 transition focus:bg-white focus:text-slate-900 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Date To / As Of Cutoff */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medium text-emerald-300">
              {hideFromDate ? 'As Of Date' : 'Date To'}
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 w-full rounded border-0 bg-white/10 px-3 text-xs text-white outline-none ring-1 ring-white/20 transition focus:bg-white focus:text-slate-900 focus:ring-emerald-500"
            />
          </div>

          {/* G/L From Dropdown (Shown only if flagged true) */}
          {showAccountRanges && setFromAccount && (
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medium text-emerald-300">G/L Account From</label>
              <select
                value={fromAccount}
                onChange={(e) => setFromAccount(e.target.value)}
                className="h-9 w-full rounded border-0 bg-white/10 px-2 text-xs text-white outline-none ring-1 ring-white/20 transition focus:bg-white focus:text-slate-900 focus:ring-emerald-500"
              >
                <option value="" className="text-slate-900">-- Start of Ledger --</option>
                {accountsList.map((acc) => (
                  <option key={acc.id} value={acc.code} className="text-slate-900">
                    {acc.code} - {acc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* G/L To Dropdown (Shown only if flagged true) */}
          {showAccountRanges && setToAccount && (
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medium text-emerald-300">G/L Account To</label>
              <select
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
                className="h-9 w-full rounded border-0 bg-white/10 px-2 text-xs text-white outline-none ring-1 ring-white/20 transition focus:bg-white focus:text-slate-900 focus:ring-emerald-500"
              >
                <option value="" className="text-slate-900">-- End of Ledger --</option>
                {accountsList.map((acc) => (
                  <option key={acc.id} value={acc.code} className="text-slate-900">
                    {acc.code} - {acc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Report Specific Custom Toggles (e.g. % of turnover check or formatting depths) */}
          {children}
        </div>

        {/* Lower Row for Dynamic Toggles & Trigger Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-2 border-t border-emerald-800/40 gap-4">
          <div>
            {showOpeningClosingToggle && setShowBalances && (
              <label className="flex items-center space-x-2.5 cursor-pointer select-none text-xs text-emerald-200 hover:text-white transition">
                <input
                  type="checkbox"
                  checked={showBalances}
                  onChange={(e) => setShowBalances(e.target.checked)}
                  className="h-4 w-4 rounded border-emerald-700 bg-white/10 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium">✓ Show Opening & Closing Balance</span>
              </label>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={onGenerate}
              className="h-9 px-5 rounded bg-emerald-600 text-xs font-semibold text-white shadow transition hover:bg-emerald-500 active:bg-emerald-700"
            >
              Generate Report
            </button>
            <button
              onClick={onClear}
              className="h-9 rounded bg-white/10 px-3 text-xs font-medium text-emerald-200 transition hover:bg-white/20 hover:text-white"
            >
              Clear Filter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
/* "use client";

import React from "react";
import { SlidersHorizontal } from "lucide-react";

export interface AccountOption {
  id: string;
  code: string;
  name: string;
}

interface ReportFiltersProps {
  fromDate: string;
  setFromDate: (date: string) => void;
  toDate: string;
  setToDate: (date: string) => void;
  fromAccount: string;
  setFromAccount: (id: string) => void;
  toAccount: string;
  setToAccount: (id: string) => void;
  showBalances: boolean;
  setShowBalances: (show: boolean) => void;
  accountsList: AccountOption[];
  onGenerate: () => void;
  onClear: () => void;
  children?: React.ReactNode; // For report-specific toggles (e.g., View Type)
}


export const ReportFilters: React.FC<ReportFiltersProps> = ({
  fromDate, setFromDate,
  toDate, setToDate,
  fromAccount, setFromAccount,
  toAccount, setToAccount,
  showBalances,       // <-- UNPACK NEW PROP
  setShowBalances,   // <-- UNPACK NEW PROP
  accountsList,
  onGenerate,
  onClear,
  children
}) => {
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-emerald-950 p-4 text-white shadow-sm">
      <div className="flex items-center space-x-2 border-b border-emerald-800/60 pb-2.5 mb-4">
        <SlidersHorizontal className="h-4 w-4 text-emerald-400" />
        <h2 className="text-xs font-semibold tracking-wide">Report Parameters</h2>
      </div>


      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 items-end">

          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medium text-emerald-300">Date From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 w-full rounded border-0 bg-white/10 px-3 text-xs text-white outline-none ring-1 ring-white/20 transition focus:bg-white focus:text-slate-900 focus:ring-emerald-500"
            />
          </div>


          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medium text-emerald-300">Date To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 w-full rounded border-0 bg-white/10 px-3 text-xs text-white outline-none ring-1 ring-white/20 transition focus:bg-white focus:text-slate-900 focus:ring-emerald-500"
            />
          </div>


          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medium text-emerald-300">G/L Account From</label>
            <select
              value={fromAccount}
              onChange={(e) => setFromAccount(e.target.value)}
              className="h-9 w-full rounded border-0 bg-white/10 px-2 text-xs text-white outline-none ring-1 ring-white/20 transition focus:bg-white focus:text-slate-900 focus:ring-emerald-500"
            >
              <option value="" className="text-slate-900">-- Start of Ledger --</option>
              {accountsList.map((acc) => (
                <option key={acc.id} value={acc.code} className="text-slate-900">
                  {acc.code} - {acc.name}
                </option>
              ))}
            </select>
          </div>


          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medium text-emerald-300">G/L Account To</label>
            <select
              value={toAccount}
              onChange={(e) => setToAccount(e.target.value)}
              className="h-9 w-full rounded border-0 bg-white/10 px-2 text-xs text-white outline-none ring-1 ring-white/20 transition focus:bg-white focus:text-slate-900 focus:ring-emerald-500"
            >
              <option value="" className="text-slate-900">-- End of Ledger --</option>
              {accountsList.map((acc) => (
                <option key={acc.id} value={acc.code} className="text-slate-900">
                  {acc.code} - {acc.name}
                </option>
              ))}
            </select>
          </div>


          {children}
        </div>


        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-2 border-t border-emerald-800/40 gap-4">
          

          <label className="flex items-center space-x-2.5 cursor-pointer select-none text-xs text-emerald-200 hover:text-white transition">
            <input
              type="checkbox"
              checked={showBalances}
              onChange={(e) => setShowBalances(e.target.checked)}
              className="h-4 w-4 rounded border-emerald-700 bg-white/10 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-emerald-950"
            />
            <span className="font-medium">✓ Show Opening & Closing Balance</span>
          </label>


          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={onGenerate}
              className="h-9 px-5 rounded bg-emerald-600 text-xs font-semibold text-white shadow transition hover:bg-emerald-500 active:bg-emerald-700"
            >
              Generate Report
            </button>
            <button
              onClick={onClear}
              className="h-9 rounded bg-white/10 px-3 text-xs font-medium text-emerald-200 transition hover:bg-white/20 hover:text-white"
            >
              Clear Filter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
 */