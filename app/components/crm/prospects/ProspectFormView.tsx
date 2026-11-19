// app/components/crm/prospects/ProspectFormView.tsx

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type {
  Prospect,
  ProspectContact,
  ProspectAddress,
  ProspectDetails,
  ProspectPayload,
  ProspectTab,
} from "@/types/prospect";

import SalespersonLookupModal, {
  Employee,
} from "@/app/components/shared/modals/SalespersonLookupModal";

import ProspectFormTabs from "./tabs/ProspectFormTabs";
import ProspectGeneralTab from "./tabs/ProspectGeneralTab";
import ProspectContactsTab from "./tabs/ProspectContactsTab";
import ProspectAddressesTab from "./tabs/ProspectAddressesTab";
import ProspectNotesTab from "./tabs/ProspectNotesTab";
import ProspectAttachmentsTab from "./tabs/ProspectAttachmentsTab";
import ProspectActivityTimeline from "./components/ProspectActivityTimeline";
import ProspectActivityModal from "./components/ProspectActivityModal";
import ProspectConvertModal from "./components/ProspectConvertModal";
import ProspectStatusFlow from "./components/ProspectStatusFlow";
import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";
import { useLoader } from "@/app/context/LoaderContext";
import { Icon } from "@iconify/react";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO, startOfDay } from "date-fns";

type Props = {
  prospectId?: string;
  slug: string;
};

type ProspectFormHeader = {
  company_name: string;
  prospect_no?: string;
  website: string;
  status: Prospect["status"];
  source: NonNullable<Prospect["source"]>;
  priority: Prospect["priority"];
  assigned_to: string;
  assigned_to_name: string;
  estimated_deal_value: string;
  currency_id: string;
  last_contacted_at: string;
  next_follow_up_at: string;
  reminder_enabled: boolean;
  description: string;
  lost_reason: string;
};

const emptyHeader: ProspectFormHeader = {
  company_name: "",
  prospect_no: "",
  website: "",
  status: "New",
  source: "Other",
  priority: "Medium",
  assigned_to: "",
  assigned_to_name: "",
  estimated_deal_value: "0",
  currency_id: "",
  last_contacted_at: "",
  next_follow_up_at: "",
  reminder_enabled: false,
  description: "",
  lost_reason: "",
};

function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function makeEmptyContact(): ProspectContact {
  return {
    name: "",
    job_title: null,
    email: null,
    phone: null,
    mobile: null,
    is_primary: false,
    notes: null,
  };
}

function makeEmptyAddress(): ProspectAddress {
  return {
    label: "Head Office",
    address_1: null,
    address_2: null,
    city: null,
    state: null,
    country: null,
    postcode: null,
    phone: null,
    email: null,
    is_primary: false,
    is_billing: true,
    is_shipping: true,
  };
}

export default function ProspectFormView({ prospectId, slug }: Props) {
  const router = useRouter();
  //   const params = useParams<{ slug: string }>();
  //   const slug = params.slug;
  const isEdit = Boolean(prospectId);

  const { show, hide } = useLoader();

  const [header, setHeader] = useState<ProspectFormHeader>(emptyHeader);
  const [contacts, setContacts] = useState<ProspectContact[]>([
    makeEmptyContact(),
  ]);
  const [addresses, setAddresses] = useState<ProspectAddress[]>([
    makeEmptyAddress(),
  ]);
  const [notes, setNotes] = useState<
    Array<{ id?: string | null; title: string; content: string }>
  >([]);
  const [details, setDetails] = useState<ProspectDetails | null>(null);
  const [activeTab, setActiveTab] = useState<ProspectTab>("general");
  //   const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activityOpen, setActivityOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  const [salespersonModalOpen, setSalespersonModalOpen] =
    useState<boolean>(false);

  const primaryContact = useMemo(
    () => contacts.find((contact) => contact.is_primary) || contacts[0],
    [contacts],
  );

  const primaryAddress = useMemo(
    () => addresses.find((address) => address.is_primary) || addresses[0],
    [addresses],
  );

  const loadProspect = useCallback(async () => {
    if (!prospectId) return;
    setError("");
    show("Fetching Prospect...");

    try {
      const response = await fetch(`/api/sales/crm/prospects/${prospectId}`, {
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Unable to load prospect.");

      const result = (await response.json()) as ProspectDetails;
      setDetails(result);
      setContacts(
        result.contacts.length ? result.contacts : [makeEmptyContact()],
      );
      setAddresses(
        result.addresses.length ? result.addresses : [makeEmptyAddress()],
      );

      const prospect = result.prospect;

      setHeader({
        company_name: prospect.company_name || "",
        prospect_no: prospect.prospect_no || "",
        website: prospect.website || "",
        status: prospect.status,
        source: prospect.source ?? "Other",
        priority: prospect.priority,
        assigned_to: prospect.assigned_to || "",
        assigned_to_name: prospect.assigned_to_name || "",
        estimated_deal_value: String(prospect.estimated_deal_value ?? 0),
        currency_id: prospect.currency_id || "",
        last_contacted_at: toDateInput(prospect.last_contacted_at),
        next_follow_up_at: toDateInput(prospect.next_follow_up_at),
        reminder_enabled: prospect.reminder_enabled,
        description: prospect.description || "",
        lost_reason: prospect.lost_reason || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load prospect.");
    } finally {
      hide();
    }
  }, [prospectId]);

  useEffect(() => {
    void loadProspect();
  }, [loadProspect]);

  const updateHeader = <K extends keyof ProspectFormHeader>(
    field: K,
    value: ProspectFormHeader[K],
  ) => {
    setHeader((current) => ({ ...current, [field]: value }));
  };

  const handleAssignPersonSelect = (emp: Employee) => {
    setHeader((prev) => ({
      ...prev,
      assigned_to: emp.id,
      assigned_to_name: `${emp.employee_code}-${emp.display_name}`,
    }));
    setSalespersonModalOpen(false);
  };

  const saveProspect = async () => {
    setSaving(true);
    setError("");
    show("Saving Prospect...");

    try {
      const payload: ProspectPayload = {
        prospect: {
          ...header,
          estimated_deal_value: Number(header.estimated_deal_value || 0),
          assigned_to: header.assigned_to || null,
          currency_id: header.currency_id || null,
          last_contacted_at: header.last_contacted_at || null,
          next_follow_up_at: header.next_follow_up_at || null,
        },

        contacts: contacts
          .filter((contact) => contact.name.trim().length > 0)
          .map((contact) => ({
            id: contact.id ?? null,
            name: contact.name.trim(),
            job_title: contact.job_title || null,
            email: contact.email || null,
            phone: contact.phone || null,
            mobile: contact.mobile || null,
            is_primary: contact.is_primary,
            notes: contact.notes || null,
          })),

        addresses: addresses
          .filter(
            (address) =>
              Boolean(address.address_1?.trim()) ||
              Boolean(address.city?.trim()) ||
              Boolean(address.postcode?.trim()) ||
              Boolean(address.email?.trim()),
          )
          .map((address) => ({
            id: address.id ?? null,
            label: address.label || "Head Office",
            address_1: address.address_1 || null,
            address_2: address.address_2 || null,
            city: address.city || null,
            state: address.state || null,
            country: address.country || null,
            postcode: address.postcode || null,
            phone: address.phone || null,
            email: address.email || null,
            is_primary: address.is_primary,
            is_billing: address.is_billing,
            is_shipping: address.is_shipping,
          })),

        notes: notes
          .filter((note) => note.content.trim().length > 0)
          .map((note) => ({
            id: note.id ?? null,
            title: note.title || "General Note Entry",
            content: note.content.trim(),
          })),
      };

      const response = await fetch(
        isEdit
          ? `/api/sales/crm/prospects/${prospectId}`
          : "/api/sales/crm/prospects",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Unable to save prospect.";
        throw new Error(message);
      }

      const savedId =
        typeof result === "object" &&
        result !== null &&
        "id" in result &&
        typeof result.id === "string"
          ? result.id
          : prospectId;

      if (savedId) router.push(`/${slug}/sales/prospects/${savedId}`);
      else router.push(`/${slug}/sales/prospects`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save prospect.");
    } finally {
      setSaving(false);
      hide();
    }
  };

  const changeStatus = async (status: Prospect["status"]) => {
    if (!prospectId) {
      updateHeader("status", status);
      return;
    }

    const response = await fetch(
      `/api/sales/crm/prospects/${prospectId}/status`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          remarks: null,
          lostReason: status === "Lost" ? header.lost_reason : null,
        }),
      },
    );

    if (!response.ok) {
      setError("Unable to update prospect status.");
      return;
    }

    updateHeader("status", status);
    await loadProspect();
  };

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          {
            label: "Prospects",
            href: `/${slug}/sales/prospects`,
          },
          {
            label: header.prospect_no || "",
          },
        ]}
      />

      {/* <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold px-4">
          {isEdit ? "Edit Prospect" : "New Prospect"}
        </h1>
      </div> */}

      {error.length > 0 && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg space-y-1">
          {error}
          {/* {error.map((err, idx) => (
                  <p
                    key={idx}
                    className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1"
                  >
                    <Icon icon="tabler:alert-circle" className="inline w-3.5 h-3.5" />{" "}
                    {err}
                  </p>
                ))} */}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
            <Icon
              icon="heroicons:building-office"
              className="text-emerald-800 text-3xl"
            />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-slate-950">
              {header.company_name || "New Prospect"}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {primaryContact?.name || "No primary contact"}
              {primaryAddress?.city ? ` · ${primaryAddress.city}` : ""}
            </p>
          </div>
          <span className="ml-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            {header.status}
          </span>

          {header.prospect_no && (
            <div className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded text-md font-bold border border-emerald-200 dark:border-emerald-900">
              {header.prospect_no}
            </div>
          )}

          {/* {isEdit && (
            <ProspectStatusFlow
              status={header.status}
              onChange={(status) => void changeStatus(status)}
            />
          )} */}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-5">
          <ProspectGeneralTab
            value={header}
            contacts={contacts}
            addresses={addresses}
            onChange={updateHeader}
            onContactChange={setContacts}
            onAddressChange={setAddresses}
          />

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900">
              <Icon
                icon="iconmind:sale-tag-outline-thin"
                className="text-emerald-800 text-3xl"
              />
              Sales Information
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[135px_minmax(0,1fr)] sm:items-center">
              <label className="text-sm text-black">Status</label>

              <select
                value={header.status}
                onChange={(event) =>
                  updateHeader(
                    "status",
                    event.target.value as Prospect["status"],
                  )
                }
                className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800"
              >
                {[
                  "New",
                  "Contacted",
                  "Interested",
                  "Qualified",
                  "Proposal",
                  "Negotiation",
                  "Lost",
                ].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <label className="text-sm text-black">Source</label>
              <select
                value={header.source}
                onChange={(event) =>
                  updateHeader(
                    "source",
                    event.target.value as NonNullable<Prospect["source"]>,
                  )
                }
                className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800"
              >
                {[
                  "Website",
                  "Referral",
                  "Social Media",
                  "Email Campaign",
                  "Cold Call",
                  "Trade Show",
                  "Advertisement",
                  "Other",
                ].map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>

              <label className="text-sm text-black">Priority</label>
              <select
                value={header.priority}
                onChange={(event) =>
                  updateHeader(
                    "priority",
                    event.target.value as Prospect["priority"],
                  )
                }
                className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800"
              >
                {["Low", "Medium", "High"].map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>

              <label className="text-sm text-black">Assigned To</label>
              {/* <input
                value={header.assigned_to_name}
                onChange={(event) =>
                  updateHeader("assigned_to_name", event.target.value)
                }
                className="mt-1 h-8 w-full rounded-md border border-slate-300 px-3 text-sm"
                placeholder="Assigned employee"
              /> */}

              {/* {isEdit ? (
                <>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 truncate">
                      {header.assigned_to_name}
                    </span>
                  </div>
                </>
              ) : ( */}
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="text"
                    readOnly
                    value={header.assigned_to_name || "Select Person..."}
                    className="mt-1 h-8 w-full rounded-md border border-slate-300 px-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setSalespersonModalOpen(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                    title="Lookup Person"
                  >
                    <Icon icon="tabler:external-link" className="w-4 h-4" />
                  </button>
                </div>
              {/* )} */}

              <label className="text-sm text-black">Estimated Deal Value</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={header.estimated_deal_value}
                onChange={(event) =>
                  updateHeader("estimated_deal_value", event.target.value)
                }
                className="mt-1 h-8 w-full rounded-md border border-slate-300 px-3 text-sm"
              />

              {header.status === "Lost" && (
                <>
                  <label className="text-sm text-black">Lost Reason *</label>
                  <textarea
                    value={header.lost_reason}
                    onChange={(event) =>
                      updateHeader("lost_reason", event.target.value)
                    }
                    rows={2}
                    className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm"
                  />
                </>
              )}
            </div>
          </div>

          <ProspectFormTabs activeTab={activeTab} onChange={setActiveTab} />
          {activeTab === "contacts" && (
            <ProspectContactsTab contacts={contacts} onChange={setContacts} />
          )}
          {activeTab === "addresses" && (
            <ProspectAddressesTab
              addresses={addresses}
              onChange={setAddresses}
            />
          )}
          {activeTab === "notes" && (
            <ProspectNotesTab notes={notes} onChange={setNotes} />
          )}
          {activeTab === "attachments" && <ProspectAttachmentsTab />}
        </div>

        <div className="space-y-4 xl:col-span-7">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className=" px-5 pt-4">
              {/* border-b border-slate-200 */}
              <h2 className=" flex items-center gap-2 text-xl font-bold text-slate-900">
                {/* mb-4 */}
                <Icon
                  icon="andrsrxn:calendar"
                  className="text-emerald-800 text-3xl"
                />
                Follow-up
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
              <label className="text-sm text-black">
                Last Contacted
                {/* <input
                  type="date"
                  value={header.last_contacted_at}
                  onChange={(event) =>
                    updateHeader("last_contacted_at", event.target.value)
                  }
                  className="mt-2 h-8 w-full rounded-md border border-slate-300 px-2 text-sm"
                /> */}
                <DatePicker
                  value={
                    header.last_contacted_at
                      ? parseISO(header.last_contacted_at)
                      : undefined
                  }
                  containerClassName="mt-2 text-sm"
                  maxDate={new Date()}
                  onChange={(date) =>
                    updateHeader(
                      "last_contacted_at",
                      date ? format(date, "yyyy-MM-dd") : "",
                    )
                  }
                />
              </label>
              <label className="text-sm text-black">
                Next Follow-up
                <DatePicker
                  value={
                    header.next_follow_up_at
                      ? parseISO(header.next_follow_up_at)
                      : undefined
                  }
                  containerClassName="mt-2 text-sm"
                  maxDate={new Date()}
                  onChange={(date) =>
                    updateHeader(
                      "next_follow_up_at",
                      date ? format(date, "yyyy-MM-dd") : "",
                    )
                  }
                />
                {/* <input
                  type="date"
                  value={header.next_follow_up_at}
                  onChange={(event) =>
                    updateHeader("next_follow_up_at", event.target.value)
                  }
                  className="mt-2 h-8 w-full rounded-md border border-slate-300 px-2 text-sm"
                /> */}
              </label>
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-black">
                <input
                  type="checkbox"
                  checked={header.reminder_enabled}
                  onChange={(event) =>
                    updateHeader("reminder_enabled", event.target.checked)
                  }
                  className="h-4 w-4 accent-emerald-800"
                />
                Set Reminder
              </label>
            </div>
          </div>

          {isEdit && details && (
            <ProspectActivityTimeline
              prospectId={prospectId!}
              initialActivities={details.activities}
              onAddActivity={() => setActivityOpen(true)}
              onRefresh={loadProspect}
            />
          )}
        </div>
      </div>

      <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        {isEdit && (
          <>
            <button
              type="button"
              onClick={() => setActivityOpen(true)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-black hover:bg-slate-50"
            >
              {/* <Icon icon="hugeicons:contact-02" className="text-emerald-800" /> */}{" "}
              Log Activity
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-black hover:bg-slate-50"
            >
              Edit
            </button>
            {header.status !== "Converted" && (
              <button
                type="button"
                onClick={() => setConvertOpen(true)}
                className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900"
              >
                Convert to Customer
              </button>
            )}
          </>
        )}
        <button
          type="button"
          onClick={() => void saveProspect()}
          disabled={saving}
          className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/${slug}/sales/prospects`)}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-black hover:bg-slate-50"
        >
          Close
        </button>
      </div>

      {activityOpen && prospectId && (
        <ProspectActivityModal
          prospectId={prospectId}
          contacts={contacts}
          onClose={() => setActivityOpen(false)}
          onSaved={async () => {
            setActivityOpen(false);
            await loadProspect();
          }}
        />
      )}

      {convertOpen && prospectId && (
        <ProspectConvertModal
          prospectId={prospectId}
          companyName={header.company_name}
          onClose={() => setConvertOpen(false)}
          onConverted={async () => {
            setConvertOpen(false);
            await loadProspect();
          }}
        />
      )}

      <SalespersonLookupModal
        open={salespersonModalOpen}
        onClose={() => setSalespersonModalOpen(false)}
        onSelect={handleAssignPersonSelect}
      />
    </div>
  );
}
