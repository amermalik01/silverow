// app/components/setup/general/company/tabs/CurrencyTab.tsx

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import CurrencyDropdown from "@/app/components/common/CurrencyDropdown";

import { CompanyCurrency, CurrencyRateHistoryItem } from "@/types/currency";

import { format } from "date-fns";

import { DatePicker } from "@/components/ui/date-picker";

import { Button } from "@/components/ui/button";

import NumericTextInput from "@/components/ui/NumericTextInput";

type FormMode = "list" | "form";

type ApiError = {
  error?: string;

  errors?: Array<{
    message?: string;
  }>;
};

/**
 * ------------------------------------------------------------
 * Formatting helpers
 * ------------------------------------------------------------
 */

function formatNumber(
  value: number | string | null | undefined,
  decimals = 6,
): string {
  if (value === null || value === undefined) {
    return "";
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "";
  }

  return numericValue.toFixed(decimals);
}

function dateToISO(date: Date | undefined): string {
  if (!date) {
    return "";
  }

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isoToDate(value: string | null | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const cleanValue = value.slice(0, 10);

  const parts = cleanValue.split("-").map(Number);

  if (parts.length !== 3) {
    return undefined;
  }

  const [year, month, day] = parts;

  if (!year || !month || !day) {
    return undefined;
  }

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}

function formatDisplayDate(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const date = isoToDate(value);

  if (!date) {
    return value;
  }

  return format(date, "dd/MM/yyyy");
}

/**
 * ============================================================
 * COMPONENT
 * ============================================================
 */

export default function CurrencyTab() {
  /**
   * ----------------------------------------------------------
   * List
   * ----------------------------------------------------------
   */

  const [data, setData] = useState<CompanyCurrency[]>([]);

  const [mode, setMode] = useState<FormMode>("list");

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  /**
   * ----------------------------------------------------------
   * Selected company currency
   * ----------------------------------------------------------
   */

  const [selectedCurrency, setSelectedCurrency] =
    useState<CompanyCurrency | null>(null);

  /**
   * ----------------------------------------------------------
   * FORM IDS
   *
   * masterCurrencyId:
   *     currencies.id
   *
   * companyCurrencyId:
   *     company_currencies.id
   * ----------------------------------------------------------
   */

  const [masterCurrencyId, setMasterCurrencyId] = useState("");

  const [companyCurrencyId, setCompanyCurrencyId] = useState("");

  const [currencyCode, setCurrencyCode] = useState("");

  const [currencyName, setCurrencyName] = useState("");

  const [rate, setRate] = useState<number | "">(1);

  const [startDate, setStartDate] = useState<Date | undefined>(new Date());

  const [isEditMode, setIsEditMode] = useState(false);

  /**
   * ----------------------------------------------------------
   * History
   * ----------------------------------------------------------
   */

  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [historyLoading, setHistoryLoading] = useState(false);

  const [historyData, setHistoryData] = useState<CurrencyRateHistoryItem[]>([]);

  const [avgPrevYears, setAvgPrevYears] = useState<number | null>(null);

  const [avgCurrentYear, setAvgCurrentYear] = useState<number | null>(null);

  /**
   * ----------------------------------------------------------
   * Fetch currencies
   * ----------------------------------------------------------
   */

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/setup/general/company/currencies", {
        method: "GET",
        cache: "no-store",
      });

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(json?.error || "Failed to load company currencies.");
      }

      const currencies = Array.isArray(json) ? json : json?.currencies || [];

      setData(currencies);
    } catch (err) {
      console.error("Failed to fetch currencies:", err);

      setError(
        err instanceof Error ? err.message : "Failed to load currencies.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * ----------------------------------------------------------
   * Inverted rate
   * ----------------------------------------------------------
   */

  const invertedRate = useMemo(() => {
    const numericRate = Number(rate);

    if (!Number.isFinite(numericRate) || numericRate <= 0) {
      return "";
    }

    return (1 / numericRate).toFixed(6);
  }, [rate]);

  /**
   * ----------------------------------------------------------
   * Search
   * ----------------------------------------------------------
   */

  const filteredData = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return data;
    }

    return data.filter(
      (currency) =>
        currency.code.toLowerCase().includes(query) ||
        currency.name.toLowerCase().includes(query),
    );
  }, [data, search]);

  /**
   * ----------------------------------------------------------
   * Reset form
   * ----------------------------------------------------------
   */

  const resetForm = () => {
    setSelectedCurrency(null);

    setMasterCurrencyId("");

    setCompanyCurrencyId("");

    setCurrencyCode("");

    setCurrencyName("");

    setRate(1);

    setStartDate(new Date());

    setIsEditMode(true);

    setError(null);
  };

  /**
   * ----------------------------------------------------------
   * Add
   * ----------------------------------------------------------
   */

  const handleAdd = () => {
    resetForm();

    setMode("form");
  };

  /**
   * ----------------------------------------------------------
   * Row click
   * ----------------------------------------------------------
   */

  const handleRowClick = (currency: CompanyCurrency) => {
    setSelectedCurrency(currency);

    // IMPORTANT:
    // Existing company currency uses company_currencies.id
    setCompanyCurrencyId(currency.company_currency_id);

    setCurrencyCode(currency.code);
    setCurrencyName(currency.name);

    setRate(Number(currency.exchange_rate || 1));

    setStartDate(isoToDate(currency.effective_date) || new Date());

    setIsEditMode(false);
    setError(null);
    setMode("form");
  };

  /**
   * ----------------------------------------------------------
   * Save
   * ----------------------------------------------------------
   */

  const handleSaveCurrency = async (e?: React.FormEvent) => {
    e?.preventDefault();

    setError(null);

    /**
     * Existing record:
     *
     * companyCurrencyId is required.
     *
     * New record:
     *
     * masterCurrencyId is selected from dropdown.
     *
     * If your Add flow creates company_currencies elsewhere,
     * use that endpoint first.
     */

    if (!companyCurrencyId) {
      setError(
        "No company currency is selected. Please configure the currency for this company first.",
      );

      return;
    }

    if (rate === "" || !Number.isFinite(Number(rate)) || Number(rate) <= 0) {
      setError("Exchange rate must be greater than 0.");

      return;
    }

    if (!startDate) {
      setError("Please select an effective date.");

      return;
    }

    const rateNumber = Number(rate);

    if (rateNumber > 999999999999.999999) {
      setError("Exchange rate is too large.");

      return;
    }

    const dateString = dateToISO(startDate);

    if (!dateString) {
      setError("Invalid effective date.");

      return;
    }

    /**
     * Base currency cannot be changed.
     */

    if (selectedCurrency?.is_base && rateNumber !== 1) {
      setError("Base currency exchange rate must remain 1.000000.");

      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/setup/general/company/currencies/rates",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            company_currency_id: companyCurrencyId,

            exchange_rate: rateNumber,

            start_date: dateString,
          }),
        },
      );

      const json: ApiError | null = await response.json().catch(() => null);

      if (!response.ok) {
        const validationError = json?.errors?.[0]?.message;

        throw new Error(
          validationError || json?.error || "Failed to save currency rate.",
        );
      }

      /**
       * Reload the complete list.
       */

      await fetchData();

      /**
       * Return to list.
       */

      setIsEditMode(false);

      setMode("list");
    } catch (err) {
      console.error("Failed to save currency rate:", err);

      setError(
        err instanceof Error ? err.message : "Failed to save currency rate.",
      );
    } finally {
      setSaving(false);
    }
  };

  /**
   * ----------------------------------------------------------
   * History
   * ----------------------------------------------------------
   */

  const openConversionHistory = async () => {
  if (!selectedCurrency) {
    return;
  }

  setShowHistoryModal(true);
  setHistoryLoading(true);
  setError(null);

  try {
    const res = await fetch(
      `/api/setup/general/company/currencies/rates?company_currency_id=${encodeURIComponent(
        selectedCurrency.company_currency_id,
      )}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(
        json?.error ||
          "Failed to fetch conversion history.",
      );
    }

    setHistoryData(
      Array.isArray(json?.rates)
        ? json.rates
        : [],
    );

    setAvgPrevYears(
      json?.avgPrevYears ?? null,
    );

    setAvgCurrentYear(
      json?.avgCurrentYear ?? null,
    );
  } catch (err) {
    console.error(
      "Failed to fetch history:",
      err,
    );

    setHistoryData([]);

    setAvgPrevYears(null);
    setAvgCurrentYear(null);

    setError(
      err instanceof Error
        ? err.message
        : "Failed to fetch conversion history.",
    );
  } finally {
    setHistoryLoading(false);
  }
};

  /**
   * ----------------------------------------------------------
   * Close history
   * ----------------------------------------------------------
   */

  const closeHistory = () => {
    setShowHistoryModal(false);
  };

  /**
   * ----------------------------------------------------------
   * Render
   * ----------------------------------------------------------
   */

  return (
    <div className="space-y-4 text-xs">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700">
          {error}
        </div>
      )}

      {mode === "list" ? (
        <div>
          {/* LIST HEADER */}

          <div className="flex items-center justify-between mb-3">
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

            <Button type="button" onClick={handleAdd} variant="add_line">
              Add
            </Button>
          </div>

          {/* LIST */}

          <div className="border rounded overflow-hidden">
            <table className="w-full text-left table-fixed border-collapse">
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
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-500">
                      Loading currencies...
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-500">
                      {search
                        ? "No currencies match your search."
                        : "No currencies configured for this company."}
                    </td>
                  </tr>
                ) : (
                  filteredData.map((currency) => {
                    const exchangeRate = Number(currency.exchange_rate);

                    return (
                      <tr
                        key={currency.company_currency_id}
                        onClick={() => handleRowClick(currency)}
                        className="border-b hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="p-2.5 font-medium">
                          <div className="flex items-center gap-2">
                            <span>{currency.code}</span>

                            {currency.is_base && (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">
                                BASE
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-2.5">{currency.name}</td>

                        <td className="p-2.5">
                          {formatDisplayDate(currency.effective_date)}
                        </td>

                        <td className="p-2.5 font-mono">
                          {formatNumber(exchangeRate)}
                        </td>

                        <td className="p-2.5 font-mono text-emerald-700 font-medium">
                          {exchangeRate > 0
                            ? formatNumber(1 / exchangeRate)
                            : ""}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* FORM */

        <div  className="space-y-4 pt-2">
          <div className="space-y-3 max-w-xl">
            {/* CURRENCY */}

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

                    <span className="border px-3 py-1.5 rounded bg-gray-50 text-gray-600 font-medium">
                      {currencyCode}
                    </span>
                  </>
                ) : (
                  <CurrencyDropdown
                    value={masterCurrencyId}
                    onChange={(value) => {
                      setMasterCurrencyId(value || "");
                    }}
                  />
                )}
              </div>
            </div>

            {/* EXCHANGE RATE */}

            <div className="grid grid-cols-3 items-center gap-2">
              <label className="font-medium text-gray-700">
                Exchange Rate <span className="text-red-500">*</span>
              </label>

              <NumericTextInput
                allowDecimals
                decimalScale={6}
                value={Number(rate)}
                disabled={!isEditMode || Boolean(selectedCurrency?.is_base)}
                onChange={(value) => setRate(value === 0 ? "" : Number(value))}
                className="col-span-2 border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600 font-mono"
              />
            </div>

            {selectedCurrency?.is_base && (
              <div className="ml-[33.333%] text-[11px] text-gray-500">
                Base currency exchange rate is permanently locked at 1.000000.
              </div>
            )}

            {/* INVERTED */}

            <div className="grid grid-cols-3 items-center gap-2">
              <label className="font-medium text-gray-700">
                Inverted Exchange Rate
              </label>

              <input
                type="text"
                readOnly
                value={invertedRate}
                className="col-span-2 border px-2.5 py-1.5 rounded bg-gray-50 font-mono text-gray-600"
              />
            </div>

            {/* START DATE */}

            <div className="grid grid-cols-3 items-center gap-2">
              <label className="font-medium text-gray-700">
                Start Date <span className="text-red-500">*</span>
              </label>

              <div className="col-span-2">
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  disabled={!isEditMode}
                  className="w-full border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* ACTIONS */}

          <div className="flex justify-end gap-2 pt-6 border-t">
            {selectedCurrency && (
              <Button
                type="button"
                onClick={openConversionHistory}
                variant="post"
              >
                Conversion History
              </Button>
            )}

            {!isEditMode ? (
              <Button
                type="button"
                variant="edit"
                onClick={() => setIsEditMode(true)}
              >
                Edit
              </Button>
            ) : (
              <Button type="button" variant="save" onClick={handleSaveCurrency} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            )}

            <Button
              type="button"
              onClick={() => {
                setMode("list");

                setError(null);
              }}
              variant="cancel"
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}

      {showHistoryModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeHistory();
            }
          }}
        >
          <div className="bg-white rounded shadow-xl w-full max-w-4xl overflow-hidden border">
            {/* HEADER */}

            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-gray-800 text-sm">
                {currencyCode} - Currency Exchange Rate History
              </h3>

              <button
                type="button"
                onClick={closeHistory}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              {historyLoading ? (
                <div className="py-10 text-center text-gray-500">
                  Loading conversion history...
                </div>
              ) : (
                <>
                  <div className="border rounded overflow-hidden">
                    <div className="max-h-[400px] overflow-auto">
                      <table className="w-full text-left table-fixed border-collapse">
                        <thead className="bg-gray-50 border-b text-gray-700 font-semibold sticky top-0">
                          <tr>
                            <th className="p-2.5">Start Date</th>

                            <th className="p-2.5">Exchange Rate</th>

                            <th className="p-2.5">Inverted Exchange Rate</th>

                            <th className="p-2.5">Created Date</th>
                          </tr>
                        </thead>

                        <tbody>
                          {historyData.length === 0 ? (
                            <tr>
                              <td
                                colSpan={4}
                                className="p-8 text-center text-gray-500"
                              >
                                No exchange rate history found.
                              </td>
                            </tr>
                          ) : (
                            historyData.map((item) => (
                              <tr
                                key={item.id}
                                className="border-b hover:bg-gray-50"
                              >
                                <td className="p-2.5">
                                  {formatDisplayDate(item.effective_date)}
                                </td>

                                <td className="p-2.5 font-mono">
                                  {formatNumber(item.rate)}
                                </td>

                                <td className="p-2.5 font-mono text-emerald-700">
                                  {formatNumber(item.inverted_exchange_rate)}
                                </td>

                                <td className="p-2.5">
                                  {item.created_at
                                    ? format(
                                        new Date(item.created_at),
                                        "dd/MM/yyyy HH:mm",
                                      )
                                    : ""}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-1 text-gray-700 font-medium pt-2">
                    <p>
                      Average Inverted Rate Previous Year(s):{" "}
                      <span className="font-mono">
                        {avgPrevYears !== null
                          ? formatNumber(avgPrevYears)
                          : "N/A"}
                      </span>
                    </p>

                    <p>
                      Average Inverted Rate Current Year:{" "}
                      <span className="font-mono">
                        {avgCurrentYear !== null
                          ? formatNumber(avgCurrentYear)
                          : "N/A"}
                      </span>
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* "use client";

import React, { useEffect, useState } from "react";
import CurrencyDropdown from "@/app/components/common/CurrencyDropdown";
import { CompanyCurrency } from "@/types/currency";

import { format } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";

interface RateHistoryItem {
  id: string;
  // start_date: string;
  // exchange_rate: number;

  effective_date: string;
  rate: number;
  inverted_exchange_rate?: number;
  created_by?: string;
  created_date?: string;
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
  // const [startDate, setStartDate] = useState("2020-06-23");

  const [isEditMode, setIsEditMode] = useState(false);

  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
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
      const res = await fetch("/api/setup/general/company/currencies/rates", {
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
            <Button
              type="button"
              onClick={() => {
                setSelectedCurrency(null);
                setCurrencyCode("");
                setCurrencyName("");
                setRate(1.0);
                setMode("form");
              }}
              variant="add_line"
              // className="bg-emerald-900 hover:bg-emerald-950 text-white px-5 py-1.5 rounded font-medium shadow-sm"
            >
              Add
            </Button>
          </div>

          <div className="border rounded overflow-hidden">
            <table className="w-full text-left table-fixed border-collapse">
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

        <div  className="space-y-4 pt-2">
          <div className="space-y-3 max-w-xl">

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
                    <span className="border px-3 py-1.5 rounded bg-gray-50 text-gray-600 font-medium capitalize">
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


            <div className="grid grid-cols-3 items-center gap-2">
              <label className="font-medium text-gray-700">
                Exchange Rate <span className="text-red-500">*</span>
              </label>
              <NumericTextInput
                allowDecimals
                decimalScale={2}
                value={Number(rate)}
                disabled={!isEditMode}
                onChange={(val) => setRate(val === 0 ? "" : Number(val))}
                className="col-span-2 border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600 font-mono"
              />
            </div>

   
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


            <div className="grid grid-cols-3 items-center gap-2">
              <label className="font-medium text-gray-700">
                Start Date <span className="text-red-500">*</span>
              </label>
              <div className="col-span-2">
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  disabled={!isEditMode}
                  className="w-full border px-2.5 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>
          </div>


          <div className="flex justify-end gap-2 pt-6 border-t">
            {selectedCurrency && (
              <Button
                type="button"
                onClick={openConversionHistory}
                variant="post"
                // className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-4 py-1.5 rounded transition-colors"
              >
                Conversion History
              </Button>
            )}

            {!isEditMode ? (
              <Button
                type="button"
                variant="edit"
                onClick={() => setIsEditMode(true)}
              >
                Edit
              </Button>
            ) : (
              <Button
                type="button"
                variant="save"
                onClick={handleSaveCurrency}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            )}
            <Button
              type="button"
              onClick={() => setMode("list")}
              variant="cancel"
            >
              Cancel
            </Button>
          </div>
        </div>
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
                <table className="w-full text-left table-fixed border-collapse">
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
                          <td className="p-2.5">{item.effective_date}</td>
                          <td className="p-2.5 font-mono">
                            {item.rate}
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
} */
