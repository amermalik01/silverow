// app/components/shared/modals/CustomerLookupModal.tsx

"use client";

import { useEffect, useState } from "react";

export type CustomerLookupItem = {
  id: string;

  customer_code?: string;
  name: string;

  email?: string;
  phone?: string;

  city?: string;
  postcode?: string;
  country?: string;

  billing_address?: CustomerAddress | null;
  shipping_address?: CustomerAddress | null;
};

export type CustomerAddress = {
  address_type: "billing" | "shipping";

  name?: string;
  attention?: string;

  address_1?: string;
  address_2?: string;

  city?: string;
  state?: string;
  postcode?: string;
  country?: string;

  phone?: string;
  email?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (customer: CustomerLookupItem) => void;
};

export default function CustomerLookupModal({
  open,
  onClose,
  onSelect,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerLookupItem[]>([]);

  const [filters, setFilters] = useState({
    customer_code: "",
    name: "",
    city: "",
    postcode: "",
    email: "",
  });

  useEffect(() => {
    if (open) fetchCustomers();
  }, [open]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (filters.customer_code)
        params.append("customer_code", filters.customer_code);

      if (filters.name) params.append("name", filters.name);
      if (filters.city) params.append("city", filters.city);
      if (filters.postcode) params.append("postcode", filters.postcode);
      if (filters.email) params.append("email", filters.email);

      const res = await fetch(`/api/sales/customers?${params.toString()}`);

      if (!res.ok) throw new Error("Failed to load customers");

      const json = await res.json();
      setCustomers(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-auto p-6">
      <div className="bg-white text-black rounded-xl shadow-xl w-full max-w-7xl px-4">
        {/* HEADER */}
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="text-xl font-semibold text-black">Select Customer</h2>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500"
          >
            ✕
          </button>
        </div>

        {/* FILTERS */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 border-b">
          <input
            placeholder="Customer Code"
            value={filters.customer_code}
            onChange={(e) =>
              setFilters({ ...filters, customer_code: e.target.value })
            }
            className="border rounded px-3 py-2"
          />

          <input
            placeholder="Customer Name"
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            className="border rounded px-3 py-2"
          />

          <input
            placeholder="City"
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            className="border rounded px-3 py-2"
          />

          <input
            placeholder="Postcode"
            value={filters.postcode}
            onChange={(e) =>
              setFilters({ ...filters, postcode: e.target.value })
            }
            className="border rounded px-3 py-2"
          />

          <input
            placeholder="Email"
            value={filters.email}
            onChange={(e) => setFilters({ ...filters, email: e.target.value })}
            className="border rounded px-3 py-2"
          />
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-2 p-4 border-b">
          <button
            onClick={fetchCustomers}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Search
          </button>

          <button
            onClick={() =>
              setFilters({
                customer_code: "",
                name: "",
                city: "",
                postcode: "",
                email: "",
              })
            }
            className="border px-4 py-2 rounded"
          >
            Reset
          </button>
        </div>

        {/* TABLE */}
        <div className="overflow-auto max-h-[600px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="border p-2 text-left">Code</th>
                <th className="border p-2 text-left">Customer</th>
                <th className="border p-2 text-left">Email</th>
                <th className="border p-2 text-left">Phone</th>
                <th className="border p-2 text-left">City</th>
                <th className="border p-2 text-left">Postcode</th>
                <th className="border p-2 text-left">Country</th>
                <th className="border p-2 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {!loading && customers.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center p-8 text-gray-500">
                    No customers found
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={8} className="text-center p-8">
                    Loading customers...
                  </td>
                </tr>
              )}

              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="border p-2">{customer.customer_code}</td>
                  <td className="border p-2">{customer.name}</td>
                  <td className="border p-2">{customer.email}</td>
                  <td className="border p-2">{customer.phone}</td>
                  <td className="border p-2">{customer.city}</td>
                  <td className="border p-2">{customer.postcode}</td>
                  <td className="border p-2">{customer.country}</td>

                  <td className="border p-2 text-center">
                    <button
                      onClick={() => {
                        onSelect(customer);
                        onClose();
                      }}
                      className="bg-green-600 text-white px-3 py-1 rounded"
                    >
                      Select
                    </button>
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
