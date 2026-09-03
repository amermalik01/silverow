// /app/components/sales/tickets/SupportTicketListView.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { SupportTicket } from "./SupportTicketFormView";
import { Button } from "@/components/ui/button";

type Props = {
  slug: string;
};

interface ColumnFilters {
  open_date_from: string;
  open_date_to: string;
  close_date_from: string;
  close_date_to: string;
  ticket_no: string;
  customer_no: string;
  customer_name: string;
  status: string;
  apply_to_si: string;
  apply_to_item: string;
  ref_no: string;
  batch_frame_no: string;
  cust_order_no: string;
  city: string;
}

export default function SupportTicketListView({ slug }: Props) {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Column Filter Input States matching your image's multi-input matrix layout
  const [filters, setFilters] = useState<ColumnFilters>({
    open_date_from: "",
    open_date_to: "",
    close_date_from: "",
    close_date_to: "",
    ticket_no: "",
    customer_no: "",
    customer_name: "",
    status: "",
    apply_to_si: "",
    apply_to_item: "",
    ref_no: "",
    batch_frame_no: "",
    cust_order_no: "",
    city: "",
  });

  // Fetch mock or live API database records
  useEffect(() => {
    async function fetchTickets() {
      try {
        setLoading(true);
        const res = await fetch("/api/sales/support-tickets");
        if (res.ok) {
          const data = await res.json();
          setTickets(data || []);
        } else {
          // Fallback static visualization data matching screenshot properties if api isn't bound yet
          setTickets([
            { ticket_no: "ST0033", customer_no: "CU0120", customer_name: "E-Bikes Direct", open_date: "2026-01-28", close_date: "2026-01-28", apply_to_si: "SI4911", apply_to_item: "HY0243 - Hygge Vester Step25 - Heron White", ref_no: "GL10GI-709", status: "Open", city: "Bodiam", country: "UK" },
            { ticket_no: "ST0032", customer_no: "CU0145", customer_name: "Apex Wheels", open_date: "2026-01-26", close_date: "2026-01-26", apply_to_si: "", apply_to_item: "", ref_no: "", status: "In Progress", city: "London", country: "UK" },
            { ticket_no: "ST0031", customer_no: "CU0092", customer_name: "Velocipede Traders", open_date: "2026-01-13", close_date: "2026-01-26", apply_to_si: "SI4494", apply_to_item: "HY0238 - Hygge Vester", ref_no: "GL10GI-798", status: "Waiting Return", city: "Manchester", country: "UK" },
            { ticket_no: "ST0030", customer_no: "CU0120", customer_name: "E-Bikes Direct", open_date: "2026-01-19", close_date: "2026-01-19", apply_to_si: "", apply_to_item: "", ref_no: "", status: "Repair", city: "Bodiam", country: "UK" },
            { ticket_no: "ST0029", customer_no: "CU0301", customer_name: "Volt Logistics", open_date: "2026-01-16", close_date: "2026-01-16", apply_to_si: "SI4938", apply_to_item: "HY0239 - Hygge", ref_no: "", status: "Closed", city: "Bristol", country: "UK" },
            { ticket_no: "ST0028", customer_no: "CU0210", customer_name: "Cycle Dynamics", open_date: "2026-01-14", close_date: "2026-01-14", apply_to_si: "SI5560", apply_to_item: "HY0024 - Hygge", ref_no: "", status: "Closed", city: "Leeds", country: "UK" },
            { ticket_no: "ST0027", customer_no: "CU0111", customer_name: "Eco Motion Ltd", open_date: "2025-03-20", close_date: "2025-03-20", apply_to_si: "SI2754", apply_to_item: "HY0114 - Hygge", ref_no: "", status: "Closed", city: "Glasgow", country: "UK" },
          ]);
        }
      } catch (err) {
        console.error("Could not fetch tickets dynamic payload:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTickets();
  }, []);

  const handleFilterChange = (key: keyof ColumnFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      open_date_from: "", open_date_to: "", close_date_from: "", close_date_to: "",
      ticket_no: "", customer_no: "", customer_name: "", status: "",
      apply_to_si: "", apply_to_item: "", ref_no: "", batch_frame_no: "",
      cust_order_no: "", city: "",
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTickets(filteredTickets.map((t) => t.ticket_no));
    } else {
      setSelectedTickets([]);
    }
  };

  const handleSelectRow = (ticketNo: string, checked: boolean) => {
    if (checked) {
      setSelectedTickets((prev) => [...prev, ticketNo]);
    } else {
      setSelectedTickets((prev) => prev.filter((id) => id !== ticketNo));
    }
  };

  // Perform filtering processing logic safely on variables
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (filters.ticket_no && !t.ticket_no.toLowerCase().includes(filters.ticket_no.toLowerCase())) return false;
      if (filters.customer_no && !t.customer_no?.toLowerCase().includes(filters.customer_no.toLowerCase())) return false;
      if (filters.customer_name && !t.customer_name?.toLowerCase().includes(filters.customer_name.toLowerCase())) return false;
      if (filters.status && !t.status?.toLowerCase().includes(filters.status.toLowerCase())) return false;
      if (filters.apply_to_si && !t.apply_to_si?.toLowerCase().includes(filters.apply_to_si.toLowerCase())) return false;
      if (filters.apply_to_item && !t.apply_to_item?.toLowerCase().includes(filters.apply_to_item.toLowerCase())) return false;
      if (filters.ref_no && !t.ref_no?.toLowerCase().includes(filters.ref_no.toLowerCase())) return false;
      if (filters.batch_frame_no && !t.batch_frame_no?.toLowerCase().includes(filters.batch_frame_no.toLowerCase())) return false;
      if (filters.cust_order_no && !t.cust_order_no?.toLowerCase().includes(filters.cust_order_no.toLowerCase())) return false;
      if (filters.city && !t.city?.toLowerCase().includes(filters.city.toLowerCase())) return false;

      // Date Range Match Operations
      if (filters.open_date_from && t.open_date < filters.open_date_from) return false;
      if (filters.open_date_to && t.open_date > filters.open_date_to) return false;
      if (filters.close_date_from && (!t.close_date || t.close_date < filters.close_date_from)) return false;
      if (filters.close_date_to && (!t.close_date || t.close_date > filters.close_date_to)) return false;

      return true;
    });
  }, [tickets, filters]);

  // Compute pagination parameters 
  const paginatedTickets = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTickets.slice(startIndex, startIndex + pageSize);
  }, [filteredTickets, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTickets.length / pageSize) || 1;

  const headerFilterInputStyle =
    "w-full block border border-slate-300 dark:border-slate-700 p-0.5 rounded text-[11px] font-normal text-black bg-white dark:bg-slate-900 focus:outline-none focus:border-emerald-500 text-center";

  return (
    <div className="space-y-3 p-1 text-black dark:text-white ">
      
      {/* Top Main Command Header Strip */}
      <div className="flex justify-between items-center bg-transparent border-b pb-2">
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-slate-500 capitalize tracking-wider">Sales</span>
          <span className="text-xs text-slate-400">/</span>
          <span className="text-xs font-semibold text-slate-500 capitalize tracking-wider">Customers</span>
          <span className="text-xs text-slate-400">/</span>
          <span className="text-xs font-bold bg-emerald-600 text-white px-2 py-0.5 rounded capitalize">Support Tickets</span>
        </div>
        
        <Button
          type="button"
          onClick={() => router.push(`/${slug}/sales/support-ticket/new`)}
          variant="add_line"
          // className="bg-emerald-800 text-white hover:bg-emerald-900 text-xs font-bold px-4 py-1.5 rounded transition shadow-sm"
        >
          Add
        </Button>
      </div>

      {/* Ribbon Toolbar Quick Configuration Icons */}
      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 pb-1">
        <button type="button" className="p-1 border bg-white dark:bg-slate-800 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Grid Config">
          <Icon icon="tabler:settings" className="w-4 h-4 text-emerald-700" />
        </button>
        <button type="button" className="p-1 border bg-white dark:bg-slate-800 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Advanced Search">
          <Icon icon="tabler:filter" className="w-4 h-4 text-sky-600" />
        </button>
        <button type="button" onClick={clearFilters} className="p-1 border bg-white dark:bg-slate-800 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Reset Filters">
          <Icon icon="tabler:rotate" className="w-4 h-4 text-orange-500" />
        </button>
        <button type="button" className="p-1 border bg-white dark:bg-slate-800 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Save Layout View">
          <Icon icon="tabler:device-floppy" className="w-4 h-4 text-blue-600" />
        </button>
        <button type="button" className="p-1 border bg-white dark:bg-slate-800 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Export Current Result">
          <Icon icon="tabler:download" className="w-4 h-4 text-emerald-600" />
        </button>
      </div>

      {/* Main Table Grid Canvas Matrix Frame Container */}
      <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left table-fixed text-xs min-w-[1800px]">
            {/* Header Matrix Configuration Layer Row */}
            <thead className="bg-emerald-800 dark:bg-emerald-950 text-white select-none font-bold text-[11px]">
              <tr>
                {/* CHECKBOX CELL HEAD */}
                <th className="p-1.5 w-10 text-center border-r border-emerald-700/50">
                  <input
                    type="checkbox"
                    className="rounded text-emerald-600 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                    onChange={(e) => handleFilterChange("status", e.target.value)} // Reutilized structure placeholder
                    checked={filteredTickets.length > 0 && selectedTickets.length === filteredTickets.length}
                    onClick={() => handleSelectAll(selectedTickets.length !== filteredTickets.length)}
                  />
                </th>
                
                <th className="p-1.5 w-32 border-r border-emerald-700/50">Open Date</th>
                <th className="p-1.5 w-32 border-r border-emerald-700/50">Close Date</th>
                <th className="p-1.5 w-28 border-r border-emerald-700/50">Ticket No.</th>
                <th className="p-1.5 w-28 border-r border-emerald-700/50">Customer No.</th>
                <th className="p-1.5 w-48 border-r border-emerald-700/50">Name</th>
                <th className="p-1.5 w-28 border-r border-emerald-700/50">Current Stage</th>
                <th className="p-1.5 w-24 border-r border-emerald-700/50">Docs. Attac...</th>
                <th className="p-1.5 w-32 border-r border-emerald-700/50">Applied To SI</th>
                <th className="p-1.5 w-48 border-r border-emerald-700/50">Applied To I...</th>
                <th className="p-1.5 w-32 border-r border-emerald-700/50">Ref. No.</th>
                <th className="p-1.5 w-32 border-r border-emerald-700/50">Batch No.</th>
                <th className="p-1.5 w-32 border-r border-emerald-700/50">Cust. Order No.</th>
                <th className="p-1.5 w-28">City</th>
              </tr>

              {/* FILTER INPUT MATRIX ROW - Directly maps structure from screenshot */}
              <tr className="bg-emerald-900/60 dark:bg-emerald-950/80 border-t border-emerald-800">
                <td className="p-1 border-r border-emerald-700/40 text-center">-</td>
                
                {/* Open Date Split Input Block */}
                <td className="p-1 border-r border-emerald-700/40 space-y-0.5">
                  <input type="text" placeholder="From" className={headerFilterInputStyle} value={filters.open_date_from} onChange={(e) => handleFilterChange("open_date_from", e.target.value)} />
                  <input type="text" placeholder="To" className={headerFilterInputStyle} value={filters.open_date_to} onChange={(e) => handleFilterChange("open_date_to", e.target.value)} />
                </td>

                {/* Close Date Split Input Block */}
                <td className="p-1 border-r border-emerald-700/40 space-y-0.5">
                  <input type="text" placeholder="From" className={headerFilterInputStyle} value={filters.close_date_from} onChange={(e) => handleFilterChange("close_date_from", e.target.value)} />
                  <input type="text" placeholder="To" className={headerFilterInputStyle} value={filters.close_date_to} onChange={(e) => handleFilterChange("close_date_to", e.target.value)} />
                </td>

                <td className="p-1 border-r border-emerald-700/40">
                  <input type="text" className={headerFilterInputStyle} value={filters.ticket_no} onChange={(e) => handleFilterChange("ticket_no", e.target.value)} />
                </td>
                <td className="p-1 border-r border-emerald-700/40">
                  <input type="text" className={headerFilterInputStyle} value={filters.customer_no} onChange={(e) => handleFilterChange("customer_no", e.target.value)} />
                </td>
                <td className="p-1 border-r border-emerald-700/40">
                  <input type="text" className={headerFilterInputStyle} value={filters.customer_name} onChange={(e) => handleFilterChange("customer_name", e.target.value)} />
                </td>
                <td className="p-1 border-r border-emerald-700/40">
                  <input type="text" className={headerFilterInputStyle} value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)} />
                </td>
                
                {/* Docs. Attached Tracker Filter Placeholder */}
                <td className="p-1 border-r border-emerald-700/40 space-y-0.5">
                  <input type="text" placeholder="From" className={headerFilterInputStyle} disabled />
                  <input type="text" placeholder="To" className={headerFilterInputStyle} disabled />
                </td>

                <td className="p-1 border-r border-emerald-700/40">
                  <input type="text" className={headerFilterInputStyle} value={filters.apply_to_si} onChange={(e) => handleFilterChange("apply_to_si", e.target.value)} />
                </td>
                <td className="p-1 border-r border-emerald-700/40">
                  <input type="text" className={headerFilterInputStyle} value={filters.apply_to_item} onChange={(e) => handleFilterChange("apply_to_item", e.target.value)} />
                </td>
                <td className="p-1 border-r border-emerald-700/40">
                  <input type="text" className={headerFilterInputStyle} value={filters.ref_no} onChange={(e) => handleFilterChange("ref_no", e.target.value)} />
                </td>
                <td className="p-1 border-r border-emerald-700/40">
                  <input type="text" className={headerFilterInputStyle} value={filters.batch_frame_no} onChange={(e) => handleFilterChange("batch_frame_no", e.target.value)} />
                </td>
                <td className="p-1 border-r border-emerald-700/40">
                  <input type="text" className={headerFilterInputStyle} value={filters.cust_order_no} onChange={(e) => handleFilterChange("cust_order_no", e.target.value)} />
                </td>
                <td className="p-1">
                  <input type="text" className={headerFilterInputStyle} value={filters.city} onChange={(e) => handleFilterChange("city", e.target.value)} />
                </td>
              </tr>
            </thead>

            {/* Content Rendering Grid Array Stream */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={14} className="p-8 text-center text-slate-400 italic font-medium">Hydrating listing records archive matrices...</td>
                </tr>
              ) : paginatedTickets.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-8 text-center text-slate-400 italic font-medium">No matching support records map to parameter bounds filters.</td>
                </tr>
              ) : (
                paginatedTickets.map((t, idx) => {
                  const isSelected = selectedTickets.includes(t.ticket_no);
                  
                  // Simple Date parsing conversion logic for UK view representation format (DD/MM/YYYY)
                  const formatToUK = (dateStr?: string) => {
                    if (!dateStr) return "-";
                    const parts = dateStr.split("-");
                    if (parts.length !== 3) return dateStr;
                    return `${parts[2]}/${parts[1]}/${parts[0]}`;
                  };

                  return (
                    <tr
                      key={t.ticket_no || idx}
                      onDoubleClick={() => router.push(`/${slug}/sales/tickets/${t.ticket_no}`)}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer select-none text-[11px] font-medium h-7 ${isSelected ? "bg-blue-50/60 dark:bg-blue-950/20" : ""}`}
                    >
                      <td className="p-1 text-center border-r dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded text-emerald-600 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(t.ticket_no, e.target.checked)}
                        />
                      </td>
                      <td className="p-1 px-2 border-r dark:border-slate-800 whitespace-nowrap">{formatToUK(t.open_date)}</td>
                      <td className="p-1 px-2 border-r dark:border-slate-800 whitespace-nowrap">{formatToUK(t.close_date)}</td>
                      <td className="p-1 px-2 border-r dark:border-slate-800 font-bold text-blue-600 dark:text-blue-400 hover:underline">{t.ticket_no}</td>
                      <td className="p-1 px-2 border-r dark:border-slate-800 font-mono text-slate-500">{t.customer_no || "-"}</td>
                      <td className="p-1 px-2 border-r dark:border-slate-800 font-semibold truncate max-w-[180px]">{t.customer_name || "-"}</td>
                      <td className="p-1 px-2 border-r dark:border-slate-800 text-center capitalize tracking-wider text-[10px] font-bold">
                        <span className={`px-1.5 py-0.5 rounded ${
                          t.status === "Open" ? "bg-sky-100 text-sky-800" :
                          t.status === "In Progress" ? "bg-amber-100 text-amber-800" :
                          t.status === "Closed" ? "bg-slate-100 text-slate-800" : "bg-emerald-100 text-emerald-800"
                        }`}>{t.status}</span>
                      </td>
                      <td className="p-1 px-2 border-r dark:border-slate-800 text-center font-mono">0</td>
                      <td className="p-1 px-2 border-r dark:border-slate-800 font-medium text-slate-600 dark:text-slate-400">{t.apply_to_si || "-"}</td>
                      <td className="p-1 px-2 border-r dark:border-slate-800 truncate max-w-[220px]" title={t.apply_to_item}>{t.apply_to_item || "-"}</td>
                      <td className="p-1 px-2 border-r dark:border-slate-800 text-slate-500 font-mono">{t.ref_no || "-"}</td>
                      <td className="p-1 px-2 border-r dark:border-slate-800 text-slate-400 font-mono">{t.batch_frame_no || "-"}</td>
                      <td className="p-1 px-2 border-r dark:border-slate-800 text-slate-400 font-mono">{t.cust_order_no || "-"}</td>
                      <td className="p-1 px-2 truncate max-w-[120px]">{t.city || "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Drawer Control Pagination Dashboard Bar Component */}
      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500">
        <div className="flex items-center gap-1">
          <span className="text-emerald-700 font-bold">{filteredTickets.length}</span>
          <span>Total Records</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <span>Showing {filteredTickets.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredTickets.length)} Records</span>
            <select
              className="border p-0.5 rounded text-xs bg-white dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-300 outline-none"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Navigation Control Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="p-1 border rounded bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
            >
              <Icon icon="tabler:chevron-left" className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-slate-600 dark:text-slate-400">Page {currentPage} of {totalPages}</span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="p-1 border rounded bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
            >
              <Icon icon="tabler:chevron-right" className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}