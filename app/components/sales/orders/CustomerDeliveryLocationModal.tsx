// app/components/sales/orders/CustomerDeliveryLocationModal.tsx

"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export type CustomerDeliveryItem = {
  id: string;
  location_code?: string;
  name: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
};

type Props = {
  open: boolean;
  customerId?: string;
  onClose: () => void;
  onSelect: (location: CustomerDeliveryItem) => void;
};

export default function CustomerDeliveryLocationModal({
  open,
  customerId,
  onClose,
  onSelect,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<CustomerDeliveryItem[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open && customerId) {
      fetchLocations();
    }
  }, [open, customerId]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/sales/sales-orders/customers/${customerId}/locations`,
      );

      if (!res.ok) {
        throw new Error("Failed to load customer locations");
      }

      const json = await res.json();
      setLocations(json.data || []);
    } catch (err) {
      console.error(err);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const filteredLocations = locations.filter(
    (loc) =>
      loc.name?.toLowerCase().includes(search.toLowerCase()) ||
      loc.location_code?.toLowerCase().includes(search.toLowerCase()) ||
      loc.city?.toLowerCase().includes(search.toLowerCase()) ||
      loc.postcode?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-auto p-6">
      <div className="bg-white dark:bg-slate-900 text-black dark:text-white rounded-xl shadow-xl w-full max-w-4xl p-4">
        {/* HEADER */}
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-lg font-semibold">Select Delivery Location</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* SEARCH FILTER */}
        <div className="py-3 border-b">
          <input
            type="text"
            placeholder="Search location code, name, city, or postcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded px-3 py-2 text-xs dark:bg-slate-800 dark:border-slate-700"
          />
        </div>

        {/* TABLE */}
        <div className="overflow-auto max-h-[450px] my-2">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 border-b">
              <tr>
                <th className="border p-2 text-left">Code</th>
                <th className="border p-2 text-left">Location Name</th>
                <th className="border p-2 text-left">Address</th>
                <th className="border p-2 text-left">City</th>
                <th className="border p-2 text-left">Postcode</th>
                <th className="border p-2 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {!loading && filteredLocations.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-gray-500">
                    {!customerId
                      ? "Please select a customer first"
                      : "No additional delivery locations found"}
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-gray-500">
                    Loading locations...
                  </td>
                </tr>
              )}

              {filteredLocations.map((loc) => (
                <tr
                  key={loc.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <td className="border p-2 font-mono font-medium">
                    {loc.location_code || "—"}
                  </td>
                  <td className="border p-2 font-medium">{loc.name}</td>
                  <td className="border p-2 text-gray-600 dark:text-gray-300">
                    {[loc.address_1, loc.address_2]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>
                  <td className="border p-2">{loc.city || "—"}</td>
                  <td className="border p-2">{loc.postcode || "—"}</td>
                  <td className="border p-2 text-center">
                    <Button
                      onClick={() => {
                        onSelect(loc);
                        onClose();
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition text-xs"
                    >
                      Select
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
