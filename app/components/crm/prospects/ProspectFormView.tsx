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
  ProspectInterestedProduct,
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
import ItemLookupModal, {
  type ItemLookupRecord,
} from "@/app/components/shared/modals/ItemLookupModal";

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

  /* Price offers (Pricing tab) */
  const offersState = useProspectOffers(prospectId);
  const [addItemsRequested, setAddItemsRequested] = useState(false);

  /* Interested Products (Sales Information) — separate from pricing */
  const [interestedProducts, setInterestedProducts] = useState<
    ProspectInterestedProduct[]
  >([]);
  const [productPickerOpen, setProductPickerOpen] = useState(false);

  const addInterestedProducts = (items: ItemLookupRecord[]) => {
    setProductPickerOpen(false);
    setInterestedProducts((current) => {
      const existing = new Set(current.map((product) => product.item_id));
      const added = items
        .filter((item) => !existing.has(item.id))
        .map((item) => ({
          item_id: item.id,
          item_code: item.item_code || null,
          item_name: item.name,
        }));
      return [...current, ...added];
    });
  };

  const removeInterestedProduct = (itemId: string | null, index: number) => {
    setInterestedProducts((current) =>
      current.filter((product, i) =>
        itemId ? product.item_id !== itemId : i !== index,
      ),
    );
  };

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
    setProductPickerOpen(true);
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

      setInterestedProducts(result.interested_products ?? []);

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

        interested_products: interestedProducts
          .filter((product) => Boolean(product.item_id))
          .map((product) => ({ item_id: product.item_id as string })),
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
            vatBusinessGroupId={header.vat_business_group_id || null}
            slug={slug}
            canConvertToQuote={!isConverted}
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/*
         * Row 1: Basic Information sets the height; Locations fills the
         * same height (absolute on xl) and scrolls its rows.
         */}
        <div className="xl:col-span-5">
          <ProspectGeneralTab
            value={header}
            contacts={contacts}
            addresses={addresses}
            onChange={updateHeader}
            onContactChange={setContacts}
            onAddressChange={setAddresses}
            readOnly={readOnly}
          />
        </div>

        <div className="relative min-h-[260px] xl:col-span-7">
          <div className="h-full xl:absolute xl:inset-0">
            <ProspectAddressLocations
              addresses={addresses}
              onChange={setAddresses}
              readOnly={readOnly}
            />
          </div>
        </div>

        {/* Row 2: Sales Information | Activity / Notes / Pricing tabs */}
        <div className="self-start xl:col-span-5">
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
            productsEnabled
            onManageProducts={openProductPicker}
            onRemoveProduct={removeInterestedProduct}
            readOnly={readOnly}
          />
        </div>

        <div className="min-w-0 self-start xl:col-span-7">
          <ProspectWorkspaceTabs
            activeTab={activeWorkspaceTab}
            onChange={setActiveWorkspaceTab}
            attachmentCount={0}
          >
            {renderWorkspaceContent()}
          </ProspectWorkspaceTabs>
        </div>
      </div>

      {/* INTERESTED PRODUCTS PICKER */}
      {productPickerOpen && (
        <ItemLookupModal
          open={productPickerOpen}
          onClose={() => setProductPickerOpen(false)}
          multiple
          onSelect={(item) => addInterestedProducts([item])}
          onSelectMultiple={(items) => addInterestedProducts(items)}
        />
      )}

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
