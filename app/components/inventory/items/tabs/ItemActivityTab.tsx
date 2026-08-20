// app/components/inventory/items/tabs/ItemActivityTab.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useLoader } from "@/app/context/LoaderContext";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { format } from "date-fns";

interface WarehouseStock {
  id: string;
  warehouse_id: string;
  warehouse_name: string;
  warehouse_code: string;
  location_title?: string;
  location_code?: string;
  batch_no?: string;
  serial_no?: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  average_cost?: number;
  last_movement_at?: string;
  expiry_date?: string;
}

interface TransactionMovement {
  id: string;
  transaction_no: string;
  transaction_type: string;
  reference_type?: string;
  posting_date: string;
  status: string;
  warehouse_name: string;
  quantity: number;
  movement_direction: "IN" | "OUT";
  unit_cost: number;
  total_cost: number;
  batch_no?: string;
  serial_no?: string;
  created_at: string;
}

interface InventoryAllocation {
  id: string;
  warehouse_name: string;
  batch_no?: string;
  bin_code?: string;
  allocated_quantity: number;
  unit_cost: number;
  total_cost: number;
  allocation_method: string;
  status: string;
  created_at: string;
  sales_order_line_id?: string;
  purchase_order_line_id?: string;
}

interface ActivityData {
  summary: {
    totalPhysical: number;
    totalReserved: number;
    totalAvailable: number;
  };
  warehouseStock: WarehouseStock[];
  transactions: TransactionMovement[];
  allocations: InventoryAllocation[];
}

interface Props {
  itemId: string;
}

export default function ItemActivityTab({ itemId }: Props) {
  const { show, hide } = useLoader();
  const [data, setData] = useState<ActivityData>({
    summary: { totalPhysical: 0, totalReserved: 0, totalAvailable: 0 },
    warehouseStock: [],
    transactions: [],
    allocations: [],
  });

  const [activeSubView, setActiveSubView] = useState<
    "stock" | "transactions" | "allocations"
  >("stock");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchActivity = useCallback(async () => {
    if (!itemId) return;
    show("Loading Item Activity...");
    try {
      const res = await fetch(`/api/inventory/items/${itemId}/activity`);
      if (!res.ok) throw new Error("Failed to load activity logs.");
      const result = await res.json();
      setData(result);
    } catch (err) {
      const e = err as Error;
      toast.error(e.message || "Error fetching item activity.");
    } finally {
      hide();
    }
  }, [itemId, show, hide]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // Filtering transactions
  const filteredTransactions = data.transactions.filter((tx) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      tx.transaction_no.toLowerCase().includes(q) ||
      tx.transaction_type.toLowerCase().includes(q) ||
      tx.warehouse_name.toLowerCase().includes(q) ||
      (tx.batch_no && tx.batch_no.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Physical Stock
            </span>
            <Icon icon="tabler:packages" className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-1">
            {Number(data.summary.totalPhysical).toLocaleString(undefined, {
              minimumFractionDigits: 0,
            })}
          </div>
        </div>

        <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/50 dark:border-amber-900/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Reserved Stock
            </span>
            <Icon
              icon="tabler:lock-check"
              className="w-5 h-5 text-amber-500 dark:text-amber-400"
            />
          </div>
          <div className="text-xl font-bold font-mono text-amber-800 dark:text-amber-300 mt-1">
            {Number(data.summary.totalReserved).toLocaleString(undefined, {
              minimumFractionDigits: 0,
            })}
          </div>
        </div>

        <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/50 dark:border-emerald-900/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Available Stock
            </span>
            <Icon
              icon="tabler:circle-check"
              className="w-5 h-5 text-emerald-500 dark:text-emerald-400"
            />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-800 dark:text-emerald-300 mt-1">
            {Number(data.summary.totalAvailable).toLocaleString(undefined, {
              minimumFractionDigits: 0,
            })}
          </div>
        </div>
      </div>

      {/* Sub-navigation Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setActiveSubView("stock")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSubView === "stock"
                ? "bg-white dark:bg-slate-700 font-semibold shadow-sm text-slate-800 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Warehouse Stock
          </button>
          <button
            type="button"
            onClick={() => setActiveSubView("transactions")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSubView === "transactions"
                ? "bg-white dark:bg-slate-700 font-semibold shadow-sm text-slate-800 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Movement Transactions
          </button>
          <button
            type="button"
            onClick={() => setActiveSubView("allocations")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSubView === "allocations"
                ? "bg-white dark:bg-slate-700 font-semibold shadow-sm text-slate-800 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Allocations
          </button>
        </div>

        {activeSubView === "transactions" && (
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tx no, batch..."
            className="w-full sm:w-64 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        )}
      </div>

      {/* 1. Warehouse Stock Distribution */}
      {activeSubView === "stock" && (
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-2.5">Warehouse</th>
                <th className="p-2.5">Location</th>
                <th className="p-2.5">Batch / Serial</th>
                <th className="p-2.5 text-right">Physical Qty</th>
                <th className="p-2.5 text-right">Reserved Qty</th>
                <th className="p-2.5 text-right">Available Qty</th>
                <th className="p-2.5 text-right">Avg Cost</th>
                <th className="p-2.5 text-center">Expiry Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {data.warehouseStock.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-4 text-center text-slate-400 font-sans"
                  >
                    No stock inventory records found.
                  </td>
                </tr>
              ) : (
                data.warehouseStock.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                  >
                    <td className="p-2.5 font-sans font-medium text-slate-800 dark:text-slate-200">
                      {row.warehouse_name}{" "}
                      <span className="text-slate-400 text-[10px]">
                        ({row.warehouse_code})
                      </span>
                    </td>
                    <td className="p-2.5 font-sans text-slate-600 dark:text-slate-400">
                      {row.location_title || "-"}
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400">
                      {row.batch_no || row.serial_no || "-"}
                    </td>
                    <td className="p-2.5 text-right font-medium">
                      {Number(row.quantity).toFixed(2)}
                    </td>
                    <td className="p-2.5 text-right text-amber-600 font-medium">
                      {Number(row.reserved_quantity).toFixed(2)}
                    </td>
                    <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {Number(row.available_quantity).toFixed(2)}
                    </td>
                    <td className="p-2.5 text-right text-slate-500">
                      {row.average_cost
                        ? Number(row.average_cost).toFixed(2)
                        : "-"}
                    </td>
                    <td className="p-2.5 text-center font-sans text-slate-500">
                      {row.expiry_date
                        ? format(row.expiry_date, "dd/MM/yyyy")
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. Movement Transactions */}
      {activeSubView === "transactions" && (
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Transaction No</th>
                <th className="p-2.5">Type</th>
                <th className="p-2.5">Warehouse</th>
                <th className="p-2.5 text-center">Direction</th>
                <th className="p-2.5 text-right">Quantity</th>
                <th className="p-2.5 text-right">Unit Cost</th>
                <th className="p-2.5 text-right">Total Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-4 text-center text-slate-400 font-sans"
                  >
                    No transaction history recorded.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isIn =
                    tx.movement_direction?.toUpperCase() === "IN" ||
                    tx.quantity > 0;
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                    >
                      <td className="p-2.5 font-sans text-slate-600">
                        {tx.posting_date
                          ? format(tx.posting_date, "dd/MM/yyyy")
                          : "—"}
                      </td>
                      <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                        {tx.transaction_no}
                      </td>
                      <td className="p-2.5 font-sans text-slate-600 uppercase text-[10px]">
                        {tx.transaction_type}
                      </td>
                      <td className="p-2.5 font-sans text-slate-700 dark:text-slate-300">
                        {tx.warehouse_name}
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isIn
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                          }`}
                        >
                          {isIn ? "IN" : "OUT"}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-bold">
                        {Number(tx.quantity).toFixed(2)}
                      </td>
                      <td className="p-2.5 text-right text-slate-500">
                        {Number(tx.unit_cost || 0).toFixed(2)}
                      </td>
                      <td className="p-2.5 text-right text-slate-700 dark:text-slate-300">
                        {Number(tx.total_cost || 0).toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Allocations View */}
      {activeSubView === "allocations" && (
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-2.5">Created Date</th>
                <th className="p-2.5">Warehouse</th>
                <th className="p-2.5">Batch / Bin</th>
                <th className="p-2.5">Method</th>
                <th className="p-2.5 text-right">Allocated Qty</th>
                <th className="p-2.5 text-right">Unit Cost</th>
                <th className="p-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {data.allocations.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-4 text-center text-slate-400 font-sans"
                  >
                    No active allocations found.
                  </td>
                </tr>
              ) : (
                data.allocations.map((alloc) => (
                  <tr
                    key={alloc.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                  >
                    <td className="p-2.5 font-sans text-slate-600">
                      {alloc.created_at
                        ? format(alloc.created_at, "dd/MM/yyyy")
                        : "—"}
                    </td>
                    <td className="p-2.5 font-sans text-slate-800 dark:text-slate-200">
                      {alloc.warehouse_name}
                    </td>
                    <td className="p-2.5 text-slate-600">
                      {alloc.batch_no || alloc.bin_code || "-"}
                    </td>
                    <td className="p-2.5 text-slate-500 font-sans uppercase text-[10px]">
                      {alloc.allocation_method || "FIFO"}
                    </td>
                    <td className="p-2.5 text-right font-bold text-amber-600">
                      {Number(alloc.allocated_quantity).toFixed(2)}
                    </td>
                    <td className="p-2.5 text-right text-slate-500">
                      {Number(alloc.unit_cost || 0).toFixed(2)}
                    </td>
                    <td className="p-2.5 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {alloc.status || "ACTIVE"}
                      </span>
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
