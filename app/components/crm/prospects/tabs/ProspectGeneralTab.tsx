// app/components/crm/prospects/tabs/ProspectGeneralTab.tsx

"use client";

import { useState } from "react";
import type { ProspectContact, ProspectAddress } from "@/types/prospect";
import { Icon } from "@iconify/react";

type Header = {
  company_name: string;
  website: string;
  description: string;
};

type Props = {
  value: Header & Record<string, unknown>;
  contacts: ProspectContact[];
  addresses: ProspectAddress[];
  onChange: <K extends keyof Header>(field: K, value: Header[K]) => void;
  onContactChange: (contacts: ProspectContact[]) => void;
  onAddressChange: (addresses: ProspectAddress[]) => void;
  /** View mode: all fields disabled. */
  readOnly?: boolean;
};

const inputClass =
  "h-8 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-default disabled:border-slate-200 disabled:bg-slate-50";

export default function ProspectGeneralTab({
  value,
  contacts,
  onChange,
  onContactChange,
  readOnly = false,
}: Props) {
  const [activeContact, setActiveContact] = useState(0);

  const selectedContact = contacts[activeContact] || contacts[0];

  const updateContact = (field: keyof ProspectContact, fieldValue: string) => {
    if (!selectedContact) return;

    const updated = contacts.map((contact, index) =>
      index === activeContact ? { ...contact, [field]: fieldValue } : contact,
    );

    onContactChange(updated);
  };

  const addSecondaryContact = () => {
    if (contacts.length >= 2) return;

    const newContact: ProspectContact = {
      name: "",
      job_title: null,
      email: null,
      phone: null,
      mobile: null,
      is_primary: false,
      notes: null,
    };

    onContactChange([...contacts, newContact]);
    setActiveContact(1);
  };

  const removeSecondaryContact = () => {
    if (activeContact !== 1 || contacts.length !== 2) return;

    onContactChange([contacts[0]]);
    setActiveContact(0);
  };

  const normalizeWebsite = (website: string) => {
    const trimmed = website.trim();

    if (!trimmed) return "";

    return trimmed.includes("://") ? trimmed : `https://${trimmed}`;
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
        <Icon
          icon="iconamoon:profile-light"
          className="text-2xl text-emerald-600"
        />

        <h2 className="text-base font-bold text-slate-900">
          Basic Information
        </h2>
      </div>

      {/* CONTACT TABS */}
      <div className="px-5 pt-3">
        <div className="flex items-center gap-5 overflow-x-auto border-b border-slate-200">
          {contacts.slice(0, 2).map((contact, index) => (
            <button
              key={contact.id || `contact-${index}`}
              type="button"
              onClick={() => setActiveContact(index)}
              className={`relative shrink-0 px-1 pb-3 text-sm font-semibold transition ${
                activeContact === index
                  ? "text-emerald-700"
                  : "text-slate-600 hover:text-emerald-700"
              }`}
            >
              {index === 0 ? "Primary Contact" : "Secondary Contact"}

              {activeContact === index && (
                <span className="absolute bottom-0 left-0 h-[3px] w-full rounded-t-full bg-emerald-600" />
              )}
            </button>
          ))}

          {contacts.length < 2 && !readOnly && (
            <button
              type="button"
              onClick={addSecondaryContact}
              className="mb-2 flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
            >
              <Icon icon="lucide:plus" className="text-base" />
              Add Secondary Contact
            </button>
          )}
        </div>
      </div>

      {/* CONTACT DETAILS */}
      <div className="space-y-3 p-5">
        {selectedContact ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              {/* <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {activeContact === 0
                  ? "Primary Contact Details"
                  : "Secondary Contact Details"}
              </span> */}

              {activeContact === 1 && !readOnly && (
                <button
                  type="button"
                  onClick={removeSecondaryContact}
                  className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800"
                >
                  <Icon icon="lucide:trash-2" />
                  Remove Secondary
                </button>
              )}
            </div>

            <fieldset
              disabled={readOnly}
              className="grid min-w-0 grid-cols-1 items-center gap-x-3 gap-y-2 sm:grid-cols-[125px_minmax(0,1fr)]"
            >
              <label className="text-sm text-slate-800">Contact Name</label>

              <input
                value={selectedContact.name || ""}
                onChange={(event) => updateContact("name", event.target.value)}
                className={inputClass}
                placeholder="Contact name"
              />

              <label className="text-sm text-slate-800">Job Title</label>

              <input
                value={selectedContact.job_title || ""}
                onChange={(event) =>
                  updateContact("job_title", event.target.value)
                }
                className={inputClass}
                placeholder="Job title"
              />

              <label className="text-sm text-slate-800">Email</label>

              <div className="relative">
                <Icon
                  icon="lucide:mail"
                  className="absolute left-3 top-2 text-base text-emerald-600"
                />

                <input
                  type="email"
                  value={selectedContact.email || ""}
                  onChange={(event) =>
                    updateContact("email", event.target.value)
                  }
                  className={`${inputClass} pl-9`}
                  placeholder="contact@example.com"
                />
              </div>

              <label className="text-sm text-slate-800">Phone</label>

              <div className="relative">
                <Icon
                  icon="lucide:phone"
                  className="absolute left-3 top-2 text-base text-emerald-600"
                />

                <input
                  value={selectedContact.phone || ""}
                  onChange={(event) =>
                    updateContact("phone", event.target.value)
                  }
                  className={`${inputClass} pl-9`}
                  placeholder="Phone number"
                />
              </div>

              <label className="text-sm text-slate-800">Website</label>

              <input
                value={value.website || ""}
                onChange={(event) => onChange("website", event.target.value)}
                onBlur={(event) =>
                  onChange("website", normalizeWebsite(event.target.value))
                }
                className={`${inputClass} text-emerald-800 underline`}
                placeholder="https://example.com"
              />
            </fieldset>
          </>
        ) : (
          <div className="py-6 text-center text-sm text-slate-500">
            No contact available.
          </div>
        )}
      </div>
    </div>
  );
}

/* "use client";

import { useState } from "react";
import type { ProspectContact, ProspectAddress } from "@/types/prospect";
import { Icon } from "@iconify/react";

type Header = {
  company_name: string;
  website: string;
  description: string;
};

type Props = {
  value: Header & Record<string, unknown>;
  contacts: ProspectContact[];
  addresses: ProspectAddress[];
  onChange: <K extends keyof Header>(field: K, value: Header[K]) => void;
  onContactChange: (contacts: ProspectContact[]) => void;
  onAddressChange: (addresses: ProspectAddress[]) => void;
};

const inputClass =
  "h-8 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

export default function ProspectGeneralTab({
  value,
  contacts,
  onChange,
  onContactChange,
}: Props) {
  const [activeContact, setActiveContact] = useState(0);

  const selectedContact = contacts[activeContact] || contacts[0];

  const updateContact = (field: keyof ProspectContact, fieldValue: string) => {
    if (!selectedContact) return;

    const updated = contacts.map((contact, index) =>
      index === activeContact ? { ...contact, [field]: fieldValue } : contact,
    );

    onContactChange(updated);
  };

  const addContact = () => {
    const newContact: ProspectContact = {
      name: "",
      job_title: null,
      email: null,
      phone: null,
      mobile: null,
      is_primary: false,
      notes: null,
    };

    onContactChange([...contacts, newContact]);
    setActiveContact(contacts.length);
  };

  const normalizeWebsite = (website: string) => {
    const trimmed = website.trim();

    if (!trimmed) return "";

    return trimmed.includes("://") ? trimmed : `https://${trimmed}`;
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
        <Icon
          icon="iconamoon:profile-light"
          className="text-emerald-600 text-2xl"
        />
        <h2 className="text-base font-bold text-slate-900">
          Basic Information
        </h2>
      </div>

      <div className="px-5 pt-3">
        <div className="flex items-center gap-5 overflow-x-auto border-b border-slate-200">
          {contacts.map((contact, index) => (
            <button
              key={contact.id || `contact-${index}`}
              type="button"
              onClick={() => setActiveContact(index)}
              className={`relative shrink-0 px-1 pb-3 text-sm font-semibold transition ${
                activeContact === index
                  ? "text-emerald-700"
                  : "text-slate-600 hover:text-emerald-700"
              }`}
            >
              {contact.is_primary ? "Primary Contact" : `Contact ${index + 1}`}

              {activeContact === index && (
                <span className="absolute bottom-0 left-0 h-[3px] w-full rounded-t-full bg-emerald-600" />
              )}
            </button>
          ))}

          <button
            type="button"
            onClick={addContact}
            className="mb-2 flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
          >
            <Icon icon="lucide:plus" className="text-base" />
            Add contact
          </button>
        </div>
      </div>

      <div className="space-y-3 p-5">
        <div className="grid grid-cols-1 items-center gap-x-3 gap-y-2 sm:grid-cols-[125px_minmax(0,1fr)]">
          <label className="text-sm text-slate-800">Contact Name</label>
          <input
            value={selectedContact?.name || ""}
            onChange={(event) => updateContact("name", event.target.value)}
            className={inputClass}
            placeholder="Contact name"
          />

          <label className="text-sm text-slate-800">Job Title</label>
          <input
            value={selectedContact?.job_title || ""}
            onChange={(event) => updateContact("job_title", event.target.value)}
            className={inputClass}
            placeholder="Job title"
          />

          <label className="text-sm text-slate-800">Email</label>
          <div className="relative">
            <Icon
              icon="lucide:mail"
              className="absolute left-3 top-2 text-emerald-600 text-base"
            />
            <input
              type="email"
              value={selectedContact?.email || ""}
              onChange={(event) => updateContact("email", event.target.value)}
              className={`${inputClass} pl-9`}
              placeholder="contact@example.com"
            />
          </div>

          <label className="text-sm text-slate-800">Phone</label>
          <div className="relative">
            <Icon
              icon="lucide:phone"
              className="absolute left-3 top-2 text-emerald-600 text-base"
            />
            <input
              value={selectedContact?.phone || ""}
              onChange={(event) => updateContact("phone", event.target.value)}
              className={`${inputClass} pl-9`}
              placeholder="Phone number"
            />
          </div>

          <label className="text-sm text-slate-800">Website</label>
          <input
            value={value.website || ""}
            onChange={(event) => onChange("website", event.target.value)}
            onBlur={(event) =>
              onChange("website", normalizeWebsite(event.target.value))
            }
            className={`${inputClass} text-emerald-800 underline`}
            placeholder="https://example.com"
          />
        </div>

        {contacts.length > 1 && selectedContact && (
          <div className="flex justify-end border-t border-slate-100 pt-2">
            <button
              type="button"
              disabled={selectedContact.is_primary}
              onClick={() => {
                onContactChange(
                  contacts.filter((_, index) => index !== activeContact),
                );
                setActiveContact(0);
              }}
              className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon icon="lucide:trash-2" />
              Remove contact
            </button>
          </div>
        )}
      </div>
    </div>
  );
} */

/* "use client";

import type {
  Prospect,
  ProspectContact,
  ProspectAddress,
} from "@/types/prospect";
import { Icon } from "@iconify/react";

type Header = {
  company_name: string;
  website: string;
  description: string;
};

type Props = {
  value: Header & Record<string, unknown>;
  contacts: ProspectContact[];
  addresses: ProspectAddress[];
  onChange: <K extends keyof Header>(field: K, value: Header[K]) => void;
  onContactChange: (contacts: ProspectContact[]) => void;
  onAddressChange: (addresses: ProspectAddress[]) => void;
};

const inputClass =
  "h-8 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

export default function ProspectGeneralTab({
  value,
  contacts,
  addresses,
  onChange,
  onContactChange,
  onAddressChange,
}: Props) {
  const primaryContact =
    contacts.find((contact) => contact.is_primary) || contacts[0];
  const primaryAddress =
    addresses.find((address) => address.is_primary) || addresses[0];

  const updatePrimaryContact = (
    field: keyof ProspectContact,
    fieldValue: string,
  ) => {
    const current = primaryContact || {
      name: "",
      job_title: null,
      email: null,
      phone: null,
      mobile: null,
      is_primary: true,
      notes: null,
    };

    const updated = { ...current, [field]: fieldValue, is_primary: true };
    if (primaryContact?.id) {
      onContactChange(
        contacts.map((contact) =>
          contact.id === primaryContact.id ? updated : contact,
        ),
      );
    } else {
      onContactChange([{ ...updated, is_primary: true }, ...contacts.slice(1)]);
    }
  };

  const updatePrimaryAddress = (
    field: keyof ProspectAddress,
    fieldValue: string,
  ) => {
    const current = primaryAddress || {
      label: "Head Office",
      address_1: null,
      address_2: null,
      city: null,
      state: null,
      country: null,
      postcode: null,
      phone: null,
      email: null,
      is_primary: true,
      is_billing: true,
      is_shipping: true,
    };

    const updated = { ...current, [field]: fieldValue, is_primary: true };
    if (primaryAddress?.id) {
      onAddressChange(
        addresses.map((address) =>
          address.id === primaryAddress.id ? updated : address,
        ),
      );
    } else {
      onAddressChange([
        { ...updated, is_primary: true },
        ...addresses.slice(1),
      ]);
    }
  };

  const normalizeWebsite = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return trimmed.includes("://") ? trimmed : `https://${trimmed}`;
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900">
      
        <Icon
          icon="iconamoon:profile-light"
          className="text-emerald-800 text-3xl"
        />
        Basic Information
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[135px_minmax(0,1fr)] sm:items-center">
        <label className="text-sm text-black">
          Contact Name <span className="text-rose-600">*</span>
        </label>
        <input
          value={primaryContact?.name || ""}
          onChange={(event) => updatePrimaryContact("name", event.target.value)}
          className={inputClass}
          placeholder="Contact name"
        />

        <label className="text-sm text-black">
          Company Name <span className="text-rose-600">*</span>
        </label>
        <input
          value={value.company_name}
          onChange={(event) => onChange("company_name", event.target.value)}
          className={inputClass}
          placeholder="Company name"
        />

        <label className="text-sm text-black">Email</label>
        <input
          type="email"
          value={primaryContact?.email || ""}
          onChange={(event) =>
            updatePrimaryContact("email", event.target.value)
          }
          className={inputClass}
          placeholder="contact@example.com"
        />

        <label className="text-sm text-black">Phone</label>
        <input
          value={primaryContact?.phone || ""}
          onChange={(event) =>
            updatePrimaryContact("phone", event.target.value)
          }
          className={inputClass}
          placeholder="Phone number"
        />

        

        <label className="text-sm text-black">Location</label>
        <input
          value={[primaryAddress?.city, primaryAddress?.country]
            .filter(Boolean)
            .join(", ")}
          onChange={(event) => updatePrimaryAddress("city", event.target.value)}
          className={inputClass}
          placeholder="City"
        />

        <label className="text-sm text-black">Website</label>

        <input
          type="text"
          value={value.website || ""}
          onChange={(e) => onChange("website", e.target.value)}
          onBlur={(e) => onChange("website", normalizeWebsite(e.target.value))}
          className="h-8 w-full rounded-md underline border border-slate-300 bg-white px-3 text-sm text-emerald-800 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          placeholder="https://..."
        />
      </div>
    </div>
  );
}
 */
