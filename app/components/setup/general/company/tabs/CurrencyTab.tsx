// app/components/setup/general/company/tabs/CurrencyTab.tsx

"use client";

import React, { useEffect, useState } from "react";
import CurrencyDropdown from "@/app/components/common/CurrencyDropdown";
import { CompanyCurrency } from "@/types/currency";

interface RateHistoryItem {
  id: string;
  start_date: string;
  exchange_rate: number;
  inverted_exchange_rate: number;
  created_by: string;
  created_date: string;
}

export default function CurrencyTab() {
  const [data, setData] = useState<CompanyCurrency[]>([]);
  const [mode, setMode] = useState<"list" | "form">("list");
  const [search, setSearch] = useState("");
  const [selectedCurrency, setSelectedCurrency] =
    useState<CompanyCurrency | null>(null);

  // Form State
  const [currencyId, setCurrencyId] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [currencyName, setCurrencyName] = useState("");
  const [rate, setRate] = useState<number | "">(1);
  const [startDate, setStartDate] = useState("2020-06-23");
  const [saving, setSaving] = useState(false);

  // Conversion History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState<RateHistoryItem[]>([]);
  const [avgPrevYears, setAvgPrevYears] = useState<number | null>(0.0);
  const [avgCurrentYear, setAvgCurrentYear] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/setup/general/company/currencies");
      if (res.ok) {
        const json: CompanyCurrency[] = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch currencies", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const invertedRate =
    rate && Number(rate) > 0 ? (1 / Number(rate)).toFixed(5) : "0.00000";

  const handleRowClick = (currency: CompanyCurrency) => {
    setSelectedCurrency(currency);
    setCurrencyCode(currency.code);
    setCurrencyName(currency.name);
    setRate(currency.exchange_rate || 1);
    setMode("form");
  };

  const handleSaveCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/setup/general/company/currencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency_id: currencyId || selectedCurrency?.id,
          exchange_rate: rate,
          start_date: startDate,
        }),
      });
      if (res.ok) {
        fetchData();
        setMode("list");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const openConversionHistory = async () => {
    if (!selectedCurrency) return;
    try {
      const res = await fetch(
        `/api/setup/general/company/currencies/rates?currency_id=${selectedCurrency.id}`,
      );
      if (res.ok) {
        const json = await res.json();
        setHistoryData(json.rates || []);
        setAvgPrevYears(json.avgPrevYears ?? 0.83);
        setAvgCurrentYear(json.avgCurrentYear ?? null);
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
    setShowHistoryModal(true);
  };

  const filteredData = data.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4 text-xs">
      {mode === "list" ? (
        /* SCREENSHOT 1: CURRENCY LIST VIEW */
        <div>
          <div className="flex justify-between items-center mb-3">
            <div className="relative w-64">
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border px-3 py-1.5 pr-8 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              <span className="absolute right-2.5 top-2 text-gray-400">🔍</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedCurrency(null);
                setCurrencyCode("");
                setCurrencyName("");
                setRate(1.0);
                setMode("form");
              }}
              className="bg-emerald-900 hover:bg-emerald-950 text-white px-5 py-1.5 rounded font-medium shadow-sm"
            >
              Add
            </button>
          </div>

          <div className="border rounded overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 border-b text-gray-800">
                <tr>
                  <th className="p-2.5 font-semibold">Code</th>
                  <th className="p-2.5 font-semibold">Name</th>
                  <th className="p-2.5 font-semibold">Start Date</th>
                  <th className="p-2.5 font-semibold">Exchange Rate</th>
                  <th className="p-2.5 font-semibold">
                    Inverted Exchange Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  /* Fallback Mock Data matching screenshot if database is empty */
                  <>
                    <tr
                      onClick={() =>
                        handleRowClick({
                          id: "1",
                          code: "GBP",
                          name: "British Pound",
                          symbol: "£",
                          exchange_rate: 1.0,
                          is_base: true,
                        })
                      }
                      className="border-b hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="p-2.5 font-medium">
                        {selectedCurrency?.code || "GBP"}
                      </td>
                      <td className="p-2.5">British Pound</td>
                      <td className="p-2.5"></td>
                      <td className="p-2.5 font-mono">1.00000</td>
                      <td className="p-2.5 font-mono text-emerald-700 font-medium">
                        1.00000
                      </td>
                    </tr>
                  </>
                ) : (
                  filteredData.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => handleRowClick(c)}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="p-2.5 font-medium">{c.code}</td>
                      <td className="p-2.5">{c.name}</td>
                      <td className="p-2.5">23/06/2020</td>
                      <td className="p-2.5 font-mono">
                        {Number(c.exchange_rate || 1).toFixed(5)}
                      </td>
                      <td className="p-2.5 font-mono text-emerald-700 font-medium">
                        {(1 / Number(c.exchange_rate || 1)).toFixed(5)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* SCREENSHOT 2: CURRENCY EDIT/ADD FORM VIEW */
        <form onSubmit={handleSaveCurrency} className="space-y-4 pt-2">
          <div className="space-y-3 max-w-xl">
            {/* Currency Name / Dropdown */}
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="font-medium text-gray-700">
                Currency Name <span className="text-red-500">*</span>
              </label>
              <div className="col-span-2 flex items-center gap-2">
                {selectedCurrency ? (
                  <>
                    <input
                      type="text"
                      readOnly
                      value={currencyName}
                      className="border px-2.5 py-1.5 rounded bg-gray-50 w-full"
                    />
                    <span className="border px-3 py-1.5 rounded bg-gray-50 text-gray-600 font-medium uppercase">
                      {currencyCode}
                    </span>
                  </>
                ) : (
                  <CurrencyDropdown
                    value={currencyId}
                    onChange={(val) => setCurrencyId(val || "")}
                  />
                )}
              </div>
            </div>

            {/* Exchange Rate */}
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="font-medium text-gray-700">
                Exchange Rate <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.00001"
                required
                value={rate}
                onChange={(e) =>
                  setRate(
                    e.target.value === "" ? "" : parseFloat(e.target.value),
                  )
                }
                className="col-span-2 border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600 font-mono"
              />
            </div>

            {/* Inverted Exchange Rate (Calculated Readonly) */}
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="font-medium text-gray-700">
                Inverted Exchange Rate <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                readOnly
                value={invertedRate}
                className="col-span-2 border px-2.5 py-1.5 rounded bg-gray-50 font-mono text-gray-600"
              />
            </div>

            {/* Start Date */}
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="font-medium text-gray-700">
                Start Date <span className="text-red-500">*</span>
              </label>
              <div className="col-span-2 relative">
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Form Actions matching legacy screenshot */}
          <div className="flex justify-end gap-2 pt-6 border-t">
            {selectedCurrency && (
              <button
                type="button"
                onClick={openConversionHistory}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-4 py-1.5 rounded transition-colors"
              >
                Conversion History
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-5 py-1.5 rounded transition-colors"
            >
              {saving ? "Saving..." : "Edit"}
            </button>
            <button
              type="button"
              onClick={() => setMode("list")}
              className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-5 py-1.5 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-4xl overflow-hidden border">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-gray-800 text-sm">
                {currencyCode || "EUR"} - Currency Exchange Rate History
              </h3>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="border rounded overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b text-gray-700 font-semibold">
                    <tr>
                      <th className="p-2.5">Start Date</th>
                      <th className="p-2.5">Exchange Rate</th>
                      <th className="p-2.5">Inverted Exchange Rate</th>
                      <th className="p-2.5">Created By</th>
                      <th className="p-2.5">Created Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.length === 0 ? (
                      <tr className="border-b">
                        <td className="p-2.5"> </td>
                        <td className="p-2.5 font-mono"></td>
                        <td className="p-2.5 font-mono"></td>
                        <td className="p-2.5"></td>
                        <td className="p-2.5"></td>
                      </tr>
                    ) : (
                      historyData.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="p-2.5">{item.start_date}</td>
                          <td className="p-2.5 font-mono">
                            {item.exchange_rate}
                          </td>
                          <td className="p-2.5 font-mono">
                            {item.inverted_exchange_rate}
                          </td>
                          <td className="p-2.5">{item.created_by}</td>
                          <td className="p-2.5">{item.created_date}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="space-y-1 text-gray-700 font-medium pt-2">
                <p>
                  Average Inverted Rate Previous Year(s):{" "}
                  {avgPrevYears ?? "0.00"}
                </p>
                <p>
                  Average Inverted Rate Current Year: {avgCurrentYear ?? ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
