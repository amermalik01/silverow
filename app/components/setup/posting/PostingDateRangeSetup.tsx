// app/components/setup/posting/PostingDateRangeSetup.tsx

"use client";

import { useEffect, useState } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO } from "date-fns";

interface AccountingPeriod {
  id: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
}

export default function PostingDateRangeSetup() {
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form state for creating a new period
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchPeriods = async () => {
    try {
      const res = await fetch("/api/setup/posting/accounting-periods");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load periods");
      setPeriods(data);
    } catch (error) {
      // Check if it's an instance of the native Error object
      if (error instanceof Error) {
        setError(error.message);
      } else {
        // Fallback handle for obscure unexpected errors
        setError("An unexpected operation failure occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/setup/posting/accounting-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_date: startDate, end_date: endDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create period");

      setStartDate("");
      setEndDate("");
      fetchPeriods();
    } catch (error) {
      // Check if it's an instance of the native Error object
      if (error instanceof Error) {
        setError(error.message);
      } else {
        // Fallback handle for obscure unexpected errors
        setError("An unexpected operation failure occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleClose = async (id: string, currentlyClosed: boolean) => {
    setError("");
    try {
      const res = await fetch(`/api/setup/posting/accounting-periods/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_closed: !currentlyClosed }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update period state");
      }
      fetchPeriods();
    } catch (error) {
      // Check if it's an instance of the native Error object
      if (error instanceof Error) {
        setError(error.message);
      } else {
        // Fallback handle for obscure unexpected errors
        setError("An unexpected operation failure occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="p-4 text-xs text-gray-500">
        Loading accounting windows...
      </div>
    );

  return (
    <div className="border p-6 rounded bg-white dark:bg-slate-900 text-black dark:text-white space-y-6 shadow-sm">
      <div>
        <h2 className="font-semibold text-lg ">
          Fiscal Years & Accounting Periods
        </h2>
        <p className="text-xs ">
          Define active entry parameters and lock closed cycles.
        </p>
      </div>

      {error && (
        <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded">
          {error}
        </div>
      )}

      {/* Generation Form */}
      <form
        onSubmit={handleCreatePeriod}
        className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">
            Start Date
          </label>
          <DatePicker
            value={startDate ? parseISO(startDate) : undefined}
            onChange={(date) =>
              setStartDate(date ? format(date, "yyyy-MM-dd") : "")
            }
            className="w-full bg-white text-black border border-gray-300 px-3 py-1.5 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {/* <input
            type="date"
            required
            className="border px-3 py-1.5 rounded text-xs text-black"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          /> */}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">End Date</label>
          {/* <input
            type="date"
            required
            className="border px-3 py-1.5 rounded text-xs text-black"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          /> */}
          <DatePicker
            value={endDate ? parseISO(endDate) : undefined}
            onChange={(date) =>
              setEndDate(date ? format(date, "yyyy-MM-dd") : "")
            }
            className="w-full bg-white text-black border border-gray-300 px-3 py-1.5 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded font-medium transition-colors"
        >
          Open New Period
        </button>
      </form>

      {/* Periods Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b bg-gray-100 text-gray-600 font-medium">
              <th className="p-3">Start Date</th>
              <th className="p-3">End Date</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {periods.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="p-4 text-center text-gray-400 italic"
                >
                  No historical setup rules initialized.
                </td>
              </tr>
            ) : (
              periods.map((period) => (
                <tr
                  key={period.id}
                  className="border-b hover:bg-gray-50 transition-colors"
                >
                  <td className="p-3 font-mono">
                    {/* {new Date(period.start_date).toLocaleDateString()} */}
                    {format(parseISO(period.start_date), "dd/MM/yyyy")}
                  </td>
                  <td className="p-3 font-mono">
                    {/* {new Date(period.end_date).toLocaleDateString()} */}
                    {format(parseISO(period.end_date), "dd/MM/yyyy")}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        period.is_closed
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {period.is_closed
                        ? "Closed / Locked"
                        : "Open for Postings"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleClose(period.id, period.is_closed)
                      }
                      className={`text-xs px-2.5 py-1 rounded font-medium transition-colors border ${
                        period.is_closed
                          ? "bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                          : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                      }`}
                    >
                      {period.is_closed ? "Reopen Period" : "Close Period"}
                    </button>
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
