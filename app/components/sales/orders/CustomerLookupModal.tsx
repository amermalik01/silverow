// app/components/sales/orders/CustomerLookupModal.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react";

export type CustomerLookupItem = {
  id: string;
  customer_code?: string;
  name: string;

  email?: string;
  phone?: string;

  city?: string;
  postcode?: string;
  country?: string;

  credit_limit?: number;
  currency_id?: string;
  vat_reg_no?: string;

  anonymous_customer?: boolean;
  salesperson_code?: string;

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
  customer_vat_no?: string;
  payable_bank?: string;
  gl_account_receivable?: string;
  gl_account_payable?: string;
  posting_group?: string;
  sales_posting_group_id?: string;

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
  e_sales_order?: boolean;
  e_credit_note?: boolean;
  e_remittance_advice?: boolean;

  // Bank Details
  bank_account_name?: string;
  bank_sort_code?: string;
  bank_account_no?: string;
  bank_swift_bic?: string;
  bank_iban?: string;
  bank_name?: string;
  bank_address?: string;

  primary_address?: CustomerAddress | null;
  billing_address?: CustomerAddress | null;
  shipping_address?: CustomerAddress | null;
};

export type CustomerAddress = {
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
  onSelect: (customer: CustomerLookupItem) => void;
  onSelectMultiple?: (customers: CustomerLookupItem[]) => void;
  multiple?: boolean;
};

export default function CustomerLookupModal({
  open,
  onClose,
  onSelect,
  onSelectMultiple,
  multiple = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerLookupItem[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<
    CustomerLookupItem[]
  >([]);

  // Filter & Pagination States
  const [filters, setFilters] = useState({
    customer_code: "",
    name: "",
    city: "",
    postcode: "",
    email: "",
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchCustomers = useCallback(
    async (targetPage = 1, currentLimit = pagination.limit) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();

        if (filters.customer_code)
          params.append("customer_code", filters.customer_code);
        if (filters.name) params.append("name", filters.name);
        if (filters.city) params.append("city", filters.city);
        if (filters.postcode) params.append("postcode", filters.postcode);
        if (filters.email) params.append("email", filters.email);

        params.append("page", targetPage.toString());
        params.append("limit", currentLimit.toString());

        const res = await fetch(
          `/api/sales/sales-orders/customers?${params.toString()}`,
        );
        if (!res.ok) throw new Error("Failed to load customers");

        const json = await res.json();
        setCustomers(json.data || []);
        if (json.pagination) {
          setPagination(json.pagination);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.limit],
  );

  useEffect(() => {
    if (open) {
      fetchCustomers(1);
      setSelectedCustomers([]);
    }
  }, [open]);

  const handleSearch = () => {
    fetchCustomers(1);
  };

  const handleReset = () => {
    setFilters({
      customer_code: "",
      name: "",
      city: "",
      postcode: "",
      email: "",
    });
    setCustomers([]);
    setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchCustomers(newPage);
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit }));
    fetchCustomers(1, newLimit);
  };

  const handleToggleRow = (cust: CustomerLookupItem) => {
    if (selectedCustomers.some((item) => item.id === cust.id)) {
      setSelectedCustomers((prev) =>
        prev.filter((item) => item.id !== cust.id),
      );
    } else {
      setSelectedCustomers((prev) => [...prev, cust]);
    }
  };

  const handleSelectAllOnPage = () => {
    const allSelected = customers.every((c) =>
      selectedCustomers.some((r) => r.id === c.id),
    );
    if (allSelected) {
      setSelectedCustomers((prev) =>
        prev.filter((r) => !customers.some((c) => c.id === r.id)),
      );
    } else {
      setSelectedCustomers((prev) => {
        const uniqueNew = customers.filter(
          (c) => !prev.some((r) => r.id === c.id),
        );
        return [...prev, ...uniqueNew];
      });
    }
  };

  const handleSubmitBatch = () => {
    if (onSelectMultiple) {
      onSelectMultiple(selectedCustomers);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white text-slate-800 rounded-xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[85vh] border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            Select Customer
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition p-1 rounded-md hover:bg-slate-200/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-5 gap-2">
          <input
            placeholder="Customer Code"
            value={filters.customer_code}
            onChange={(e) =>
              setFilters({ ...filters, customer_code: e.target.value })
            }
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
          />
          <input
            placeholder="Customer Name"
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
          />
          <input
            placeholder="City"
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
          />
          <input
            placeholder="Postcode"
            value={filters.postcode}
            onChange={(e) =>
              setFilters({ ...filters, postcode: e.target.value })
            }
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
          />
          <input
            placeholder="Email"
            value={filters.email}
            onChange={(e) => setFilters({ ...filters, email: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
          />
        </div>

        {/* Action Controls */}
        <div className="flex justify-end gap-2 px-4 py-2 bg-slate-100/60 border-b border-slate-200">
          <button
            onClick={handleSearch}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs px-4 py-1.5 rounded flex items-center gap-1 shadow-sm transition"
          >
            <Search className="h-3 w-3" /> Search
          </button>
          <button
            onClick={handleReset}
            className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 transition"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>

        {/* Table View */}
        <div className="flex-1 overflow-auto px-2">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200 z-10">
              <tr>
                {multiple && (
                  <th className="p-3 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={
                        customers.length > 0 &&
                        customers.every((c) =>
                          selectedCustomers.some((r) => r.id === c.id),
                        )
                      }
                      onChange={handleSelectAllOnPage}
                      className="rounded border-slate-300 text-emerald-600 h-3.5 w-3.5 cursor-pointer"
                    />
                  </th>
                )}
                <th className="p-3 w-28">Code</th>
                <th className="p-3">Customer Name</th>
                <th className="p-3 w-36">Payment Terms</th>
                <th className="p-3 w-44">Email</th>
                <th className="p-3 w-32">Phone</th>
                <th className="p-3 w-28">City</th>
                <th className="p-3 w-24">Postcode</th>
                <th className="p-3 w-28">Country</th>
                {!multiple && <th className="p-3 text-center w-24">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
              {loading ? (
                <tr>
                  <td
                    colSpan={multiple ? 9 : 9}
                    className="p-10 text-center font-sans font-normal text-slate-400 italic"
                  >
                    Retrieving customer registries...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td
                    colSpan={multiple ? 9 : 9}
                    className="p-10 text-center font-sans font-normal text-slate-400 italic"
                  >
                    No active customers match defined filter constraints.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => {
                  const isChecked = selectedCustomers.some(
                    (item) => item.id === customer.id,
                  );
                  return (
                    <tr
                      key={customer.id}
                      onClick={() => multiple && handleToggleRow(customer)}
                      className={`hover:bg-slate-50 transition cursor-pointer ${
                        isChecked ? "bg-emerald-50/50" : ""
                      }`}
                    >
                      {multiple && (
                        <td
                          className="p-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleRow(customer)}
                            className="rounded border-slate-300 text-emerald-600 h-3.5 w-3.5 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="p-3 font-bold text-slate-900 tracking-tight">
                        {customer.customer_code || "—"}
                      </td>
                      <td className="p-3 font-sans font-medium text-slate-800">
                        {customer.name}
                      </td>
                      <td className="p-3 font-sans text-slate-600">
                        {customer.paymentterms || "—"}
                      </td>
                      <td className="p-3 truncate max-w-[170px] font-sans font-normal">
                        {customer.email || "—"}
                      </td>
                      <td className="p-3">{customer.phone || "—"}</td>
                      <td className="p-3 font-sans font-normal">
                        {customer.city || "—"}
                      </td>
                      <td className="p-3">{customer.postcode || "—"}</td>
                      <td className="p-3 font-sans font-normal">
                        {customer.country || "—"}
                      </td>
                      {!multiple && (
                        <td
                          className="p-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              onSelect(customer);
                              onClose();
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[10px] font-bold rounded shadow-sm transition"
                          >
                            Select
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Bar & Pagination */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {multiple ? (
            <div className="flex items-center gap-3">
              <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                {selectedCustomers.length} selected
              </span>
              <button
                onClick={handleSubmitBatch}
                disabled={selectedCustomers.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1 rounded shadow-sm transition"
              >
                Confirm Selection
              </button>
            </div>
          ) : (
            <div className="text-slate-500 font-medium text-[11px]">
              Showing{" "}
              {customers.length > 0
                ? (pagination.page - 1) * pagination.limit + 1
                : 0}{" "}
              to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of{" "}
              <span className="font-bold text-slate-800">
                {pagination.total}
              </span>{" "}
              entries
            </div>
          )}

          <div className="flex items-center gap-4">
            {/* Limit Selector */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <span>Show</span>
              <select
                value={pagination.limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="border border-slate-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(1)}
                disabled={pagination.page <= 1 || loading}
                className="p-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronsLeft className="h-3.5 w-3.5 text-slate-600" />
              </button>
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="p-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-slate-600" />
              </button>
              <span className="px-2 text-[11px] font-medium text-slate-600">
                Page {pagination.page} of {pagination.totalPages || 1}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="p-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
              </button>
              <button
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="p-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronsRight className="h-3.5 w-3.5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
