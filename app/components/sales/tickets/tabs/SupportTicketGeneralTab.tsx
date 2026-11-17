// tabs/SupportTicketGeneralTab.tsx


"use client";

import type { ReactNode } from "react";
import { Icon } from "@iconify/react";
import { format } from "date-fns";

import { DatePicker } from "@/components/ui/date-picker";
import type {
  SupportTicket,
  WarrantyStatus,
} from "@/types/support-ticket";

interface Props {
  ticket: SupportTicket;
  onChange: <K extends keyof SupportTicket>(
    field: K,
    value: SupportTicket[K],
  ) => void;
  onSelectCustomer: () => void;
  onSelectEmployee: () => void;
  onSelectPartner: () => void;
}

// Same compact styling as Sales Order OrderFormTabs.
const labelClass =
  "text-xs font-medium text-slate-600 dark:text-slate-400 self-center";

const inputClass =
  "w-full min-w-0 text-xs px-2 py-1.5 border border-slate-300 rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 disabled:bg-slate-50 dark:disabled:bg-slate-950 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed";

const sectionClass =
  "rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900";

const fieldGridClass =
  "grid grid-cols-12 items-center gap-2";

function Field({
  label,
  children,
  required = false,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div className={fieldGridClass}>
      <label className={`${labelClass} col-span-4`} title={label}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>

      <div className="col-span-8 min-w-0">
        {children}
      </div>
    </div>
  );
}

function LookupButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-[29px] w-8 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-100 text-slate-600 transition-colors hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
    >
      <Icon icon="tabler:external-link" className="h-4 w-4" />
    </button>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: string;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
      <Icon
        icon={icon}
        className="h-4 w-4 shrink-0 text-emerald-600"
      />

      <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
        {title}
      </h3>
    </div>
  );
}

export default function SupportTicketGeneralTab({
  ticket,
  onChange,
  onSelectCustomer,
  onSelectEmployee,
  onSelectPartner,
}: Props) {
  return (
    <div className="space-y-3 text-black dark:text-white">

      {/* Customer and Ticket Information */}
      <section className={sectionClass}>
        <SectionHeader
          icon="tabler:user-circle"
          title="Customer and Ticket Information"
        />

        <div className="grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2 xl:grid-cols-4">

          <Field label="Ticket No.">
            <input
              type="text"
              disabled
              readOnly
              className={`${inputClass} bg-slate-50 font-semibold dark:bg-slate-950`}
              value={ticket.ticket_no || ""}
            />
          </Field>

          <Field label="Customer" required>
            <div className="flex min-w-0 gap-1">
              <input
                type="text"
                readOnly
                disabled
                className={inputClass}
                value={ticket.customer_name || ""}
                placeholder="Select Customer..."
              />

              <LookupButton
                onClick={onSelectCustomer}
                label="Select Customer"
              />
            </div>
          </Field>

          <Field label="Apply to SI">
            <input
              type="text"
              className={inputClass}
              value={ticket.apply_to_si || ""}
              onChange={(event) =>
                onChange("apply_to_si", event.target.value)
              }
              placeholder="Sales invoice reference"
            />
          </Field>

          <Field label="Apply to Item">
            <input
              type="text"
              className={inputClass}
              value={ticket.apply_to_item || ""}
              onChange={(event) =>
                onChange("apply_to_item", event.target.value)
              }
              placeholder="Item reference"
            />
          </Field>

          <Field label="Reference No.">
            <input
              type="text"
              className={inputClass}
              value={ticket.ref_no || ""}
              onChange={(event) =>
                onChange("ref_no", event.target.value)
              }
            />
          </Field>

          <Field label="Batch / Frame No.">
            <input
              type="text"
              className={inputClass}
              value={ticket.batch_frame_no || ""}
              onChange={(event) =>
                onChange("batch_frame_no", event.target.value)
              }
            />
          </Field>

          <Field label="Cust. Order No.">
            <input
              type="text"
              className={inputClass}
              value={ticket.cust_order_no || ""}
              onChange={(event) =>
                onChange("cust_order_no", event.target.value)
              }
            />
          </Field>

          <Field label="Consignment No.">
            <input
              type="text"
              className={inputClass}
              value={ticket.cons_no || ""}
              onChange={(event) =>
                onChange("cons_no", event.target.value)
              }
            />
          </Field>

        </div>
      </section>

      {/* Customer Address */}
      <section className={sectionClass}>
        <SectionHeader
          icon="tabler:map-pin"
          title="Customer Address"
        />

        <div className="grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2 xl:grid-cols-4">

          <Field label="Address Line 1">
            <input
              type="text"
              className={inputClass}
              value={ticket.address_1 || ""}
              onChange={(event) =>
                onChange("address_1", event.target.value)
              }
            />
          </Field>

          <Field label="Address Line 2">
            <input
              type="text"
              className={inputClass}
              value={ticket.address_2 || ""}
              onChange={(event) =>
                onChange("address_2", event.target.value)
              }
            />
          </Field>

          <Field label="City">
            <input
              type="text"
              className={inputClass}
              value={ticket.city || ""}
              onChange={(event) =>
                onChange("city", event.target.value)
              }
            />
          </Field>

          <Field label="County">
            <input
              type="text"
              className={inputClass}
              value={ticket.county || ""}
              onChange={(event) =>
                onChange("county", event.target.value)
              }
            />
          </Field>

          <Field label="Postcode">
            <input
              type="text"
              className={inputClass}
              value={ticket.postcode || ""}
              onChange={(event) =>
                onChange("postcode", event.target.value)
              }
            />
          </Field>

          <Field label="Country">
            <select
              className={inputClass}
              value={ticket.country || ""}
              onChange={(event) =>
                onChange("country", event.target.value)
              }
            >
              <option value="">Select Country...</option>
              <option value="UK">UK</option>
              <option value="US">US</option>
              <option value="EU">EU</option>
            </select>
          </Field>

        </div>
      </section>

      {/* Contact and Assignment */}
      <section className={sectionClass}>
        <SectionHeader
          icon="tabler:address-book"
          title="Contact and Assignment"
        />

        <div className="grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2 xl:grid-cols-4">

          <Field label="Contact Person">
            <input
              type="text"
              className={inputClass}
              value={ticket.contact_person || ""}
              onChange={(event) =>
                onChange("contact_person", event.target.value)
              }
            />
          </Field>

          <Field label="Telephone">
            <input
              type="text"
              className={inputClass}
              value={ticket.telephone || ""}
              onChange={(event) =>
                onChange("telephone", event.target.value)
              }
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              className={inputClass}
              value={ticket.email || ""}
              onChange={(event) =>
                onChange("email", event.target.value)
              }
            />
          </Field>

          <Field label="Assign Person">
            <div className="flex min-w-0 gap-1">
              <input
                type="text"
                readOnly
                disabled
                className={inputClass}
                value={ticket.assign_person || ""}
                placeholder="Select Employee..."
              />

              <LookupButton
                onClick={onSelectEmployee}
                label="Select Assigned Employee"
              />
            </div>
          </Field>

          <Field label="Partner">
            <div className="flex min-w-0 gap-1">
              <input
                type="text"
                readOnly
                disabled
                className={inputClass}
                value={ticket.partner || ""}
                placeholder="Select Partner..."
              />

              <LookupButton
                onClick={onSelectPartner}
                label="Select Partner"
              />
            </div>
          </Field>

        </div>
      </section>

      {/* Ticket Dates and Issue Classification */}
      <section className={sectionClass}>
        <SectionHeader
          icon="tabler:calendar-clock"
          title="Ticket Dates and Issue Classification"
        />

        <div className="grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2 xl:grid-cols-4">

          <Field label="Open Date" required>
            <DatePicker
              value={
                ticket.open_date
                  ? new Date(`${ticket.open_date.slice(0, 10)}T00:00:00`)
                  : undefined
              }
              onChange={(date) =>
                onChange(
                  "open_date",
                  date ? format(date, "yyyy-MM-dd") : "",
                )
              }
              className={inputClass}
            />
          </Field>

          <Field label="Close Date">
            <DatePicker
              value={
                ticket.close_date
                  ? new Date(`${ticket.close_date.slice(0, 10)}T00:00:00`)
                  : undefined
              }
              onChange={(date) =>
                onChange(
                  "close_date",
                  date ? format(date, "yyyy-MM-dd") : "",
                )
              }
              className={inputClass}
            />
          </Field>

          <Field label="Issue Type">
            <select
              className={inputClass}
              value={String(ticket.issue_type)}
              onChange={(event) =>
                onChange("issue_type", event.target.value)
              }
            >
              <option value="0">Electric</option>
              <option value="1">Frame</option>
              <option value="2">Error</option>
              <option value="3">Mechanical Issue</option>
              <option value="4">Others</option>
            </select>
          </Field>

          <Field label="Warranty Check">
            <select
              className={inputClass}
              value={ticket.warranty_check || "In Warranty"}
              onChange={(event) =>
                onChange(
                  "warranty_check",
                  event.target.value as WarrantyStatus,
                )
              }
            >
              <option value="In Warranty">In Warranty</option>
              <option value="Out of Warranty">Out of Warranty</option>
              <option value="N/A">N/A</option>
            </select>
          </Field>

        </div>
      </section>

    </div>
  );
}


/* "use client";

import type { ReactNode } from "react";
import { Icon } from "@iconify/react";
import { format } from "date-fns";

import { DatePicker } from "@/components/ui/date-picker";
import type { SupportTicket, WarrantyStatus } from "@/types/support-ticket";

interface Props {
  ticket: SupportTicket;
  onChange: <K extends keyof SupportTicket>(
    field: K,
    value: SupportTicket[K],
  ) => void;
  onSelectCustomer: () => void;
  onSelectEmployee: () => void;
  onSelectPartner: () => void;
}

const inputClass =
  "h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200";

const labelClass =
  "mb-1.5 block text-[11px] font-semibold text-slate-500 dark:text-slate-400";

const sectionClass =
  "rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950";

function Field({
  label,
  children,
  required = false,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="min-w-0">
      <label className={labelClass}>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function LookupButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
    >
      <Icon icon="lucide:search" className="h-4 w-4" />
    </button>
  );
}

export default function SupportTicketGeneralTab({
  ticket,
  onChange,
  onSelectCustomer,
  onSelectEmployee,
  onSelectPartner,
}: Props) {
  return (
    <div className="space-y-4">

      <section className={sectionClass}>
        <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <Icon icon="lucide:user-round" className="h-4 w-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
            Customer and Ticket Information
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Ticket No.">
            <input
              className={`${inputClass} bg-slate-50 font-semibold dark:bg-slate-900`}
              value={ticket.ticket_no}
              disabled
            />
          </Field>

          <Field label="Customer" required>
            <div className="flex gap-1.5">
              <input
                className={inputClass}
                value={ticket.customer_name}
                placeholder="Select customer"
                readOnly
              />
              <LookupButton
                onClick={onSelectCustomer}
                label="Select customer"
              />
            </div>
          </Field>

          <Field label="Apply to SI">
            <input
              className={inputClass}
              value={ticket.apply_to_si}
              onChange={(event) => onChange("apply_to_si", event.target.value)}
              placeholder="Sales invoice reference"
            />
          </Field>

          <Field label="Apply to Item">
            <input
              className={inputClass}
              value={ticket.apply_to_item}
              onChange={(event) =>
                onChange("apply_to_item", event.target.value)
              }
              placeholder="Item reference"
            />
          </Field>

          <Field label="Reference No.">
            <input
              className={inputClass}
              value={ticket.ref_no}
              onChange={(event) => onChange("ref_no", event.target.value)}
            />
          </Field>

          <Field label="Batch / Frame No.">
            <input
              className={inputClass}
              value={ticket.batch_frame_no}
              onChange={(event) =>
                onChange("batch_frame_no", event.target.value)
              }
            />
          </Field>

          <Field label="Customer Order No.">
            <input
              className={inputClass}
              value={ticket.cust_order_no}
              onChange={(event) =>
                onChange("cust_order_no", event.target.value)
              }
            />
          </Field>

          <Field label="Consignment No.">
            <input
              className={inputClass}
              value={ticket.cons_no}
              onChange={(event) => onChange("cons_no", event.target.value)}
            />
          </Field>
        </div>
      </section>

 
      <section className={sectionClass}>
        <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <Icon icon="lucide:map-pin" className="h-4 w-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
            Customer Address
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Address Line 1">
            <input
              className={inputClass}
              value={ticket.address_1}
              onChange={(event) => onChange("address_1", event.target.value)}
            />
          </Field>

          <Field label="Address Line 2">
            <input
              className={inputClass}
              value={ticket.address_2}
              onChange={(event) => onChange("address_2", event.target.value)}
            />
          </Field>

          <Field label="City">
            <input
              className={inputClass}
              value={ticket.city}
              onChange={(event) => onChange("city", event.target.value)}
            />
          </Field>

          <Field label="County">
            <input
              className={inputClass}
              value={ticket.county}
              onChange={(event) => onChange("county", event.target.value)}
            />
          </Field>

          <Field label="Postcode">
            <input
              className={inputClass}
              value={ticket.postcode}
              onChange={(event) => onChange("postcode", event.target.value)}
            />
          </Field>

          <Field label="Country">
            <select
              className={inputClass}
              value={ticket.country}
              onChange={(event) => onChange("country", event.target.value)}
            >
              <option value="">Select country</option>
              <option value="UK">UK</option>
              <option value="US">US</option>
              <option value="EU">EU</option>
            </select>
          </Field>
        </div>
      </section>

   
      <section className={sectionClass}>
        <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <Icon icon="lucide:contact" className="h-4 w-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
            Contact and Assignment
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Contact Person">
            <input
              className={inputClass}
              value={ticket.contact_person}
              onChange={(event) =>
                onChange("contact_person", event.target.value)
              }
            />
          </Field>

          <Field label="Telephone">
            <input
              className={inputClass}
              value={ticket.telephone}
              onChange={(event) => onChange("telephone", event.target.value)}
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              className={inputClass}
              value={ticket.email}
              onChange={(event) => onChange("email", event.target.value)}
            />
          </Field>

          <Field label="Assign Person">
            <div className="flex gap-1.5">
              <input
                className={inputClass}
                value={ticket.assign_person}
                placeholder="Select employee"
                readOnly
              />
              <LookupButton
                onClick={onSelectEmployee}
                label="Select assigned employee"
              />
            </div>
          </Field>

          <Field label="Partner">
            <div className="flex gap-1.5">
              <input
                className={inputClass}
                value={ticket.partner}
                placeholder="Select partner"
                readOnly
              />
              <LookupButton onClick={onSelectPartner} label="Select partner" />
            </div>
          </Field>
        </div>
      </section>


      <section className={sectionClass}>
        <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <Icon
            icon="lucide:calendar-clock"
            className="h-4 w-4 text-emerald-600"
          />
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
            Ticket Dates and Issue Classification
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Open Date" required>
            <DatePicker
              value={
                ticket.open_date
                  ? new Date(`${ticket.open_date.slice(0, 10)}T00:00:00`)
                  : undefined
              }
              onChange={(date) =>
                onChange("open_date", date ? format(date, "yyyy-MM-dd") : "")
              }
              className={inputClass}
            />
          </Field>

          <Field label="Close Date">
            <DatePicker
              value={
                ticket.close_date
                  ? new Date(`${ticket.close_date.slice(0, 10)}T00:00:00`)
                  : undefined
              }
              onChange={(date) =>
                onChange("close_date", date ? format(date, "yyyy-MM-dd") : "")
              }
              className={inputClass}
            />
          </Field>

          <Field label="Issue Type">
            <select
              className={inputClass}
              value={String(ticket.issue_type)}
              onChange={(event) => onChange("issue_type", event.target.value)}
            >
              <option value="0">Electric</option>
              <option value="1">Frame</option>
              <option value="2">Error</option>
              <option value="3">Mechanical Issue</option>
              <option value="4">Others</option>
            </select>
          </Field>

          <Field label="Warranty Check">
            <select
              className={inputClass}
              value={ticket.warranty_check}
              onChange={(event) =>
                onChange("warranty_check", event.target.value as WarrantyStatus)
              }
            >
              <option value="In Warranty">In Warranty</option>
              <option value="Out of Warranty">Out of Warranty</option>
              <option value="N/A">N/A</option>
            </select>
          </Field>
        </div>
      </section>
    </div>
  );
} */
