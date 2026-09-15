// app/components/shared/modals/SupplierLookupModal.tsx
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
  assign_person_id?: string;

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

  // Single select
  onSelect?: (supplier: SupplierLookupItem) => void;

  // Multiple select
  onSelectMultiple?: (suppliers: SupplierLookupItem[]) => void;

  // Selection mode
  multiple?: boolean;
};

export default function SupplierLookupModal({
  open,
  onClose,
  onSelect,
  onSelectMultiple,
  multiple = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierLookupItem[]>([]);

  // Multiple-selection state
  const [selectedRecords, setSelectedRecords] = useState<
    SupplierLookupItem[]
  >([]);

  // Search
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Pagination
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

      // Reset selections whenever modal opens
      setSelectedRecords([]);
    }
  }, [open, fetchSuppliers]);

  // Clear search
  const handleClear = () => {
    setSearchTerm("");
    setPage(1);
  };

  // Toggle one supplier
  const handleToggleRow = (supplier: SupplierLookupItem) => {
    setSelectedRecords((prev) =>
      prev.some((item) => item.id === supplier.id)
        ? prev.filter((item) => item.id !== supplier.id)
        : [...prev, supplier],
    );
  };

  // Select / deselect all suppliers on current page
  const handleSelectAllOnPage = () => {
    const allSelected =
      suppliers.length > 0 &&
      suppliers.every((supplier) =>
        selectedRecords.some((selected) => selected.id === supplier.id),
      );

    if (allSelected) {
      // Remove current page suppliers from selection
      setSelectedRecords((prev) =>
        prev.filter(
          (selected) =>
            !suppliers.some((supplier) => supplier.id === selected.id),
        ),
      );
    } else {
      // Add current page suppliers without duplicates
      setSelectedRecords((prev) => {
        const newRecords = suppliers.filter(
          (supplier) =>
            !prev.some((selected) => selected.id === supplier.id),
        );

        return [...prev, ...newRecords];
      });
    }
  };

  // Submit multiple selection
  const handleSubmitBatch = () => {
    if (selectedRecords.length === 0) {
      return;
    }

    if (onSelectMultiple) {
      onSelectMultiple(selectedRecords);
    }

    onClose();
  };

  if (!open) return null;

  const isAllOnPageSelected =
    suppliers.length > 0 &&
    suppliers.every((supplier) =>
      selectedRecords.some((selected) => selected.id === supplier.id),
    );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 bg-[#103701] dark:bg-[#262F3C] text-white">
          <div className="flex items-center gap-2">
            <Icon icon="tabler:building-store" className="text-xl" />

            <h2 className="text-lg font-semibold tracking-wide text-white">
              {multiple ? "Select Supplier(s)" : "Select Supplier"}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <Icon icon="tabler:x" className="text-xl" />
          </button>
        </div>

        {/* SEARCH BAR */}
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

          <div className="flex items-center gap-3">
            {loading && (
              <span className="flex items-center gap-1 text-xs text-[#103701] dark:text-slate-300">
                <Icon
                  icon="tabler:loader-2"
                  className="animate-spin text-base"
                />
                Searching...
              </span>
            )}

            {multiple && selectedRecords.length > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#103701]/10 text-[#103701] dark:bg-slate-800 dark:text-slate-200 font-medium border border-[#103701]/20 dark:border-slate-700">
                {selectedRecords.length} Supplier(s) selected
              </span>
            )}
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-auto flex-1 p-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                {/* SELECT ALL CHECKBOX */}
                {multiple && (
                  <th className="p-2.5 w-10 text-center font-semibold">
                    <input
                      type="checkbox"
                      checked={isAllOnPageSelected}
                      onChange={handleSelectAllOnPage}
                      className="rounded border-slate-300 dark:border-slate-700 text-[#103701] focus:ring-[#103701] h-3.5 w-3.5 cursor-pointer"
                    />
                  </th>
                )}

                <th className="p-2.5 text-left font-semibold">Code</th>
                <th className="p-2.5 text-left font-semibold">
                  Supplier Name
                </th>
                <th className="p-2.5 text-left font-semibold">
                  Payment Terms
                </th>
                <th className="p-2.5 text-left font-semibold">Email</th>
                <th className="p-2.5 text-left font-semibold">Phone</th>
                <th className="p-2.5 text-left font-semibold">City</th>
                <th className="p-2.5 text-left font-semibold">Postcode</th>
                <th className="p-2.5 text-left font-semibold">Country</th>

                {!multiple && (
                  <th className="p-2.5 text-center font-semibold">
                    Action
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {/* EMPTY STATE */}
              {!loading && suppliers.length === 0 && (
                <tr>
                  <td
                    colSpan={multiple ? 9 : 9}
                    className="text-center py-12 text-slate-500"
                  >
                    No suppliers found matching your query
                  </td>
                </tr>
              )}

              {/* LOADING STATE */}
              {loading && suppliers.length === 0 && (
                <tr>
                  <td
                    colSpan={multiple ? 9 : 9}
                    className="text-center py-12 text-slate-500"
                  >
                    Loading suppliers...
                  </td>
                </tr>
              )}

              {/* DATA */}
              {suppliers.map((supplier) => {
                const isChecked = selectedRecords.some(
                  (selected) => selected.id === supplier.id,
                );

                return (
                  <tr
                    key={supplier.id}
                    onClick={() => {
                      if (multiple) {
                        handleToggleRow(supplier);
                      }
                    }}
                    className={`transition-colors ${
                      multiple ? "cursor-pointer" : ""
                    } ${
                      isChecked
                        ? "bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/50"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    {/* ROW CHECKBOX */}
                    {multiple && (
                      <td
                        className="p-2.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(supplier)}
                          className="rounded border-slate-300 dark:border-slate-700 text-[#103701] focus:ring-[#103701] h-3.5 w-3.5 cursor-pointer"
                        />
                      </td>
                    )}

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

                    {/* SINGLE SELECT ACTION */}
                    {!multiple && (
                      <td className="p-2.5 text-center">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();

                            if (onSelect) {
                              onSelect(supplier);
                            }

                            onClose();
                          }}
                          className="bg-[#103701] hover:bg-[#0c2b01] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white h-7 px-3 text-xs rounded transition"
                        >
                          Select
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          {/* PAGINATION INFO */}
          <div>
            Showing {suppliers.length > 0 ? (page - 1) * limit + 1 : 0} to{" "}
            {Math.min(page * limit, pagination.total)} of{" "}
            {pagination.total} suppliers
          </div>

          <div className="flex items-center gap-4">
            {/* ROWS PER PAGE */}
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

            {/* PAGINATION */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) => Math.max(prev - 1, 1))
                }
                disabled={page === 1 || loading}
                className="h-8 px-2"
              >
                <Icon
                  icon="tabler:chevron-left"
                  className="text-base"
                />
              </Button>

              <span className="px-2 font-medium">
                Page {page} of {pagination.totalPages || 1}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) =>
                    Math.min(
                      prev + 1,
                      pagination.totalPages,
                    ),
                  )
                }
                disabled={
                  page >= pagination.totalPages || loading
                }
                className="h-8 px-2"
              >
                <Icon
                  icon="tabler:chevron-right"
                  className="text-base"
                />
              </Button>
            </div>

            {/* MULTIPLE SELECT ACTIONS */}
            {multiple && (
              <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                <Button
                  onClick={handleSubmitBatch}
                  disabled={selectedRecords.length === 0}
                  className="bg-[#103701] hover:bg-[#0c2b01] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white h-8 px-3 text-xs rounded transition disabled:opacity-40"
                >
                  Add Selected ({selectedRecords.length})
                </Button>

                <Button
                  variant="outline"
                  onClick={onClose}
                  className="h-8 px-3 text-xs rounded"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

