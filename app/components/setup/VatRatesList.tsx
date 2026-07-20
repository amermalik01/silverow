// app/components/setup/VatRatesList.tsx

"use client";

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
      {/* Dynamic Error Messaging Banner */}
      {errorMessage && (
        <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {/* Input Action Panel Form */}
      <form onSubmit={handleSave} className="flex flex-wrap gap-3 items-center">
        <input
          placeholder="Tax Option Description (e.g. Standard VAT)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          className="border p-2 rounded min-w-[240px] dark:bg-slate-800 dark:border-slate-700 disabled:opacity-50"
        />

        <div className="relative flex items-center">
          <input
            placeholder="Rate"
            type="number"
            step="0.01"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            disabled={submitting}
            className="border p-2 pr-6 rounded w-28 dark:bg-slate-800 dark:border-slate-700 disabled:opacity-50"
          />
          <span className="absolute right-2.5 text-gray-500 text-xs">%</span>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={`px-5 py-2 text-white rounded font-medium transition disabled:opacity-50 ${
            editingId
              ? "bg-green-600 hover:bg-green-700"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {submitting ? "Processing..." : editingId ? "Update" : "Add Rate"}
        </button>

        {editingId && (
          <button
            type="button"
            onClick={cancelEdit}
            disabled={submitting}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition"
          >
            Cancel
          </button>
        )}
      </form>

      {/* Structured Ledger Layout Representation Data Table */}
      {loading ? (
        <div className="text-center py-4 text-gray-500">
          Retrieving system ledger profiles...
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg dark:border-slate-700">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 uppercase text-xs tracking-wider">
              <tr>
                <th className="p-3">VAT Setup Label</th>
                <th className="p-3">Tax Computation Multiple</th>
                <th className="p-3 text-center">Management Actions</th>
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
                      <button
                        onClick={() => startEdit(r)}
                        disabled={submitting}
                        className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteRate(r.id)}
                        disabled={submitting}
                        className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                      >
                        Delete
                      </button>
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
/* "use client";

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

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch("/api/setup/vat-rates");
        const data = await res.json();
        setRates(data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchRates();
  }, []);

  const loadRates = async () => {
    const res = await fetch("/api/setup/vat-rates");
    const data = await res.json();
    setRates(data);
  };

  const createRate = async () => {
    await fetch("/api/setup/vat-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        rate: Number(rate),
      }),
    });

    setName("");
    setRate("");
    loadRates();
  };

  const updateRate = async () => {

    await fetch(`/api/setup/vat-rates/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        rate: Number(rate),
      }),
    });

    setEditingId(null);
    setName("");
    setRate("");

    loadRates();
  };

  const deleteRate = async (id: string) => {

    if (!confirm("Delete VAT rate?")) return;

    await fetch(`/api/setup/vat-rates/${id}`, {
      method: "DELETE",
    });

    loadRates();
  };

  const editRate = (rate: VatRate) => {

    setEditingId(rate.id);
    setName(rate.name);
    setRate(String(rate.rate));

  };

  return (
    <div className=" p-6 rounded shadow dark:shadow-white">
      <div className="flex gap-2 mb-4">

        <input
          placeholder="Name"
          value={name}
          onChange={(e)=>setName(e.target.value)}
          className="border p-2 rounded"
        />

        <input
          placeholder="Rate %"
          value={rate}
          onChange={(e)=>setRate(e.target.value)}
          className="border p-2 rounded"
        />

        {editingId ? (

          <button
            onClick={updateRate}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Update
          </button>

        ) : (

          <button
            onClick={createRate}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Add
          </button>

        )}

      </div>

      <table className="w-full border text-xs">
        <thead className="">
          <tr>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Rate</th>
            <th className="p-2 text-center">Action</th>
          </tr>
        </thead>

        <tbody>
          {rates.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.name}</td>

              <td className="p-2">{r.rate}%</td>

              <td className="p-2 text-center space-x-3">

                <button
                  onClick={()=>editRate(r)}
                  className="text-blue-600"
                >
                  Edit
                </button>

                <button
                  onClick={()=>deleteRate(r.id)}
                  className="text-red-600"
                >
                  Delete
                </button>

              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} */
