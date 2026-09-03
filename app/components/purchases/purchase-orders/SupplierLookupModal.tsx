// app/components/purchases/purchase-orders/SupplierLookupModal.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useDebounce } from "@/lib/hooks/useDebounce";

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

  finance_contact_person?: string;
  finance_email?: string;
  finance_phone?: string;
  finance_fax?: string;
  finance_alt_contact?: string;
  finance_alt_email?: string;

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

  finance_charge?: string;
  has_finance_charge?: boolean;
  insurance_charge?: string;
  has_insurance_charge?: boolean;
  exclude_from_aging_report?: boolean;

  e_reminder?: boolean;
  e_statement?: boolean;
  e_invoice?: boolean;
  e_purchase_order?: boolean;
  e_debit_note?: boolean;
  e_remittance_advice?: boolean;

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

  // 1. Raw input state for immediate responsive typing
  const [searchTerm, setSearchTerm] = useState("");

  // 2. Debounced value that delays API calls by 300ms
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
  });

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (debouncedSearch) params.append("q", debouncedSearch);
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const res = await fetch(
        `/api/purchase-orders/suppliers?${params.toString()}`,
      );

      if (!res.ok) {
        throw new Error("Failed to load suppliers");
      }

      const json = await res.json();
      setSuppliers(json.data || []);
      setPagination({
        total: json.pagination?.total || 0,
        totalPages: json.pagination?.totalPages || 1,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, limit]);

  // Reset to page 1 whenever debounced search query changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Re-fetch when open, page, limit, or debouncedSearch updates
  useEffect(() => {
    if (open) {
      fetchSuppliers();
    }
  }, [open, fetchSuppliers]);

  // Clear input reset
  const handleClear = () => {
    setSearchTerm("");
    setPage(1);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 bg-[#103701] dark:bg-[#262F3C] text-white">
          <div className="flex items-center gap-2">
            <Icon icon="tabler:building-store" className="text-xl" />
            <h2 className="text-lg font-semibold tracking-wide text-white">
              Select Supplier
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <Icon icon="tabler:x" className="text-xl" />
          </button>
        </div>

        {/* SEARCH BAR WITH DEBOUNCE */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Icon
              icon="tabler:search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg"
            />
            <input
              type="text"
              placeholder="Type to search code, name, email, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#103701] dark:focus:ring-slate-600"
            />
            {searchTerm && (
              <button
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Icon icon="tabler:x" className="text-sm" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            {loading && (
              <span className="flex items-center gap-1 text-[#103701] dark:text-slate-300">
                <Icon
                  icon="tabler:loader-2"
                  className="animate-spin text-base"
                />{" "}
                Searching...
              </span>
            )}
          </div>
        </div>

        {/* TABLE DATA */}
        <div className="overflow-auto flex-1 p-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                <th className="p-2.5 text-left font-semibold">Code</th>
                <th className="p-2.5 text-left font-semibold">Supplier Name</th>
                <th className="p-2.5 text-left font-semibold">Payment Terms</th>
                <th className="p-2.5 text-left font-semibold">Email</th>
                <th className="p-2.5 text-left font-semibold">Phone</th>
                <th className="p-2.5 text-left font-semibold">City</th>
                <th className="p-2.5 text-left font-semibold">Postcode</th>
                <th className="p-2.5 text-left font-semibold">Country</th>
                <th className="p-2.5 text-center font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {!loading && suppliers.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500">
                    No suppliers found matching your query
                  </td>
                </tr>
              )}

              {loading && suppliers.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500">
                    Loading suppliers...
                  </td>
                </tr>
              )}

              {suppliers.map((supplier) => (
                <tr
                  key={supplier.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="p-2.5 font-mono font-medium text-slate-900 dark:text-slate-100">
                    {supplier.supplier_code || "—"}
                  </td>
                  <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">
                    {supplier.name}
                  </td>
                  <td className="p-2.5 text-slate-600 dark:text-slate-400">
                    {supplier.paymentterms || "—"}
                  </td>
                  <td className="p-2.5 text-slate-600 dark:text-slate-400">
                    {supplier.email || "—"}
                  </td>
                  <td className="p-2.5 text-slate-600 dark:text-slate-400">
                    {supplier.phone || "—"}
                  </td>
                  <td className="p-2.5 text-slate-600 dark:text-slate-400">
                    {supplier.city || "—"}
                  </td>
                  <td className="p-2.5 text-slate-600 dark:text-slate-400">
                    {supplier.postcode || "—"}
                  </td>
                  <td className="p-2.5 text-slate-600 dark:text-slate-400">
                    {supplier.country || "—"}
                  </td>
                  <td className="p-2.5 text-center">
                    <Button
                      onClick={() => {
                        onSelect(supplier);
                        onClose();
                      }}
                      className="bg-[#103701] hover:bg-[#0c2b01] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white h-7 px-3 text-xs rounded transition"
                    >
                      Select
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER & PAGINATION */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div>
            Showing {suppliers.length > 0 ? (page - 1) * limit + 1 : 0} to{" "}
            {Math.min(page * limit, pagination.total)} of {pagination.total}{" "}
            suppliers
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 w-12 text-xs focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1 || loading}
                className="h-8 px-2"
              >
                <Icon icon="tabler:chevron-left" className="text-base" />
              </Button>
              <span className="px-2 font-medium">
                Page {page} of {pagination.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) => Math.min(prev + 1, pagination.totalPages))
                }
                disabled={page >= pagination.totalPages || loading}
                className="h-8 px-2"
              >
                <Icon icon="tabler:chevron-right" className="text-base" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* export default function SupplierLookupModal({
  open,
  onClose,
  onSelect,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierLookupItem[]>([]);
  // const [search, setSearch] = useState("");

  // 1. Raw input state for immediate responsive typing
  const [searchTerm, setSearchTerm] = useState("");
  
  // 2. Debounced value that delays API calls by 300ms
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
  });

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (debouncedSearch) params.append("q", debouncedSearch);
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const res = await fetch(
        `/api/purchase-orders/suppliers?${params.toString()}`
      );

      if (!res.ok) {
        throw new Error("Failed to load suppliers");
      }

      const json = await res.json();
      setSuppliers(json.data || []);
      setPagination({
        total: json.pagination?.total || 0,
        totalPages: json.pagination?.totalPages || 1,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, limit]);

  // Reset to page 1 whenever debounced search query changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Re-fetch when open, page, limit, or debouncedSearch updates
  useEffect(() => {
    if (open) {
      fetchSuppliers();
    }
  }, [open, fetchSuppliers]);

  // Reset page to 1 when search parameter changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  // Clear input reset
  const handleClear = () => {
    setSearchTerm("");
    setPage(1);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]">
        

        <div className="flex justify-between items-center px-6 py-4 bg-[#103701] dark:bg-[#262F3C] text-white">
          <div className="flex items-center gap-2">
            <Icon icon="tabler:building-store" className="text-xl" />
            <h2 className="text-lg font-semibold tracking-wide">Select Supplier</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <Icon icon="tabler:x" className="text-xl" />
          </button>
        </div>

      
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Icon
              icon="tabler:search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg"
            />
            <input
              type="text"
              placeholder="Search by code, name, email, city, or postcode..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#103701] dark:focus:ring-slate-600"
            />
            {searchTerm && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Icon icon="tabler:x" className="text-sm" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              onClick={fetchSuppliers}
              className="bg-[#103701] hover:bg-[#0c2b01] dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs px-4 py-2 h-9"
            >
              Search
            </Button>
          </div>
        </div>

   
        <div className="overflow-auto flex-1 p-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                <th className="p-2.5 text-left font-semibold">Code</th>
                <th className="p-2.5 text-left font-semibold">Supplier Name</th>
                <th className="p-2.5 text-left font-semibold">Payment Terms</th>
                <th className="p-2.5 text-left font-semibold">Email</th>
                <th className="p-2.5 text-left font-semibold">Phone</th>
                <th className="p-2.5 text-left font-semibold">City</th>
                <th className="p-2.5 text-left font-semibold">Postcode</th>
                <th className="p-2.5 text-left font-semibold">Country</th>
                <th className="p-2.5 text-center font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {!loading && suppliers.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500">
                    No suppliers found matching your query
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500">
                    Loading suppliers...
                  </td>
                </tr>
              )}

              {!loading &&
                suppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="p-2.5 font-mono font-medium text-slate-900 dark:text-slate-100">
                      {supplier.supplier_code || "—"}
                    </td>
                    <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">
                      {supplier.name}
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400">
                      {supplier.paymentterms || "—"}
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400">
                      {supplier.email || "—"}
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400">
                      {supplier.phone || "—"}
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400">
                      {supplier.city || "—"}
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400">
                      {supplier.postcode || "—"}
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400">
                      {supplier.country || "—"}
                    </td>
                    <td className="p-2.5 text-center">
                      <Button
                        onClick={() => {
                          onSelect(supplier);
                          onClose();
                        }}
                        className="bg-[#103701] hover:bg-[#0c2b01] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white h-7 px-3 text-xs rounded transition"
                      >
                        Select
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>


        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div>
            Showing {suppliers.length > 0 ? (page - 1) * limit + 1 : 0} to{" "}
            {Math.min(page * limit, pagination.total)} of {pagination.total} suppliers
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1 || loading}
                className="h-8 px-2"
              >
                <Icon icon="tabler:chevron-left" className="text-base" />
              </Button>
              <span className="px-2 font-medium">
                Page {page} of {pagination.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) => Math.min(prev + 1, pagination.totalPages))
                }
                disabled={page >= pagination.totalPages || loading}
                className="h-8 px-2"
              >
                <Icon icon="tabler:chevron-right" className="text-base" />
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
} */

/* "use client";

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
 
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="text-xl font-semibold text-black">Select Supplier</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 text-lg font-bold"
          >
            ✕
          </button>
        </div>


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
 */
