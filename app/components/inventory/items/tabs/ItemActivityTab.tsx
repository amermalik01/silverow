// app/components/inventory/items/tabs/ItemActivityTab.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { useLoader } from "@/app/context/LoaderContext";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { format } from "date-fns";

interface WarehouseStock {
  warehouse_id: string;
  warehouse_name: string;
  warehouse_code: string;
  location_title?: string;
  batch_no?: string;
  serial_no?: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  average_cost?: number;
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
  const [typeFilter, setTypeFilter] = useState("ALL");

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

  const filteredTransactions = data.transactions.filter((tx) => {

    // console.log('searchQuery === ',searchQuery);
    // console.log('tx === ',tx);
    const matchesSearch =
      !searchQuery.trim() ||
      tx.transaction_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.warehouse_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.batch_no &&
        tx.batch_no.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.serial_no &&
        tx.serial_no.toLowerCase().includes(searchQuery.toLowerCase()));


    // console.log('matchesSearch === ',matchesSearch);

    const matchesType =
      typeFilter === "ALL" || tx.transaction_type === typeFilter;

    return matchesSearch && matchesType;
  });

  const getTransactionBadge = (type: string) => {
    const styles: Record<string, string> = {
      PURCHASE_RECEIPT:
        "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400",
      SALES_SHIPMENT:
        "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400",
      STOCK_TRANSFER_IN:
        "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-400",
      STOCK_TRANSFER_OUT:
        "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-400",
      OPENING_BALANCE:
        "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      ITEM_JOURNAL_IN:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
      ITEM_JOURNAL_OUT:
        "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400",
      DEBIT_NOTE_RETURN:
        "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
      CREDIT_NOTE_RETURN:
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400",
    };

    return (
      <span
        className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${styles[type] || "bg-slate-100 text-slate-600"}`}
      >
        {type.replace(/_/g, " ")}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 capitalize tracking-wider">
              Total Stock
            </span>
            <Icon icon="tabler:packages" className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-1">
            {Number(data.summary.totalPhysical).toLocaleString(undefined, {
              minimumFractionDigits: 0,
            })}
          </div>
        </div>

        <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 rounded border border-amber-200/50 dark:border-amber-900/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 capitalize tracking-wider">
              Allocated Stock
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

        <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded border border-emerald-200/50 dark:border-emerald-900/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 capitalize tracking-wider">
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
      </div> */}

      {/* Sub-navigation Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1 bg-[#eef3ec] dark:bg-slate-800 p-1 rounded-xl text-xs w-fit border border-[#d5e2d2] dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveSubView("stock")}
            className={`px-4 py-2 rounded-lg transition-all duration-200 capitalize ${
              activeSubView === "stock"
                ? "bg-[#d5e2d2] text-[#36543b] dark:bg-[#45634a] dark:text-white font-semibold shadow-sm"
                : "text-[#6b806c] hover:bg-[#e1eadf] hover:text-[#36543b] dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            }`}
          >
            Warehouse Stock
          </button>
          <button
            type="button"
            onClick={() => setActiveSubView("transactions")}
            className={`px-4 py-2 rounded-lg transition-all duration-200 capitalize ${
              activeSubView === "transactions"
                ? "bg-[#d5e2d2] text-[#36543b] dark:bg-[#45634a] dark:text-white font-semibold shadow-sm"
                : "text-[#6b806c] hover:bg-[#e1eadf] hover:text-[#36543b] dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            }`}
          >
            Movement Transactions
          </button>
          {/* <button
            type="button"
            onClick={() => setActiveSubView("allocations")}
            className={`px-4 py-2 rounded-lg transition-all duration-200 capitalize ${
              activeSubView === "allocations"
                ? "bg-[#d5e2d2] text-[#36543b] dark:bg-[#45634a] dark:text-white font-semibold shadow-sm"
                : "text-[#6b806c] hover:bg-[#e1eadf] hover:text-[#36543b] dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            }`}
          >
            Allocations
          </button> */}
        </div>

        {activeSubView === "transactions" && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded px-2.5 py-1.5 focus:outline-none"
            >
              <option value="ALL">All Modules</option>
              <option value="OPENING_BALANCE">Opening Balance</option>
              <option value="PURCHASE_RECEIPT">Purchase Receipt</option>
              <option value="SALES_SHIPMENT">Sales Shipment</option>
              <option value="STOCK_TRANSFER_IN">Stock Transfer In</option>
              <option value="STOCK_TRANSFER_OUT">Stock Transfer Out</option>
              <option value="ITEM_JOURNAL_IN">Item Journal In</option>
              <option value="ITEM_JOURNAL_OUT">Item Journal Out</option>
              <option value="DEBIT_NOTE_RETURN">Debit Note</option>
              <option value="CREDIT_NOTE_RETURN">Credit Note</option>
            </select>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference, batch,serial..."
              className="w-full sm:w-48 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded px-3 py-1.5 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* 1. Warehouse Stock Distribution */}
      {activeSubView === "stock" && (
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
          <table className="w-full text-left text-xs table-fixed border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-2.5">Warehouse</th>
                <th className="p-2.5">Location</th>
                <th className="p-2.5">Batch / Serial</th>
                <th className="p-2.5 text-right">Total Qty</th>
                <th className="p-2.5 text-right">Allocated Qty</th>
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
                    No active stock layers found in ledger.
                  </td>
                </tr>
              ) : (
                data.warehouseStock.map((row, idx) => (
                  <tr
                    key={idx}
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
                      {Number(row.quantity)}
                    </td>
                    <td className="p-2.5 text-right text-amber-600 font-medium">
                      {Number(row.reserved_quantity)}
                    </td>
                    <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {Number(row.available_quantity)}
                    </td>
                    <td className="p-2.5 text-right text-slate-500">
                      {row.average_cost
                        ? Number(row.average_cost).toFixed(2)
                        : "-"}
                    </td>
                    <td className="p-2.5 text-center font-sans text-slate-500">
                      {row.expiry_date
                        ? format(new Date(row.expiry_date), "dd/MM/yyyy")
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
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
          <table className="w-full text-left table-fixed text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-2.5">Date</th>
                {/* <th className="p-2.5">Reference ID</th> */}
                <th className="p-2.5">Transaction Type</th>
                <th className="p-2.5">Warehouse</th>
                {/* <th className="p-2.5">Location</th> */}
                <th className="p-2.5">Batch</th>
                <th className="p-2.5">Serial No.</th>
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
                    No ledger movement history recorded.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isIn = tx.movement_direction?.toUpperCase() === "IN";
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                    >
                      <td className="p-2.5 font-sans text-slate-600">
                        {tx.posting_date
                          ? format(new Date(tx.posting_date), "dd/MM/yyyy")
                          : "—"}
                      </td>
                      {/* <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200 truncate" title={tx.reference_id}>
                        {tx.reference_id || tx.id.slice(0, 8)}
                      </td> */}
                      <td className="p-2.5 font-sans">
                        {getTransactionBadge(tx.transaction_type)}
                      </td>
                      <td className="p-2.5 font-sans text-slate-700 dark:text-slate-300">
                        {tx.warehouse_name}
                      </td>
                      {/* <td className="p-2.5 font-sans text-slate-700 dark:text-slate-300">
                        {tx.location_title || "-"}
                      </td> */}
                      <td className="p-2.5 font-sans text-slate-700 dark:text-slate-300">
                        {tx.batch_no || "-"}
                      </td>
                      <td className="p-2.5 font-sans text-slate-700 dark:text-slate-300">
                        {tx.serial_no || "-"}
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
                        {isIn ? "" : "-"}
                        {Number(tx.quantity)}
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
      {/* {activeSubView === "allocations" && (
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
          <table className="w-full text-left table-fixed text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-2.5">Created Date</th>
                <th className="p-2.5">Warehouse</th>
                <th className="p-2.5">Batch No.</th>
                <th className="p-2.5">Bin Code</th>
                <th className="p-2.5 text-right">Allocated Qty</th>
                <th className="p-2.5 text-right">Unit Cost</th>
    
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
                        ? format(new Date(alloc.created_at), "dd/MM/yyyy")
                        : "—"}
                    </td>
                    <td className="p-2.5 font-sans text-slate-800 dark:text-slate-200">
                      {alloc.warehouse_name}
                    </td>
                    <td className="p-2.5 text-slate-600">
                      {alloc.batch_no || "-"}
                    </td>
                    <td className="p-2.5 text-slate-600">
                      {alloc.bin_code || "-"}
                    </td>
                    <td className="p-2.5 text-slate-500 font-sans capitalize text-[10px]">{alloc.allocation_method || "FIFO"}</td>
                    <td className="p-2.5 text-right font-bold text-amber-600">
                      {Number(alloc.allocated_quantity)}
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
      )} */}
    </div>
  );
}
