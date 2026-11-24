// app/components/crm/prospects/ProspectFormView.tsx

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Icon } from "@iconify/react";
import { format, parseISO } from "date-fns";

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

import ProspectGeneralTab from "./tabs/ProspectGeneralTab";
import ProspectHeader from "./components/ProspectHeader";
import ProspectSalesInformation from "./components/ProspectSalesInformation";
import ProspectAddressLocations from "./components/ProspectAddressLocations";
import ProspectWorkspaceTabs, {
  type ProspectWorkspaceTab,
} from "./components/ProspectWorkspaceTabs";

import ProspectActivityTimeline from "./components/ProspectActivityTimeline";
import ProspectActivityModal from "./components/ProspectActivityModal";
import ProspectConvertModal from "./components/ProspectConvertModal";
import ProspectNotesList from "./components/ProspectNotesList";
import AttachmentsTab from "@/app/components/shared/AttachmentsTab";
import ProspectPricingTab from "./components/ProspectPricingTab";
import { useProspectOffers } from "./hooks/useProspectOffers";

import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";
import { useLoader } from "@/app/context/LoaderContext";
import { DatePicker } from "@/components/ui/date-picker";

type CurrencyOption = {
  id: string;
  code: string;
  name: string;
  exchange_rate: string | number;
  is_base: boolean;
};

type PostingGroupOption = {
  id: string;
  name: string;
};

type Props = {
  prospectId?: string;
  slug: string;
  /**
   * Existing prospects open in "view" mode (all fields disabled) unless
   * "edit" is passed, e.g. from the /[id]/edit route.
   */
  initialMode?: "view" | "edit";
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
  vat_business_group_id: string;
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
  vat_business_group_id: "",
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
    is_primary: true,
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
    is_primary: true,
    is_billing: true,
    is_shipping: true,
  };
}

function formatDate(value: string): string {
  if (!value) return "Not scheduled";

  const date = parseISO(value);

  return Number.isNaN(date.getTime()) ? value : format(date, "dd/MM/yyyy");
}

export default function ProspectFormView({
  prospectId,
  slug,
  initialMode = "view",
}: Props) {
  const router = useRouter();
  const isEdit = Boolean(prospectId);

  const { data: session } = useSession();
  const baseCurrencyCode = session?.user?.base_currency_code || "GBP";

  const { show, hide } = useLoader();

  const [header, setHeader] = useState<ProspectFormHeader>(emptyHeader);

  /* Currency + VAT business posting group options (same sources as parties Finance tab). */
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [postingGroups, setPostingGroups] = useState<PostingGroupOption[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [currencyRes, masterRes] = await Promise.all([
          fetch("/api/parties/currencies"),
          fetch("/api/parties/finance-master-data?moduleType=sales"),
        ]);

        if (!cancelled && currencyRes.ok) {
          setCurrencies((await currencyRes.json()) as CurrencyOption[]);
        }

        if (!cancelled && masterRes.ok) {
          const master = (await masterRes.json()) as {
            postingGroups?: PostingGroupOption[];
          };
          setPostingGroups(master.postingGroups ?? []);
        }
      } catch (err) {
        console.error("Failed to load currency / posting group options:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* Default to the company base currency when none is set. */
  useEffect(() => {
    if (header.currency_id || !currencies.length) return;

    const base =
      currencies.find((currency) => currency.is_base) ??
      currencies.find((currency) => currency.code === baseCurrencyCode);

    if (base) {
      setHeader((current) =>
        current.currency_id ? current : { ...current, currency_id: base.id },
      );
    }
  }, [currencies, header.currency_id, baseCurrencyCode]);

  const selectedCurrencyCode =
    currencies.find((currency) => currency.id === header.currency_id)?.code ||
    baseCurrencyCode;

  const [contacts, setContacts] = useState<ProspectContact[]>([
    makeEmptyContact(),
  ]);

  const [addresses, setAddresses] = useState<ProspectAddress[]>([
    makeEmptyAddress(),
  ]);

  const [details, setDetails] = useState<ProspectDetails | null>(null);

  const [activeWorkspaceTab, setActiveWorkspaceTab] =
    useState<ProspectWorkspaceTab>("activity");

  const [saving, setSaving] = useState(false);

  /* View / edit mode (new prospects are always in edit mode). */
  const [isEditing, setIsEditing] = useState(
    !prospectId || initialMode === "edit",
  );
  
  const [error, setError] = useState("");

  const [activityOpen, setActivityOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  const [salespersonModalOpen, setSalespersonModalOpen] = useState(false);

  /* Price offers (Pricing tab + Interested Products) */
  const offersState = useProspectOffers(prospectId);
  const [addItemsRequested, setAddItemsRequested] = useState(false);

  const interestedProducts = useMemo(
    () =>
      offersState.primaryOffer?.lines.map((line) => line.item_name) ?? [],
    [offersState.primaryOffer],
  );

  const isConverted =
    header.status === "Converted" ||
    Boolean(details?.prospect.converted_party_id);

  /* Fields are locked in view mode and always once converted. */
  const readOnly = isConverted || !isEditing;

  const handleCancelEdit = async () => {
    setError("");
    setIsEditing(false);
    await loadProspect(); // discard unsaved changes
  };

  const openProductPicker = () => {
    if (readOnly) return;
    setActiveWorkspaceTab("pricing");
    setAddItemsRequested(true);
  };

  const primaryContact = useMemo(
    () => contacts.find((contact) => contact.is_primary) || contacts[0],
    [contacts],
  );

  const loadProspect = useCallback(async () => {
    if (!prospectId) return;

    setError("");
    show("Fetching Prospect...");

    try {
      const response = await fetch(`/api/sales/crm/prospects/${prospectId}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load prospect.");
      }

      const result = (await response.json()) as ProspectDetails;

      setDetails(result);

      //   setContacts(
      //     result.contacts.length ? result.contacts : [makeEmptyContact()],
      //   );

      const loadedContacts = [...result.contacts]
        .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
        .slice(0, 2)
        .map((contact, index) => ({
          ...contact,
          is_primary: index === 0,
        }));

      setContacts(
        loadedContacts.length ? loadedContacts : [makeEmptyContact()],
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
        vat_business_group_id: prospect.vat_business_group_id || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load prospect.");
    } finally {
      hide();
    }
  }, [prospectId, show, hide]);

  useEffect(() => {
    void loadProspect();
  }, [loadProspect]);

  const updateHeader = <K extends keyof ProspectFormHeader>(
    field: K,
    value: ProspectFormHeader[K],
  ) => {
    setHeader((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleAssignPersonSelect = (emp: Employee) => {
    setHeader((previous) => ({
      ...previous,
      assigned_to: emp.id,
      assigned_to_name: `${emp.employee_code}-${emp.display_name}`,
    }));

    setSalespersonModalOpen(false);
  };

  const saveProspect = async () => {
    if (!header.company_name.trim()) {
      setError("Company name is required.");
      return;
    }

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
          vat_business_group_id: header.vat_business_group_id || null,
          last_contacted_at: header.last_contacted_at || null,
          next_follow_up_at: header.next_follow_up_at || null,
        },

        contacts: contacts
          .filter((contact) => contact.name.trim())
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
      };

      const response = await fetch(
        isEdit
          ? `/api/sales/crm/prospects/${prospectId}`
          : "/api/sales/crm/prospects",
        {
          method: isEdit ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
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

      if (isEdit) {
        /* Existing record: reload saved data and return to view mode. */
        setIsEditing(false);
        await Promise.all([loadProspect(), offersState.reload()]);
        return;
      }

      /* New record: open it (in view mode). POST returns { prospect }. */
      const createdId =
        typeof result === "object" &&
        result !== null &&
        "prospect" in result &&
        typeof result.prospect === "object" &&
        result.prospect !== null &&
        "id" in result.prospect &&
        typeof result.prospect.id === "string"
          ? result.prospect.id
          : null;

      router.push(
        createdId
          ? `/${slug}/sales/prospects/${createdId}`
          : `/${slug}/sales/prospects`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save prospect.");
    } finally {
      setSaving(false);
      hide();
    }
  };

  const renderWorkspaceContent = () => {
    switch (activeWorkspaceTab) {
      case "activity":
        return isEdit && details ? (
          <ProspectActivityTimeline
            prospectId={prospectId!}
            initialActivities={details.activities}
            onAddActivity={() => setActivityOpen(true)}
            onRefresh={loadProspect}
            readOnly={isConverted}
          />
        ) : (
          <div className="py-12 text-center">
            <Icon
              icon="lucide:activity"
              className="mx-auto text-4xl text-emerald-600"
            />
            <p className="mt-2 text-sm text-slate-500">
              Activities will appear here after creating the prospect.
            </p>
          </div>
        );

      case "follow-up":
        return (
          <fieldset disabled={readOnly} className="min-w-0 space-y-4">
            <h3 className="flex items-center gap-2 font-bold text-slate-900">
              <Icon
                icon="lucide:calendar-days"
                className="text-xl text-emerald-600"
              />
              Follow-up Schedule
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-700">
                Last Contacted
                <DatePicker
                  disabled={readOnly}
                  value={
                    header.last_contacted_at
                      ? parseISO(header.last_contacted_at)
                      : undefined
                  }
                  containerClassName="text-sm"
                  maxDate={new Date()}
                  onChange={(date) =>
                    updateHeader(
                      "last_contacted_at",
                      date ? format(date, "yyyy-MM-dd") : "",
                    )
                  }
                />
              </label>

              <label className="space-y-2 text-sm text-slate-700">
                Next Follow-up
                <DatePicker
                  disabled={readOnly}
                  value={
                    header.next_follow_up_at
                      ? parseISO(header.next_follow_up_at)
                      : undefined
                  }
                  containerClassName="text-sm"
                  onChange={(date) =>
                    updateHeader(
                      "next_follow_up_at",
                      date ? format(date, "yyyy-MM-dd") : "",
                    )
                  }
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={header.reminder_enabled}
                onChange={(event) =>
                  updateHeader("reminder_enabled", event.target.checked)
                }
                className="h-4 w-4 accent-emerald-700"
              />
              Enable follow-up reminder
            </label>

            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              <div className="font-semibold">Next scheduled follow-up</div>
              <div className="mt-1">{formatDate(header.next_follow_up_at)}</div>
            </div>

            {!readOnly && (
              <p className="text-xs text-slate-500">
                Remember to save the prospect after updating follow-up details.
              </p>
            )}
          </fieldset>
        );

      case "notes":
        return prospectId ? (
          <ProspectNotesList prospectId={prospectId} readonly={readOnly} />
        ) : (
          <div className="py-12 text-center">
            <Icon
              icon="lucide:file-text"
              className="mx-auto text-4xl text-emerald-600"
            />
            <p className="mt-2 text-sm text-slate-500">
              Notes can be added after creating the prospect.
            </p>
          </div>
        );

      case "attachments":
        return prospectId ? (
          <AttachmentsTab
            module="prospect"
            recordId={prospectId}
            readonly={readOnly}
            onRequestEdit={isConverted ? undefined : () => setIsEditing(true)}
          />
        ) : (
          <div className="py-12 text-center">
            <Icon
              icon="lucide:paperclip"
              className="mx-auto text-4xl text-emerald-600"
            />
            <p className="mt-2 text-sm text-slate-500">
              Attachments can be uploaded after creating the prospect.
            </p>
          </div>
        );

      case "pricing":
        return prospectId ? (
          <ProspectPricingTab
            offersState={offersState}
            addItemsRequested={addItemsRequested}
            onAddItemsHandled={() => setAddItemsRequested(false)}
            readOnly={readOnly}
            prospectCurrency={{
              id: header.currency_id || null,
              code: selectedCurrencyCode,
              exchange_rate: Number(
                currencies.find((c) => c.id === header.currency_id)
                  ?.exchange_rate ?? 1,
              ),
            }}
          />
        ) : (
          <div className="py-12 text-center">
            <Icon
              icon="lucide:tag"
              className="mx-auto text-4xl text-emerald-600"
            />
            <p className="mt-2 text-sm text-slate-500">
              Pricing can be added after creating the prospect.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-3 pb-6">
      <Breadcrumbs
        items={[
          {
            label: "Prospects",
            href: `/${slug}/sales/prospects`,
          },
          {
            label: header.prospect_no || "New Prospect",
          },
        ]}
      />

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {isConverted && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <Icon icon="lucide:info" className="shrink-0 text-lg" />
          This prospect has been converted to a customer and is read-only.
          Continue working on the customer record.
        </div>
      )}

      <ProspectHeader
        companyName={header.company_name}
        prospectNo={header.prospect_no}
        status={header.status}
        contactName={primaryContact?.name}
        isEdit={isEdit}
        isEditing={!readOnly}
        isConverted={isConverted}
        saving={saving}
        onCompanyNameChange={(value) => updateHeader("company_name", value)}
        onBack={() => router.push(`/${slug}/sales/prospects`)}
        onEdit={() => setIsEditing(true)}
        onCancelEdit={() => void handleCancelEdit()}
        onViewCustomer={
          details?.prospect.converted_party_id
            ? () =>
                router.push(
                  `/${slug}/sales/customer/${details.prospect.converted_party_id}`,
                )
            : undefined
        }
        onLogActivity={() => setActivityOpen(true)}
        onConvert={() => setConvertOpen(true)}
        onSave={() => void saveProspect()}
        onClose={() => router.push(`/${slug}/sales/prospects`)}
      />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        {/* LEFT COLUMN */}
        <div className="space-y-4 xl:col-span-5">
          <ProspectGeneralTab
            value={header}
            contacts={contacts}
            addresses={addresses}
            onChange={updateHeader}
            onContactChange={setContacts}
            onAddressChange={setAddresses}
            readOnly={readOnly}
          />

          <ProspectSalesInformation
            status={header.status}
            source={header.source}
            priority={header.priority}
            assignedToName={header.assigned_to_name}
            estimatedDealValue={header.estimated_deal_value}
            currencyCode={selectedCurrencyCode}
            currencies={currencies}
            currencyId={header.currency_id}
            onCurrencyChange={(value) => updateHeader("currency_id", value)}
            postingGroups={postingGroups}
            vatBusinessGroupId={header.vat_business_group_id}
            onPostingGroupChange={(value) =>
              updateHeader("vat_business_group_id", value)
            }
            lostReason={header.lost_reason}
            onStatusChange={(value) => updateHeader("status", value)}
            onSourceChange={(value) => updateHeader("source", value)}
            onPriorityChange={(value) => updateHeader("priority", value)}
            onAssignedToClick={() => setSalespersonModalOpen(true)}
            onDealValueChange={(value) =>
              updateHeader("estimated_deal_value", value)
            }
            onLostReasonChange={(value) => updateHeader("lost_reason", value)}
            interestedProducts={interestedProducts}
            productsEnabled={Boolean(prospectId)}
            onManageProducts={openProductPicker}
            readOnly={readOnly}
          />
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4 xl:col-span-7">
          <ProspectAddressLocations
            addresses={addresses}
            onChange={setAddresses}
            readOnly={readOnly}
          />

          <ProspectWorkspaceTabs
            activeTab={activeWorkspaceTab}
            onChange={setActiveWorkspaceTab}
            attachmentCount={0}
          >
            {renderWorkspaceContent()}
          </ProspectWorkspaceTabs>
        </div>
      </div>

      {/* ACTIVITY MODAL */}
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

      {/* CONVERSION MODAL */}
      {convertOpen && prospectId && (
        <ProspectConvertModal
          prospectId={prospectId}
          companyName={header.company_name}
          onClose={() => setConvertOpen(false)}
          onConverted={(customerId) => {
            setConvertOpen(false);
            /* Converted prospects leave the prospect list; open the customer. */
            router.push(
              customerId
                ? `/${slug}/sales/customer/${customerId}`
                : `/${slug}/sales/prospects`,
            );
          }}
        />
      )}

      {/* SALESPERSON LOOKUP */}
      <SalespersonLookupModal
        open={salespersonModalOpen}
        onClose={() => setSalespersonModalOpen(false)}
        onSelect={handleAssignPersonSelect}
      />
    </div>
  );
}

/* "use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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

import ProspectGeneralTab from "./tabs/ProspectGeneralTab";
import ProspectActivityTimeline from "./components/ProspectActivityTimeline";
import ProspectActivityModal from "./components/ProspectActivityModal";
import ProspectConvertModal from "./components/ProspectConvertModal";
import Breadcrumbs from "../../layout/shared/breadcrumb/BreadcrumbComp";
import { useLoader } from "@/app/context/LoaderContext";
import { Icon } from "@iconify/react";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO, startOfDay } from "date-fns";
import NumericTextInput from "@/components/ui/NumericTextInput";

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

interface SwitchPillProps {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}

function SwitchPill({ checked, disabled, onChange, label }: SwitchPillProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`inline-flex items-center gap-2 text-xs font-medium transition-colors ${
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
          checked
            ? "bg-emerald-600 border-emerald-600"
            : "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-2xs transition-transform ${
            checked ? "translate-x-4.5" : "translate-x-0.5"
          }`}
        />
      </span>
      <span className="text-slate-700 dark:text-slate-200">{label}</span>
    </button>
  );
}

export default function ProspectFormView({ prospectId, slug }: Props) {
  const router = useRouter();
  //   const params = useParams<{ slug: string }>();
  //   const slug = params.slug;
  const isEdit = Boolean(prospectId);
  const { data: session } = useSession();

  const baseCurrencyCode = session?.user?.base_currency_code || "GBP";

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

        // notes: notes
        //   .filter((note) => note.content.trim().length > 0)
        //   .map((note) => ({
        //     id: note.id ?? null,
        //     title: note.title || "General Note Entry",
        //     content: note.content.trim(),
        //   })),
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

      {error.length > 0 && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg space-y-1">
          {error}
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
            <h2 className="truncate text-2xl font-bold text-slate-950">
              {header.company_name || "New Prospect"}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {primaryContact?.name || "No primary contact"}
            </p>
          </div>
          <span className="ml-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            {header.status}
          </span>

          {header.prospect_no && (
            <div className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded text-md font-bold border border-emerald-200 dark:border-emerald-900">
              {header.prospect_no}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isEdit && (
            <>
              <button
                type="button"
                onClick={() => setActivityOpen(true)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-black hover:bg-slate-50"
              >
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
                className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-emerald-100 text-emerald-700 px-2 text-sm"
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
                  <option
                    key={status}
                    value={status}
                    className="bg-emerald-100 text-emerald-700"
                  >
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

              <label className="text-sm text-black">
                Estimated Deal Value ({baseCurrencyCode})
              </label>
              <NumericTextInput
                value={Number(header.estimated_deal_value) || 0}
                allowDecimals={true}
                decimalScale={2}
                className="mt-1 h-8 w-full rounded-md border border-slate-300 px-3 text-sm"
                onChange={(val) =>
                  updateHeader("estimated_deal_value", String(val))
                }
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
        </div>

        <div className="space-y-4 xl:col-span-7">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className=" px-5 pt-4">
              <h2 className=" flex items-center gap-2 text-xl font-bold text-slate-900">
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
              </label>

              <label className="flex items-center gap-2 self-end pb-2 text-sm text-black">
                <SwitchPill
                  label="Set Reminder"
                  checked={header.reminder_enabled}
                  onChange={(val) => updateHeader("reminder_enabled", val)}
                />
              </label>
            </div>
          </div>

          {isEdit && details && (
            <ProspectActivityTimeline
              prospectId={prospectId!}
              initialActivities={details.activities}
              onAddActivity={() => setActivityOpen(true)}
              onRefresh={loadProspect}
              readOnly={false}
            />
          )}
        </div>
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
} */
/* 

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
  }; */

/* {isEdit && (
<ProspectStatusFlow
status={header.status}
onChange={(status) => void changeStatus(status)}
/>
)} */

/* <ProspectFormTabs activeTab={activeTab} onChange={setActiveTab} />
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
{activeTab === "attachments" && <ProspectAttachmentsTab />} */
