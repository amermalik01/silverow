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
    <div className=" p-6 rounded shadow">
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

      <table className="w-full border text-sm">
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
}
