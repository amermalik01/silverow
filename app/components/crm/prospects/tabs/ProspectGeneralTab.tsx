// app/components/crm/prospects/tabs/ProspectGeneralTab.tsx

"use client";

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
        {/* <span className="text-emerald-800">♙</span> */}
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

        {/* <label className="text-sm text-black">Mobile</label>
        <input
          value={primaryContact?.mobile || ""}
          onChange={(event) =>
            updatePrimaryContact("mobile", event.target.value)
          }
          className={inputClass}
          placeholder="Mobile number"
        /> */}

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
          className="h-8 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-emerald-800 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          placeholder="https://..."
        />
      </div>

      {/* <div className="mt-4">
        <label className="mb-1 block text-sm text-black">Description</label>
        <textarea
          rows={3}
          value={value.description}
          onChange={(event) => onChange("description", event.target.value)}
          className="w-full rounded-md border border-slate-300 p-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          placeholder="Additional information about this prospect..."
        />
      </div> */}
    </div>
  );
}
