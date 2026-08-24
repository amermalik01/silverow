// app/components/setup/VatRatesList.tsx

"use client";

import { Button } from "@/components/ui/button";
import NumericTextInput from "@/components/ui/NumericTextInput";
import { useEffect, useState } from "react";

type VatRate = {
  id: string;
  name: string;
  rate: number;
};

export default function VatRatesList() {
  const [rates, setRates] = useState<VatRate[]>([]);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // UX State Indicators
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchRates = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/setup/vat-rates");
      if (!res.ok) throw new Error("Failed to load records.");
      const data = await res.json();
      setRates(data);
    } catch (error) {
      // Check if it's an instance of the native Error object
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        // Fallback handle for obscure unexpected errors
        setErrorMessage("An unexpected operation failure occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setErrorMessage("Name cannot be left empty.");
      return false;
    }
    const parsedRate = Number(rate);
    if (
      rate.trim() === "" ||
      isNaN(parsedRate) ||
      parsedRate < 0 ||
      parsedRate > 100
    ) {
      setErrorMessage(
        "Please supply a valid tax percentage between 0 and 100.",
      );
      return false;
    }
    return true;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setErrorMessage(null);

    const targetUrl = editingId
      ? `/api/setup/vat-rates/${editingId}`
      : "/api/setup/vat-rates";
    const targetMethod = editingId ? "PUT" : "POST";

    try {
      const res = await fetch(targetUrl, {
        method: targetMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), rate: Number(rate) }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Execution error encountered.");

      // Reset Form fields safely
      setName("");
      setRate("");
      setEditingId(null);
      await fetchRates();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        // Fallback handle for obscure unexpected errors
        setErrorMessage("An unexpected operation failure occurred.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRate = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to permanently delete this tax configuration option?",
      )
    )
      return;
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/setup/vat-rates/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete action failed.");
      await fetchRates();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        // Fallback handle for obscure unexpected errors
        setErrorMessage("An unexpected operation failure occurred.");
      }
    }
  };

  const startEdit = (r: VatRate) => {
    setErrorMessage(null);
    setEditingId(r.id);
    setName(r.name);
    setRate(String(r.rate));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName("");
    setRate("");
    setErrorMessage(null);
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-lg shadow space-y-4">
      {errorMessage && (
        <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded text-xs font-medium">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSave} className="flex flex-wrap gap-3 items-center">
        <input
          placeholder="Tax Option Description (e.g. Standard VAT)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          className="border p-2 rounded min-w-[240px] dark:bg-slate-800 dark:border-slate-700 disabled:opacity-50"
        />

        <div className="relative flex items-center">
          {/* <input
            placeholder="Rate"
            type="number"
            step="0.01"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            disabled={submitting}
            className="border p-2 pr-6 rounded w-28 dark:bg-slate-800 dark:border-slate-700 disabled:opacity-50"
          /> */}
          <NumericTextInput
            allowDecimals
            decimalScale={2}
            value={Number(rate)}
            onChange={(val) => setRate(String(val))}
            disabled={submitting}
            className="border p-2 pr-6 rounded w-28 dark:bg-slate-800 dark:border-slate-700 disabled:opacity-50"
          />
          <span className="absolute right-2.5 text-gray-500 text-xs">%</span>
        </div>

        <Button type="submit" disabled={submitting} variant="save">
          {submitting ? "Processing..." : editingId ? "Update" : "Add Rate"}
        </Button>

        {editingId && (
          <Button
            type="button"
            onClick={cancelEdit}
            disabled={submitting}
            variant="cancel"
          >
            Cancel
          </Button>
        )}
      </form>

      {loading ? (
        <div className="text-center py-4 text-gray-500">
          Retrieving system ledger profiles...
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg dark:border-slate-700">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 capitalize text-xs tracking-wider">
              <tr>
                <th className="p-3">VAT</th>
                <th className="p-3">Tax Rate</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-700">
              {rates.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-gray-400">
                    No custom configurations instantiated.
                  </td>
                </tr>
              ) : (
                rates.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                  >
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3 text-emerald-600 font-semibold">
                      {r.rate}%
                    </td>
                    <td className="p-3 text-center space-x-4">
                      <Button
                        onClick={() => startEdit(r)}
                        disabled={submitting}
                        variant="edit"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => deleteRate(r.id)}
                        disabled={submitting}
                        variant="cancel"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
