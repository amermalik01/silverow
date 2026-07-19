// /app/components/sales/tickets/SupportTicketFormView.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import CustomerLookupModal, {
  CustomerLookupItem,
} from "@/app/components/shared/modals/CustomerLookupModal";

import SalespersonLookupModal, {
  Employee,
} from "@/app/components/shared/modals/SalespersonLookupModal";

import SupplierLookupModal, {
  SupplierLookupItem,
} from "@/app/components/shared/modals/SupplierLookupModal";

export type TicketStage =
  | "Open"
  | "In Progress"
  | "Waiting Return"
  | "Repair"
  | "Closed";

export interface TicketNote {
  id?: string;
  ticket_no: string;
  author: string;
  title: string;
  content: string;
  timestamp: string;
}

export interface SupportTicket {
  // Column 1
  ticket_no: string;
  customer_no: string;
  customer_name: string;
  apply_to_si?: string;
  apply_to_item?: string;
  ref_no?: string;
  batch_frame_no?: string;

  // Column 2
  address_1?: string;
  address_2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  cons_no?: string;

  // Column 3
  contact_person?: string;
  telephone?: string;
  email?: string;
  assign_person_id?: string;
  assign_person?: string;
  cust_order_no?: string;
  partner_id?: string;
  partner?: string;

  // Column 4
  open_date: string;
  close_date?: string;
  issue_type?: string | number;
  warranty_check?: "In Warranty" | "Out of Warranty" | "N/A";

  // Documents Links
  link_to_so?: string;
  link_to_po?: string;
  link_to_cn?: string;
  general_description?: string;

  status: TicketStage;
}

type Props = {
  slug: string;
  id?: string;
};

export default function SupportTicketFormView({ slug, id }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Notes List State and Add Note input text modifiers
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [noteSearch, setNoteSearch] = useState("");
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");

  const isUpdateMode = !!id;
  const stages: TicketStage[] = [
    "Open",
    "In Progress",
    "Waiting Return",
    "Repair",
    "Closed",
  ];

  // Core Support Ticket Data State Entity
  const [ticket, setTicket] = useState<SupportTicket>({
    ticket_no: id ? "" : "[Auto-Generated]",
    customer_no: "",
    customer_name: "",
    apply_to_si: "",
    apply_to_item: "",
    ref_no: "",
    batch_frame_no: "",
    address_1: "",
    address_2: "",
    city: "",
    county: "",
    postcode: "",
    country: "UK",
    cons_no: "",
    contact_person: "",
    telephone: "",
    email: "",
    assign_person_id: "",
    assign_person: "",
    cust_order_no: "",
    partner_id: "",
    partner: "",
    open_date: new Date().toISOString().split("T")[0],
    close_date: new Date().toISOString().split("T")[0],
    issue_type: 1,
    warranty_check: "In Warranty",
    link_to_so: "",
    link_to_po: "",
    link_to_cn: "",
    general_description: "",
    status: "Open",
  });

  // Hydrate Ticket and Notes data if loading existing item
  useEffect(() => {
    if (!id) return;

    fetch(`/api/sales/support-tickets/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ticket) setTicket(data.ticket);
        if (data.notes) setNotes(data.notes);
      })
      .catch((err) => console.error("Error fetching ticket dataset:", err));
  }, [id]);

  const updateField = <K extends keyof SupportTicket>(
    field: K,
    value: SupportTicket[K],
  ) => {
    setTicket((prev) => ({ ...prev, [field]: value }));
  };

  const handleStageClick = async (stageName: TicketStage) => {
    if (!id || isUpdatingStatus || ticket.status === stageName) return;

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/sales/support-tickets/${id}/stage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: stageName }),
      });

      if (response.ok) {
        setTicket((prev) => ({ ...prev, status: stageName }));
        toast.success(`Ticket state advanced to: ${stageName}`);
      } else {
        toast.error("Failed to alter pipeline stage parameters.");
      }
    } catch (error) {
      console.error(error);
      toast.error(
        "Network interface error occurred modifying status lifecycle.",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const [selectedSalespersonIds, setSelectedSalespersonIds] = useState<
    string[]
  >([]);
  const [salespersonModalOpen, setSalespersonModalOpen] =
    useState<boolean>(false);

  const handleAssignPersonSelect = (emp: Employee) => {
    setTicket((prev) => ({
      ...prev,
      assign_person_id: emp.id,
      assign_person: emp.employee_code + "-" + emp.display_name,
    }));
    setSupplierModalOpen(false);
  };

  const [supplierModalOpen, setSupplierModalOpen] = useState(false);

  const handleSupplierSelect = (supplier: SupplierLookupItem) => {
    setTicket((prev) => ({
      ...prev,
      partner_id: supplier.id,
      partner: supplier.supplier_code + "-" + supplier.name,
    }));
    setSupplierModalOpen(false);
  };

  const handleCustomerSelect = (customer: CustomerLookupItem) => {
    setTicket((prev) => ({
      ...prev,
      customer_no: customer.id,
      customer_name: customer.name,
      email: customer.email || prev.email,
      address_1: customer.billing_address?.address_1 || prev.address_1,
      address_2: customer.billing_address?.address_2 || prev.address_2,
      city: customer.billing_address?.city || prev.city,
      county: customer.billing_address?.state || prev.county,
      postcode: customer.billing_address?.postcode || prev.postcode,
      country: customer.billing_address?.country || prev.country || "UK",
    }));
    setCustomerModalOpen(false);
  };

  const handleAddNote = () => {
    if (!newNoteContent.trim()) {
      toast.error("Note content description area cannot remain empty.");
      return;
    }

    const createdNote: TicketNote = {
      ticket_no: ticket.ticket_no,
      author: ticket.assign_person || "Current User",
      title: newNoteTitle.trim() || "General Note Entry",
      content: newNoteContent,
      timestamp: new Date().toLocaleString("en-GB", { hour12: false }),
    };

    setNotes([createdNote, ...notes]);
    setNewNoteTitle("");
    setNewNoteContent("");
    toast.success("Chronological tracking record appended locally.");
  };

  const filteredNotes = useMemo(() => {
    if (!noteSearch) return notes;
    return notes.filter(
      (n) =>
        n.content.toLowerCase().includes(noteSearch.toLowerCase()) ||
        n.title.toLowerCase().includes(noteSearch.toLowerCase()),
    );
  }, [notes, noteSearch]);

  const validateForm = (): boolean => {
    const errors: string[] = [];
    if (!ticket.customer_no)
      errors.push(
        "Support Ticket execution requires Customer mapping verification.",
      );
    if (!ticket.open_date)
      errors.push(
        "Open Date parameter bounds require entry definition validation.",
      );

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const save = async () => {
    setValidationErrors([]);
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(
        id ? `/api/sales/support-tickets/${id}` : "/api/sales/support-tickets",
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticket, notes }),
        },
      );

      const json = await res.json();
      if (!res.ok)
        throw new Error(
          json.error || "Execution fault saving entity configuration.",
        );

      toast.success("Support Ticket state updated cleanly.");
      router.push(`/${slug}/sales/tickets`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setValidationErrors([
        err instanceof Error
          ? err.message
          : "Unexpected backend persistence constraint hit.",
      ]);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle =
    "w-full border border-slate-300 dark:border-slate-700 p-1.5 rounded text-sm bg-white dark:bg-slate-900 outline-none focus:border-emerald-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200 shadow-sm";
  const labelStyle =
    "block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5 min-w-[110px]";

  return (
    <div className="space-y-4 container mx-auto p-1 text-black dark:text-white">
      {/* Top Section Nav & Chevron Pipeline Workflow Selector Component */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 justify-between items-center pb-2 flex-wrap gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 border-emerald-600 text-emerald-600 bg-white dark:bg-slate-900"
          >
            General
          </button>
        </div>

        {/* 1. Status Chevron Flow Container Component Block */}
        <div className="flex items-center select-none text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-md p-1">
          {stages.map((stg, index) => {
            const isActive = ticket.status === stg;
            return (
              <button
                type="button"
                key={stg}
                disabled={!isUpdateMode || isUpdatingStatus}
                onClick={() => handleStageClick(stg)}
                className={`px-3 py-1.5 transition-all relative rounded flex items-center ${
                  isActive
                    ? "bg-sky-500 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 disabled:opacity-100"
                }`}
              >
                {stg}
                {index < stages.length - 1 && (
                  <Icon
                    icon="tabler:chevron-right"
                    className="ml-1 text-slate-400 w-3 h-3"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Validation Banners */}
      {validationErrors.length > 0 && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg space-y-1">
          {validationErrors.map((err, idx) => (
            <p
              key={idx}
              className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1"
            >
              <Icon icon="tabler:alert-circle" className="w-3.5 h-3.5" /> {err}
            </p>
          ))}
        </div>
      )}

      {/* Main Structural Matrix Box Input Fields */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
        <h2 className="text-lg font-bold tracking-tight border-b pb-2 text-slate-800 dark:text-slate-100">
          Support Ticket
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* COLUMN 1: IDENTIFICATION & ENTITY BOUNDS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className={labelStyle}>Ticket No.</label>
              <input
                type="text"
                disabled
                className={`${inputStyle} font-semibold bg-slate-50`}
                value={ticket.ticket_no}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className={labelStyle}>Customer No. *</label>
              <div className="flex gap-1 w-full">
                <input
                  type="text"
                  readOnly
                  className={`${inputStyle} font-mono`}
                  value={ticket.customer_no || "Select Customer..."}
                />
                <button
                  type="button"
                  onClick={() => setCustomerModalOpen(true)}
                  className="px-2 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                >
                  <Icon icon="tabler:external-link" className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className={labelStyle}>Name</label>
              <input
                type="text"
                className={inputStyle}
                value={ticket.customer_name}
                onChange={(e) => updateField("customer_name", e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className={labelStyle}>Apply to SI</label>
              <div className="flex gap-1 w-full">
                <input
                  type="text"
                  className={inputStyle}
                  value={ticket.apply_to_si}
                  onChange={(e) => updateField("apply_to_si", e.target.value)}
                />
                <button
                  type="button"
                  className="px-2 bg-slate-100 border dark:border-slate-700 rounded text-slate-400"
                >
                  <Icon icon="tabler:external-link" className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className={labelStyle}>Apply to Item</label>
              <div className="flex gap-1 w-full">
                <input
                  type="text"
                  className={inputStyle}
                  value={ticket.apply_to_item}
                  onChange={(e) => updateField("apply_to_item", e.target.value)}
                />
                <button
                  type="button"
                  className="px-2 bg-slate-100 border dark:border-slate-700 rounded text-slate-400"
                >
                  <Icon icon="tabler:external-link" className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className={labelStyle}>Ref. No.</label>
              <input
                type="text"
                className={inputStyle}
                value={ticket.ref_no}
                onChange={(e) => updateField("ref_no", e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className={labelStyle}>Batch/Frame No.</label>
              <div className="relative w-full">
                <input
                  type="text"
                  className={inputStyle}
                  value={ticket.batch_frame_no}
                  onChange={(e) =>
                    updateField("batch_frame_no", e.target.value)
                  }
                />
                <Icon
                  icon="tabler:search"
                  className="absolute right-2 top-2.5 text-slate-400 w-4 h-4 pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* COLUMN 2: SITE RETURN ORIGIN & LOCATION DETAILS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className={labelStyle}>Address Line 1</label>
              <input
                type="text"
                className={inputStyle}
                value={ticket.address_1}
                onChange={(e) => updateField("address_1", e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className={labelStyle}>Address Line 2</label>
              <input
                type="text"
                className={inputStyle}
                value={ticket.address_2}
                onChange={(e) => updateField("address_2", e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className={labelStyle}>City</label>
              <input
                type="text"
                className={inputStyle}
                value={ticket.city}
                onChange={(e) => updateField("city", e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className={labelStyle}>County</label>
              <input
                type="text"
                className={inputStyle}
                value={ticket.county}
                onChange={(e) => updateField("county", e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className={labelStyle}>Postcode/Co.</label>
              <div className="flex gap-2 w-full">
                <input
                  type="text"
                  className={inputStyle}
                  value={ticket.postcode}
                  onChange={(e) => updateField("postcode", e.target.value)}
                />
                <select
                  className="border border-slate-300 dark:border-slate-700 rounded p-1 text-sm max-w-[70px] dark:bg-slate-900"
                  value={ticket.country}
                  onChange={(e) => updateField("country", e.target.value)}
                >
                  <option value="UK">UK</option>
                  <option value="US">US</option>
                  <option value="EU">EU</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className={labelStyle}>Cons. No.</label>
              <input
                type="text"
                className={inputStyle}
                value={ticket.cons_no}
                onChange={(e) => updateField("cons_no", e.target.value)}
              />
            </div>
          </div>

          {/* COLUMN 3: STAKEHOLDERS & PERSON ASSIGNMENTS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className={labelStyle}>Contact Person</label>
              <div className="flex gap-1 w-full">
                <input
                  type="text"
                  className={inputStyle}
                  value={ticket.contact_person}
                  onChange={(e) =>
                    updateField("contact_person", e.target.value)
                  }
                />
                <button
                  type="button"
                  className="px-2 bg-slate-100 border dark:border-slate-700 rounded text-slate-400"
                >
                  <Icon icon="tabler:external-link" className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className={labelStyle}>Telephone</label>
              <input
                type="text"
                className={inputStyle}
                value={ticket.telephone}
                onChange={(e) => updateField("telephone", e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className={labelStyle}>Email</label>
              <input
                type="email"
                className={inputStyle}
                value={ticket.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className={labelStyle}>Assign Person</label>

              <div className="flex gap-1 w-full">
                <input
                  type="text"
                  readOnly
                  className={`${inputStyle} font-mono`}
                  value={ticket.assign_person || "Select Person..."}
                />
                <button
                  type="button"
                  onClick={() => setSalespersonModalOpen(true)}
                  className="px-2 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                >
                  <Icon icon="tabler:external-link" className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className={labelStyle}>Cust. Order No.</label>
              <input
                type="text"
                className={inputStyle}
                value={ticket.cust_order_no}
                onChange={(e) => updateField("cust_order_no", e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className={labelStyle}>Partner</label>

              <div className="flex gap-1 w-full">
                <input
                  type="text"
                  readOnly
                  className={`${inputStyle} font-mono`}
                  value={ticket.partner || "Select Partner..."}
                />
                <button
                  type="button"
                  onClick={() => setSalespersonModalOpen(true)}
                  className="px-2 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                >
                  <Icon icon="tabler:external-link" className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* COLUMN 4: DATE METRICS & WARRANTY VALIDATIONS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className={labelStyle}>Open Date</label>
              <input
                type="date"
                className={inputStyle}
                value={ticket.open_date}
                onChange={(e) => updateField("open_date", e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className={labelStyle}>Close Date</label>
              <input
                type="date"
                className={inputStyle}
                value={ticket.close_date}
                onChange={(e) => updateField("close_date", e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className={labelStyle}>Issue</label>
              <select
                className={inputStyle}
                value={ticket.issue_type}
                onChange={(e) => updateField("issue_type", e.target.value)}
              >
                <option value="0">Electric</option>
                <option value="1">Frame</option>
                <option value="2">Error</option>
                <option value="3">Mechanical Issue</option>
                <option value="4">Others</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className={labelStyle}>Warranty Check</label>
              <select
                className={inputStyle}
                value={ticket.warranty_check}
                onChange={(e) =>
                  updateField(
                    "warranty_check",
                    e.target.value as "In Warranty" | "Out of Warranty" | "N/A",
                  )
                }
              >
                <option value="In Warranty">In Warranty</option>
                <option value="Out of Warranty">Out of Warranty</option>
                <option value="N/A">N/A</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic Cross-Document Linking Rows */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          {/* Left Block: Core Document Linking Arrays */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 w-24">
                Link to SO
              </label>
              <div className="flex gap-1 w-full">
                <input
                  type="text"
                  placeholder="Sales Order association"
                  className={inputStyle}
                  value={ticket.link_to_so}
                  onChange={(e) => updateField("link_to_so", e.target.value)}
                />
                <button
                  type="button"
                  className="p-1.5 bg-slate-50 border dark:border-slate-700 rounded text-slate-500"
                >
                  <Icon icon="tabler:external-link" className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => updateField("link_to_so", "")}
                  className="p-1.5 bg-slate-50 border dark:border-slate-700 rounded text-slate-400 hover:text-red-500"
                >
                  <Icon icon="tabler:rotate-clockwise" className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 w-24">
                Link to PO
              </label>
              <div className="flex gap-1 w-full">
                <input
                  type="text"
                  placeholder="Purchase Order reference tracking"
                  className={inputStyle}
                  value={ticket.link_to_po}
                  onChange={(e) => updateField("link_to_po", e.target.value)}
                />
                <button
                  type="button"
                  className="p-1.5 bg-slate-50 border dark:border-slate-700 rounded text-slate-500"
                >
                  <Icon icon="tabler:external-link" className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => updateField("link_to_po", "")}
                  className="p-1.5 bg-slate-50 border dark:border-slate-700 rounded text-slate-400 hover:text-red-500"
                >
                  <Icon icon="tabler:rotate-clockwise" className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 w-24">
                Link to CN
              </label>
              <div className="flex gap-1 w-full">
                <input
                  type="text"
                  placeholder="Credit Note link tracking mapping"
                  className={inputStyle}
                  value={ticket.link_to_cn}
                  onChange={(e) => updateField("link_to_cn", e.target.value)}
                />
                <button
                  type="button"
                  className="p-1.5 bg-slate-50 border dark:border-slate-700 rounded text-slate-500"
                >
                  <Icon icon="tabler:external-link" className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => updateField("link_to_cn", "")}
                  className="p-1.5 bg-slate-50 border dark:border-slate-700 rounded text-slate-400 hover:text-red-500"
                >
                  <Icon icon="tabler:rotate-clockwise" className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="pt-2">
              <textarea
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 focus:border-emerald-500 outline-none min-h-[140px]"
                placeholder="Narrative breakdown description text or details related to task context..."
                value={ticket.general_description}
                onChange={(e) =>
                  updateField("general_description", e.target.value)
                }
              />
            </div>
          </div>

          {/* Right Block: Dynamic Communications Ledger Box (Notes Addition Area) */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/30 overflow-hidden flex flex-col justify-between">
            <div className="p-3 border-b bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Notes Ledger Log
                </span>
                <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono">
                  {filteredNotes.length} Record(s)
                </span>
              </div>

              {/* Note Filtering Component */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search communications archive..."
                  className="w-full border p-1 rounded text-xs bg-white pr-8 outline-none focus:border-blue-500 text-black"
                  value={noteSearch}
                  onChange={(e) => setNoteSearch(e.target.value)}
                />
                <Icon
                  icon="tabler:search"
                  className="absolute right-2 top-2 text-slate-400 w-3.5 h-3.5"
                />
              </div>

              {/* Add Note Entry Control Grid Area */}
              <div className="space-y-1.5 pt-1">
                <input
                  type="text"
                  placeholder="Note Title summary..."
                  className="w-full border p-1 text-xs rounded text-black"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                />
                <div className="flex gap-1.5">
                  <textarea
                    placeholder="Enter narrative breakdown updates..."
                    rows={2}
                    className="w-full border p-1.5 text-xs rounded text-black outline-none focus:border-emerald-500"
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleAddNote}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 rounded-md font-semibold transition self-end h-8"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Note Rendering Container Stream Area */}
            <div className="p-3 overflow-y-auto max-h-[220px] divide-y space-y-2 bg-white dark:bg-slate-900/40">
              {filteredNotes.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 italic">
                  No notes linked to tracking index.
                </div>
              ) : (
                filteredNotes.map((note, idx) => (
                  <div key={idx} className="pt-2 first:pt-0 text-xs">
                    <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                      <span>
                        {ticket.ticket_no || "STXXXX"} - {note.author} /{" "}
                        {note.title}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5 whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </p>
                    <span className="block text-[10px] text-slate-400 mt-1">
                      on {note.timestamp}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer System Control Commands Navigation Center */}
      <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800 pt-4 flex-wrap gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            className="border px-4 py-1.5 rounded text-xs bg-white text-slate-700 shadow-sm font-medium hover:bg-slate-50"
          >
            Docs. Attachment
          </button>
          <button
            type="button"
            className="border px-4 py-1.5 rounded text-xs bg-white text-slate-700 shadow-sm font-medium hover:bg-slate-50"
          >
            History
          </button>
        </div>

        <div className="flex gap-2 items-center">
          {isUpdateMode && ticket.status !== "Closed" && (
            <>
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      "Generate credit note for issues logged via support ticket?",
                    )
                  ) {
                    toast.success(
                      "Triggered credit assignment pipeline mapping successfully.",
                    );
                  }
                }}
                className="border border-emerald-600 text-emerald-600 font-semibold px-4 py-1.5 rounded text-xs hover:bg-emerald-50 transition"
              >
                Convert into Credit Note
              </button>
              <button
                type="button"
                onClick={() => handleStageClick("Closed")}
                className="border border-red-600 text-red-600 font-semibold px-4 py-1.5 rounded text-xs hover:bg-red-50 transition"
              >
                Close Ticket
              </button>
            </>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="bg-blue-600 hover:bg-blue-700 font-semibold text-white px-5 py-1.5 rounded text-xs transition shadow disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>

          <button
            type="button"
            onClick={() => router.push(`/${slug}/sales/tickets`)}
            className="border px-4 py-1.5 rounded text-xs bg-white text-slate-600 shadow-sm font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>

      <CustomerLookupModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSelect={handleCustomerSelect}
      />

      <SalespersonLookupModal
        open={salespersonModalOpen}
        onClose={() => setSalespersonModalOpen(false)}
        onSelect={handleAssignPersonSelect}
      />

      <SupplierLookupModal
        open={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        onSelect={handleSupplierSelect}
      />
    </div>
  );
}
