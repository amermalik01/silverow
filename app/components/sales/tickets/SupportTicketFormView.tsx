// /app/components/sales/tickets/SupportTicketFormView.tsx

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import CustomerLookupModal, {
  type CustomerLookupItem,
} from "@/app/components/shared/modals/CustomerLookupModal";

import SalespersonLookupModal, {
  type Employee,
} from "@/app/components/shared/modals/SalespersonLookupModal";

import SupplierLookupModal, {
  type SupplierLookupItem,
} from "@/app/components/shared/modals/SupplierLookupModal";

import { Button } from "@/components/ui/button";

import SupportTicketFormTabs from "./tabs/SupportTicketFormTabs";
import SupportTicketGeneralTab from "./tabs/SupportTicketGeneralTab";
import SupportTicketDetailsTab from "./tabs/SupportTicketDetailsTab";
import SupportTicketNotesTab from "./tabs/SupportTicketNotesTab";
import SupportTicketAttachmentsTab from "./tabs/SupportTicketAttachmentsTab";

import SupportTicketStatusFlow from "./components/SupportTicketStatusFlow";

import type {
  SupportTicket,
  SupportTicketApiResponse,
  SupportTicketFormProps,
  SupportTicketTab,
  TicketNote,
  TicketStage,
} from "@/types/support-ticket";
import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";

const getLocalDate = (): string => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const createInitialTicket = (isUpdateMode: boolean): SupportTicket => ({
  ticket_no: isUpdateMode ? "" : "[Auto-Generated]",

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

  open_date: getLocalDate(),
  close_date: "",
  issue_type: 1,
  warranty_check: "In Warranty",

  link_to_so: "",
  link_to_po: "",
  link_to_cn: "",
  general_description: "",

  status: "Open",
});

const normalizeTicket = (
  data: Partial<SupportTicket>,
  fallback: SupportTicket,
): SupportTicket => ({
  ...fallback,
  ...data,

  customer_no: data.customer_no ?? "",
  customer_name: data.customer_name ?? "",

  apply_to_si: data.apply_to_si ?? "",
  apply_to_item: data.apply_to_item ?? "",
  ref_no: data.ref_no ?? "",
  batch_frame_no: data.batch_frame_no ?? "",

  address_1: data.address_1 ?? "",
  address_2: data.address_2 ?? "",
  city: data.city ?? "",
  county: data.county ?? "",
  postcode: data.postcode ?? "",
  country: data.country ?? "UK",
  cons_no: data.cons_no ?? "",

  contact_person: data.contact_person ?? "",
  telephone: data.telephone ?? "",
  email: data.email ?? "",
  assign_person_id: data.assign_person_id ?? "",
  assign_person: data.assign_person ?? "",
  cust_order_no: data.cust_order_no ?? "",
  partner_id: data.partner_id ?? "",
  partner: data.partner ?? "",

  open_date: data.open_date?.slice(0, 10) ?? "",
  close_date: data.close_date?.slice(0, 10) ?? "",

  issue_type: data.issue_type ?? 1,
  warranty_check: data.warranty_check ?? "In Warranty",

  link_to_so: data.link_to_so ?? "",
  link_to_po: data.link_to_po ?? "",
  link_to_cn: data.link_to_cn ?? "",
  general_description: data.general_description ?? "",

  status: data.status ?? "Open",
});

export default function SupportTicketFormView({
  slug,
  id,
}: SupportTicketFormProps) {
  const router = useRouter();

  const isUpdateMode = Boolean(id);

  const [ticket, setTicket] = useState<SupportTicket>(() =>
    createInitialTicket(isUpdateMode),
  );

  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [activeTab, setActiveTab] = useState<SupportTicketTab>("general");

  const [loading, setLoading] = useState<boolean>(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [salespersonModalOpen, setSalespersonModalOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);

  // -------------------------------------------------------------------------
  // Load existing ticket
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadTicket = async () => {
      try {
        setLoading(true);

        const response = await fetch(`/api/sales/support-tickets/${id}`, {
          cache: "no-store",
        });

        const data: Partial<SupportTicketApiResponse> = await response.json();

        if (!response.ok) {
          throw new Error(
            "error" in data && typeof data.error === "string"
              ? data.error
              : "Failed to load support ticket.",
          );
        }

        if (!data.ticket) {
          throw new Error("Support ticket data was not returned.");
        }

        if (cancelled) return;

        setTicket(normalizeTicket(data.ticket, createInitialTicket(true)));

        setNotes(Array.isArray(data.notes) ? data.notes : []);
      } catch (error) {
        console.error("Support Ticket Load Error:", error);

        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to load support ticket.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadTicket();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // -------------------------------------------------------------------------
  // Field updates
  // -------------------------------------------------------------------------

  const updateField = useCallback(
    <K extends keyof SupportTicket>(field: K, value: SupportTicket[K]) => {
      setTicket((previous) => ({
        ...previous,
        [field]: value,
      }));
    },
    [],
  );

  // -------------------------------------------------------------------------
  // Customer lookup
  // -------------------------------------------------------------------------

  const handleCustomerSelect = (customer: CustomerLookupItem) => {
    setTicket((previous) => ({
      ...previous,

      customer_no: customer.id,
      customer_name: customer.name,

      email: customer.email || previous.email,

      address_1: customer.billing_address?.address_1 || previous.address_1,

      address_2: customer.billing_address?.address_2 || previous.address_2,

      city: customer.billing_address?.city || previous.city,

      county: customer.billing_address?.state || previous.county,

      postcode: customer.billing_address?.postcode || previous.postcode,

      country: customer.billing_address?.country || previous.country || "UK",
    }));

    setCustomerModalOpen(false);
  };

  // -------------------------------------------------------------------------
  // Employee lookup
  // -------------------------------------------------------------------------

  const handleAssignPersonSelect = (employee: Employee) => {
    setTicket((previous) => ({
      ...previous,
      assign_person_id: employee.id,
      assign_person: `${employee.employee_code}-${employee.display_name}`,
    }));

    setSalespersonModalOpen(false);
  };

  // -------------------------------------------------------------------------
  // Supplier / partner lookup
  // -------------------------------------------------------------------------

  const handleSupplierSelect = (supplier: SupplierLookupItem) => {
    setTicket((previous) => ({
      ...previous,
      partner_id: supplier.id,
      partner: `${supplier.supplier_code}-${supplier.name}`,
    }));

    setSupplierModalOpen(false);
  };

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!ticket.customer_no) {
      errors.push("Please select a customer.");
    }

    if (!ticket.open_date) {
      errors.push("Open Date is required.");
    }

    if (ticket.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ticket.email)) {
      errors.push("Please enter a valid email address.");
    }

    setValidationErrors(errors);

    return errors.length === 0;
  };

  // -------------------------------------------------------------------------
  // Save ticket and notes
  // -------------------------------------------------------------------------

  const save = async () => {
    setValidationErrors([]);

    if (!validateForm()) {
      setActiveTab("general");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSaving(true);

      const endpoint = id
        ? `/api/sales/support-tickets/${id}`
        : "/api/sales/support-tickets";

      const response = await fetch(endpoint, {
        method: id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticket,
          notes,
        }),
      });

      const data: {
        success?: boolean;
        ticket?: SupportTicket;
        error?: string;
        message?: string;
      } = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save support ticket.");
      }

      toast.success(
        data.message ||
          (id
            ? "Support ticket updated successfully."
            : "Support ticket created successfully."),
      );

      router.push(`/${slug}/sales/support-ticket`);
      router.refresh();
    } catch (error) {
      console.error("Support Ticket Save Error:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Unexpected error while saving support ticket.";

      setValidationErrors([message]);

      toast.error(message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Stage update
  // -------------------------------------------------------------------------

  const handleStageChange = async (stage: TicketStage) => {
    if (!id || isUpdatingStatus || ticket.status === stage) return;

    try {
      setIsUpdatingStatus(true);

      const response = await fetch(`/api/sales/support-tickets/${id}/stage`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stage }),
      });

      const data: {
        success?: boolean;
        ticket?: SupportTicket;
        error?: string;
      } = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update ticket stage.");
      }

      setTicket((previous) => ({
        ...previous,
        status: stage,
        ...(data.ticket?.close_date
          ? { close_date: data.ticket.close_date.slice(0, 10) }
          : {}),
      }));

      toast.success(`Ticket stage changed to ${stage}.`);
    } catch (error) {
      console.error("Support Ticket Stage Error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update ticket stage.",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // -------------------------------------------------------------------------
  // Footer actions
  // -------------------------------------------------------------------------

  const handleConvertToCreditNote = () => {
    const confirmed = window.confirm(
      "Generate credit note for issues logged via support ticket?",
    );

    if (!confirmed) return;

    // Preserves the existing form behaviour. This is not connected to a
    // credit-note API yet.
    toast.success(
      "Credit note conversion is not connected to the backend yet.",
    );
  };

  const handleCancel = () => {
    router.push(`/${slug}/sales/support-ticket`);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Icon icon="lucide:loader-circle" className="h-4 w-4 animate-spin" />
          Loading support ticket...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          {
            label: "Support Tickets",
            href: `/${slug}/sales/support-ticket`,
          },
          {
            label: ticket.ticket_no || "",
          },
        ]}
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold px-4">
          {isUpdateMode ? "Edit Support Ticket" : "New Support Ticket"}
        </h1>
        {ticket.ticket_no && ticket.ticket_no !== "[Auto-Generated]" && (
          <div className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded text-md font-bold border border-emerald-200 dark:border-emerald-900">
            {ticket.ticket_no}
          </div>
        )}
      </div>

      {validationErrors.length > 0 && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg space-y-1">
          {validationErrors.map((err, idx) => (
            <p
              key={idx}
              className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1"
            >
              <Icon icon="tabler:alert-circle" className="inline w-3.5 h-3.5" />{" "}
              {err}
            </p>
          ))}
        </div>
      )}

      {/* <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight">
              {isUpdateMode ? "Edit Support Ticket" : "New Support Ticket"}
            </h1>

            {ticket.ticket_no &&
              ticket.ticket_no !== "[Auto-Generated]" && (
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {ticket.ticket_no}
                </span>
              )}
          </div>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Manage customer issues, assignments, notes and related documents.
          </p>
        </div>

        
      </div> */}

      {/* Main form */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-2 mb-4 px-4 pt-3 sm:flex-row sm:items-center">
          <SupportTicketFormTabs
            activeTab={activeTab}
            onChange={setActiveTab}
            noteCount={notes.length}
          />

          {/* <span className="pb-3 text-[10px] text-slate-400">
            {isUpdateMode ? "Existing ticket" : "New record"}
          </span> */}

          {isUpdateMode && (
          <SupportTicketStatusFlow
            status={ticket.status}
            disabled={isUpdatingStatus}
            onChange={handleStageChange}
          />
        )}
        </div>

        <div className="p-4">
          {activeTab === "general" && (
            <SupportTicketGeneralTab
              ticket={ticket}
              onChange={updateField}
              onSelectCustomer={() => setCustomerModalOpen(true)}
              onSelectEmployee={() => setSalespersonModalOpen(true)}
              onSelectPartner={() => setSupplierModalOpen(true)}
            />
          )}

          {activeTab === "details" && (
            <SupportTicketDetailsTab ticket={ticket} onChange={updateField} />
          )}

          {activeTab === "notes" && (
            <SupportTicketNotesTab
              ticketNo={ticket.ticket_no}
              notes={notes}
              onChange={setNotes}
              defaultAuthor={ticket.assign_person || "Current User"}
            />
          )}

          {activeTab === "attachments" && (
            <SupportTicketAttachmentsTab ticketId={id} readonly={!id} />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="cancel"
            onClick={() => setActiveTab("attachments")}
          >
            <Icon icon="lucide:paperclip" className="mr-1.5 h-3.5 w-3.5" />
            Attachments
          </Button>

          <Button
            type="button"
            variant="cancel"
            onClick={() => setActiveTab("notes")}
          >
            <Icon icon="lucide:history" className="mr-1.5 h-3.5 w-3.5" />
            Notes History
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {isUpdateMode && ticket.status !== "Closed" && (
            <>
              <Button
                type="button"
                variant="cancel"
                onClick={handleConvertToCreditNote}
              >
                Convert into Credit Note
              </Button>

              <Button
                type="button"
                variant="cancel"
                onClick={() => handleStageChange("Closed")}
                disabled={isUpdatingStatus}
              >
                Close Ticket
              </Button>
            </>
          )}

          <Button
            type="button"
            variant="save"
            onClick={save}
            disabled={saving || isUpdatingStatus}
          >
            {saving ? (
              <>
                <Icon
                  icon="lucide:loader-circle"
                  className="mr-1.5 h-3.5 w-3.5 animate-spin"
                />
                Saving...
              </>
            ) : (
              <>
                <Icon icon="lucide:save" className="mr-1.5 h-3.5 w-3.5" />
                Save
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="cancel"
            onClick={handleCancel}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Lookup modals */}
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
/* "use client";

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
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

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
    setSalespersonModalOpen(false);
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
      router.push(`/${slug}/sales/support-ticket`);
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
    "w-full border border-slate-300 dark:border-slate-700 p-1.5 rounded text-xs bg-white dark:bg-slate-900 outline-none focus:border-emerald-500 disabled:bg-slate-50 dark:disabled:bg-slate-950 text-slate-800 dark:text-slate-200 shadow-sm";
  const labelStyle =
    "block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5 min-w-[110px]";

  return (
    <div className="space-y-4  text-black dark:text-white">
   
      <div className="flex border-b border-slate-200 dark:border-slate-800 justify-between items-center pb-2 flex-wrap gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="cancel"
          >
            General
          </Button>
        </div>


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


      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
        <h2 className="text-lg font-bold tracking-tight border-b pb-2 text-slate-800 dark:text-slate-100">
          Support Ticket
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

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
              <label className={labelStyle}>
                Customer No. <span className="text-red-500">*</span>
              </label>
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
                  className="border border-slate-300 dark:border-slate-700 rounded p-1 text-xs max-w-[70px] dark:bg-slate-900"
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className={labelStyle}>Open Date</label>

              <DatePicker
                value={
                  ticket.open_date
                    ? new Date(`${ticket.open_date}T00:00:00`)
                    : undefined
                }
                onChange={(date) =>
                  updateField(
                    "open_date",
                    date ? format(date, "yyyy-MM-dd") : "",
                  )
                }
                className={inputStyle}
              />


            </div>

            <div className="flex items-center justify-between">
              <label className={labelStyle}>Close Date</label>


              <DatePicker
                value={
                  ticket.close_date
                    ? new Date(`${ticket.close_date}T00:00:00`)
                    : undefined
                }
                onChange={(date) =>
                  updateField(
                    "close_date",
                    date ? format(date, "yyyy-MM-dd") : "",
                  )
                }
                className={inputStyle}
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


        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">

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
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 focus:border-emerald-500 outline-none min-h-[140px]"
                placeholder="Narrative breakdown description text or details related to task context..."
                value={ticket.general_description}
                onChange={(e) =>
                  updateField("general_description", e.target.value)
                }
              />
            </div>
          </div>

  
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/30 overflow-hidden flex flex-col justify-between">
            <div className="p-3 border-b bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700 capitalize tracking-wide">
                  Notes Ledger Log
                </span>
                <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono">
                  {filteredNotes.length} Record(s)
                </span>
              </div>

      
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
                  <Button
                    type="button"
                    onClick={handleAddNote}
                    variant="add_line"
                    // className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 rounded-md font-semibold transition self-end h-8"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>

   
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


      <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800 pt-4 flex-wrap gap-3">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="save"
            // className="border px-4 py-1.5 rounded text-xs bg-white text-slate-700 shadow-sm font-medium hover:bg-slate-50"
          >
            Docs. Attachment
          </Button>
          <Button
            type="button"
            variant="cancel"
            // className="border px-4 py-1.5 rounded text-xs bg-white text-slate-700 shadow-sm font-medium hover:bg-slate-50"
          >
            History
          </Button>
        </div>

        <div className="flex gap-2 items-center">
          {isUpdateMode && ticket.status !== "Closed" && (
            <>
              <Button
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
                variant="cancel"
                // className="border border-emerald-600 text-emerald-600 font-semibold px-4 py-1.5 rounded text-xs hover:bg-emerald-50 transition"
              >
                Convert into Credit Note
              </Button>
              <Button
                type="button"
                onClick={() => handleStageClick("Closed")}
                variant="cancel"
                // className="border border-red-600 text-red-600 font-semibold px-4 py-1.5 rounded text-xs hover:bg-red-50 transition"
              >
                Close Ticket
              </Button>
            </>
          )}

          <Button
            type="button"
            disabled={saving}
            onClick={save}
            variant="save"
          >
            {saving ? "Saving..." : "Save"}
          </Button>

          <Button
            type="button"
            onClick={() => router.push(`/${slug}/sales/support-ticket`)}
            variant="cancel"
          >
            Cancel
          </Button>
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
 */
