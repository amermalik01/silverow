// app/components/purchases/purchase-orders/SupplierLookupModal.tsx

"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export type SupplierLookupItem = {
  id: string;
  supplier_code?: string;
  name: string;

  email?: string;
  phone?: string;

  city?: string;
  postcode?: string;
  country?: string;

  credit_limit?: number;
  currency_id?: string;
  vat_reg_no?: string;

  anonymous_supplier?: boolean;
  purchaser_code?: string;

  // Finance Contacts
  finance_contact_person?: string;
  finance_email?: string;
  finance_phone?: string;
  finance_fax?: string;
  finance_alt_contact?: string;
  finance_alt_email?: string;

  // Payment Rules & GL Accounts
  payment_terms?: string;
  paymentterms?: string;
  payment_method?: string;
  company_reg_no?: string;
  supplier_vat_no?: string;
  payable_bank?: string;
  gl_account_receivable?: string;
  gl_account_payable?: string;
  posting_group?: string;
  purchase_posting_group_id?: string;

  // Charges & Flags
  finance_charge?: string;
  has_finance_charge?: boolean;
  insurance_charge?: string;
  has_insurance_charge?: boolean;
  exclude_from_aging_report?: boolean;

  // E-Document Flags
  e_reminder?: boolean;
  e_statement?: boolean;
  e_invoice?: boolean;
  e_purchase_order?: boolean;
  e_debit_note?: boolean;
  e_remittance_advice?: boolean;

  // Bank Details
  bank_account_name?: string;
  bank_sort_code?: string;
  bank_account_no?: string;
  bank_swift_bic?: string;
  bank_iban?: string;
  bank_name?: string;
  bank_address?: string;

  primary_address?: SupplierAddress | null;
  billing_address?: SupplierAddress | null;
  shipping_address?: SupplierAddress | null;
};

export type SupplierAddress = {
  address_type: "billing" | "shipping";
  name?: string;
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
  onSelect: (supplier: SupplierLookupItem) => void;
};

export default function SupplierLookupModal({
  open,
  onClose,
  onSelect,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierLookupItem[]>([]);

  const [filters, setFilters] = useState({
    supplier_code: "",
    name: "",
    city: "",
    postcode: "",
    email: "",
  });

  useEffect(() => {
    if (open) {
      fetchSuppliers();
    }
  }, [open]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (filters.supplier_code)
        params.append("supplier_code", filters.supplier_code);
      if (filters.name) params.append("name", filters.name);
      if (filters.city) params.append("city", filters.city);
      if (filters.postcode) params.append("postcode", filters.postcode);
      if (filters.email) params.append("email", filters.email);

      const res = await fetch(
        `/api/purchase-orders/suppliers?${params.toString()}`,
      );

      if (!res.ok) {
        throw new Error("Failed to load suppliers");
      }

      const json = await res.json();
      setSuppliers(json.data || []);
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
          <h2 className="text-xl font-semibold text-black">Select Supplier</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* FILTERS */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 border-b">
          <input
            placeholder="Supplier Code"
            value={filters.supplier_code}
            onChange={(e) =>
              setFilters({ ...filters, supplier_code: e.target.value })
            }
            className="border rounded px-3 py-2 text-sm"
          />
          <input
            placeholder="Supplier Name"
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            className="border rounded px-3 py-2 text-sm"
          />
          <input
            placeholder="City"
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            className="border rounded px-3 py-2 text-sm"
          />
          <input
            placeholder="Postcode"
            value={filters.postcode}
            onChange={(e) =>
              setFilters({ ...filters, postcode: e.target.value })
            }
            className="border rounded px-3 py-2 text-sm"
          />
          <input
            placeholder="Email"
            value={filters.email}
            onChange={(e) => setFilters({ ...filters, email: e.target.value })}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-2 p-4 border-b">
          <Button
            onClick={fetchSuppliers}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
          >
            Search
          </Button>
          <Button
            onClick={() => {
              setFilters({
                supplier_code: "",
                name: "",
                city: "",
                postcode: "",
                email: "",
              });
            }}
            className="border hover:bg-gray-50 px-4 py-2 rounded text-sm"
          >
            Reset
          </Button>
        </div>

        {/* TABLE */}
        <div className="overflow-auto max-h-[550px] my-2">
          <table className="w-full text-xs table-fixed border-collapse">
            <thead className="bg-gray-100 sticky top-0 border-b">
              <tr>
                <th className="border p-2 text-left">Code</th>
                <th className="border p-2 text-left">Supplier</th>
                <th className="border p-2 text-left">Payment Terms</th>
                <th className="border p-2 text-left">Email</th>
                <th className="border p-2 text-left">Phone</th>
                <th className="border p-2 text-left">City</th>
                <th className="border p-2 text-left">Postcode</th>
                <th className="border p-2 text-left">Country</th>
                <th className="border p-2 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {!loading && suppliers.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center p-8 text-gray-500">
                    No suppliers found
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={9} className="text-center p-8 text-gray-500">
                    Loading suppliers...
                  </td>
                </tr>
              )}

              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50 transition">
                  <td className="border p-2 font-mono font-medium">
                    {supplier.supplier_code || "—"}
                  </td>
                  <td className="border p-2 font-medium">{supplier.name}</td>
                  <td className="border p-2 text-gray-600">
                    {supplier.paymentterms || "—"}
                  </td>
                  <td className="border p-2">{supplier.email || "—"}</td>
                  <td className="border p-2">{supplier.phone || "—"}</td>
                  <td className="border p-2">{supplier.city || "—"}</td>
                  <td className="border p-2">{supplier.postcode || "—"}</td>
                  <td className="border p-2">{supplier.country || "—"}</td>
                  <td className="border p-2 text-center">
                    <Button
                      onClick={() => {
                        onSelect(supplier);
                        onClose();
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition"
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
