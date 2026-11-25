// app/components/crm/prospects/components/ProspectPricingTab.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { addDays, format, parseISO, isValid } from "date-fns";

import NumericTextInput from "@/components/ui/NumericTextInput";
import ItemLookupModal, {
  type ItemLookupRecord,
} from "@/app/components/shared/modals/ItemLookupModal";

import type {
  ProspectOffer,
  ProspectOfferDiscountType,
  ProspectOfferStatus,
} from "@/types/prospect";
import type { ProspectOffersState } from "../hooks/useProspectOffers";
import { DatePicker } from "@/components/ui/date-picker";

type Props = {
  offersState: ProspectOffersState;
  /** Set by the parent to ask this tab to open the item picker. */
  addItemsRequested?: boolean;
  /** Called once the request above has been handled. */
  onAddItemsHandled?: () => void;
  /** View mode: pricing can be viewed but not changed. */
  readOnly?: boolean;
  /**
   * Posting group currently selected on the prospect form (live, may be
   * unsaved). VAT rates follow it, like customer -> sales order.
   */
  vatBusinessGroupId?: string | null;
  /** Used for the link to a converted sales quote. */
  slug?: string;
  /** Converting to a sales quote is allowed (prospect not converted). */
  canConvertToQuote?: boolean;
  /** Currency selected on the prospect (Sales Information). */
  prospectCurrency?: {
    id: string | null;
    code: string;
    exchange_rate: number;
  };
};

type VatOption = {
  id: string;
  code: string;
  vat_percent: number;
  vat_product_group_id?: string;
};

type DraftLine = {
  key: string;
  item_id: string;
  item_code: string | null;
  item_name: string;
  uom_name: string | null;
  description: string | null;
  quantity: number;
  unit_price: number;
  discount_type: ProspectOfferDiscountType;
  discount_value: number;
  vat_product_group_id: string | null;
  vat_rate: number;
};

type Draft = {
  offerId?: string;
  offer_date: string;
  valid_until: string;
  notes: string;
  lines: DraftLine[];
};

/* ============================================================
   CONSTANTS / HELPERS
============================================================ */

const OFFER_STATUSES: ProspectOfferStatus[] = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
];

const EDITABLE_STATUSES: ProspectOfferStatus[] = ["DRAFT", "SENT"];

const STATUS_BADGE: Record<ProspectOfferStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-sky-50 text-sky-700",
  ACCEPTED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-rose-50 text-rose-700",
  EXPIRED: "bg-amber-50 text-amber-700",
  CANCELLED: "bg-slate-100 text-slate-500 line-through",
};

const cellInputClass =
  "h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-right text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

const outlineButton =
  "flex h-9 items-center gap-1.5 rounded-lg border border-emerald-700 bg-white px-3 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50";

const solidButton =
  "flex h-9 items-center gap-1.5 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50";

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = parseISO(value);
  return isValid(date) ? format(date, "yyyy-MM-dd") : value.slice(0, 10);
}

function displayDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = parseISO(value);
  return isValid(date) ? format(date, "dd/MM/yyyy") : value;
}

function makeFormatter(currencyCode: string) {
  try {
    const formatter = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currencyCode,
      currencyDisplay: "narrowSymbol",
    });
    return (value: number) => formatter.format(value);
  } catch {
    return (value: number) => `${currencyCode} ${value.toFixed(2)}`;
  }
}

function formatQty(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function calculateLine(line: DraftLine) {
  const gross = round2(line.quantity * line.unit_price);
  const discount = round2(
    Math.min(
      gross,
      line.discount_type === "PERCENTAGE"
        ? (gross * line.discount_value) / 100
        : line.discount_value,
    ),
  );
  const net = round2(gross - discount);
  const vat = round2((net * line.vat_rate) / 100);
  return { gross, discount, net, vat };
}

function calculateTotals(lines: DraftLine[]) {
  return lines.reduce(
    (totals, line) => {
      const result = calculateLine(line);
      return {
        subtotal: round2(totals.subtotal + result.gross),
        discount: round2(totals.discount + result.discount),
        taxable: round2(totals.taxable + result.net),
        vat: round2(totals.vat + result.vat),
      };
    },
    { subtotal: 0, discount: 0, taxable: 0, vat: 0 },
  );
}

function offerToDraftLines(offer: ProspectOffer): DraftLine[] {
  return offer.lines.map((line) => ({
    key: line.id,
    item_id: line.item_id ?? "",
    item_code: line.item_code,
    item_name: line.item_name,
    uom_name: line.uom_name,
    description: line.description,
    quantity: Number(line.quantity),
    unit_price: Number(line.unit_price),
    discount_type: line.discount_type,
    discount_value: Number(line.discount_value),
    vat_product_group_id: line.vat_product_group_id,
    vat_rate: Number(line.vat_rate),
  }));
}

/** VAT label: "VAT (20%)" when all lines share one rate. */
function vatLabel(rates: number[]): string {
  const unique = [...new Set(rates)];
  return unique.length === 1 ? `VAT (${unique[0]}%)` : "VAT";
}

/* ============================================================
   COMPONENT
============================================================ */

export default function ProspectPricingTab({
  offersState,
  addItemsRequested = false,
  onAddItemsHandled,
  readOnly = false,
  prospectCurrency,
  vatBusinessGroupId: liveVatBusinessGroupId,
  slug,
  canConvertToQuote = true,
}: Props) {
  const {
    offers,
    defaults,
    primaryOffer,
    loading,
    error: loadError,
    saveOffer,
    setStatus,
    setPrimary,
    deleteOffer,
    convertToQuote,
  } = offersState;

  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const vatCache = useRef(new Map<string, number>());

  /* VAT rate options for the prospect's VAT business group (as in sales orders). */
  const [vatOptions, setVatOptions] = useState<VatOption[]>([]);
  const vatBusinessGroupId =
    liveVatBusinessGroupId !== undefined
      ? liveVatBusinessGroupId || null
      : (defaults?.vat_business_group_id ?? null);

  /* Convert-to-quote confirmation */
  const [quoteConfirmOpen, setQuoteConfirmOpen] = useState(false);
  const [convertingQuote, setConvertingQuote] = useState(false);

  useEffect(() => {
    if (!vatBusinessGroupId) {
      setVatOptions([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(
          `/api/lookups/vat-rates?vat_business_group_id=${encodeURIComponent(vatBusinessGroupId)}`,
        );
        const json = (await response.json()) as { data?: VatOption[] };
        if (!cancelled) setVatOptions(response.ok ? (json.data ?? []) : []);
      } catch {
        if (!cancelled) setVatOptions([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [vatBusinessGroupId]);

  const findVatOption = (groupId: string | null) =>
    groupId
      ? vatOptions.find(
          (option) =>
            option.vat_product_group_id === groupId || option.id === groupId,
        )
      : undefined;

  /*
   * Posting group changed (or its rates loaded): re-apply each draft line's
   * VAT rate from the new group's posting setup, keeping its VAT product group.
   */
  useEffect(() => {
    setDraft((current) => {
      if (!current) return current;

      const lines = current.lines.map((line) => {
        const option = vatBusinessGroupId
          ? vatOptions.find(
              (o) =>
                o.vat_product_group_id === line.vat_product_group_id ||
                o.id === line.vat_product_group_id,
            )
          : undefined;
        const rate = option ? Number(option.vat_percent) : 0;
        return rate === line.vat_rate ? line : { ...line, vat_rate: rate };
      });

      return lines.some((line, index) => line !== current.lines[index])
        ? { ...current, lines }
        : current;
    });
  }, [vatOptions, vatBusinessGroupId]);

  const vatRateLabel = (line: DraftLine) => {
    const option = findVatOption(line.vat_product_group_id);
    return option
      ? `${option.code} (${Number(option.vat_percent)}%)`
      : `${line.vat_rate}%`;
  };

  const changeLineVat = (key: string, optionId: string) => {
    const option = vatOptions.find((o) => o.id === optionId);
    setDraft((current) =>
      current
        ? {
            ...current,
            lines: current.lines.map((line) =>
              line.key === key
                ? {
                    ...line,
                    vat_product_group_id: option
                      ? (option.vat_product_group_id ?? option.id)
                      : null,
                    vat_rate: option ? Number(option.vat_percent) : 0,
                  }
                : line,
            ),
          }
        : current,
    );
  };

  /* Keep the selected offer valid as the list changes. */
  useEffect(() => {
    if (!offers.length) {
      setSelectedOfferId(null);
      return;
    }
    if (!selectedOfferId || !offers.some((o) => o.id === selectedOfferId)) {
      setSelectedOfferId(primaryOffer?.id ?? offers[0].id);
    }
  }, [offers, primaryOffer, selectedOfferId]);

  const offer = useMemo(
    () => offers.find((o) => o.id === selectedOfferId) ?? null,
    [offers, selectedOfferId],
  );

  const editing = draft !== null;
  const canEdit =
    !offer ||
    (EDITABLE_STATUSES.includes(offer.status) && !offer.sales_quote_id);

  /*
   * While editing (or before any offer exists) prices are in the prospect's
   * currency; a saved offer is shown in the currency it was saved in.
   */
  const currencyCode =
    (editing || !offer
      ? prospectCurrency?.code
      : offer.currency_code || prospectCurrency?.code) ||
    defaults?.currency_code ||
    "GBP";

  const currencyMismatch = Boolean(
    offer && prospectCurrency?.id && offer.currency_id !== prospectCurrency.id,
  );

  const money = useMemo(() => makeFormatter(currencyCode), [currencyCode]);

  /* ---------------- Edit lifecycle ---------------- */

  const startEdit = (target: ProspectOffer | null) => {
    const today = new Date();

    setDraft(
      target
        ? {
            offerId: target.id,
            offer_date: toDateInput(target.offer_date),
            valid_until: toDateInput(target.valid_until),
            notes: target.notes ?? "",
            lines: offerToDraftLines(target),
          }
        : {
            offer_date: format(today, "yyyy-MM-dd"),
            valid_until: format(addDays(today, 30), "yyyy-MM-dd"),
            notes: "",
            lines: [],
          },
    );
    setActionError("");
    setNotice("");
    setConfirmDelete(false);
  };

  const cancelEdit = () => {
    setDraft(null);
    setActionError("");
    setNotice("");
  };

  /* Form switched to view mode: discard an unsaved offer edit. */
  useEffect(() => {
    if (!readOnly) return;
    setDraft(null);
    setItemModalOpen(false);
    setConfirmDelete(false);
    setNotice("");
  }, [readOnly]);

  /*
   * Parent asked us to open the item picker (Interested Products "+ Add").
   * Waits for offers to load so we edit the existing offer, not a new one.
   */
  useEffect(() => {
    if (!addItemsRequested || loading) return;

    if (readOnly) {
      onAddItemsHandled?.();
      return;
    }

    if (!draft) {
      const target = offer ?? primaryOffer;
      const editable = target && EDITABLE_STATUSES.includes(target.status);
      startEdit(editable ? target : null);
    }
    setItemModalOpen(true);
    onAddItemsHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addItemsRequested, loading]);

  const updateLine = <K extends keyof DraftLine>(
    key: string,
    field: K,
    value: DraftLine[K],
  ) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            lines: current.lines.map((line) =>
              line.key === key ? { ...line, [field]: value } : line,
            ),
          }
        : current,
    );
  };

  const removeLine = (key: string) => {
    setDraft((current) =>
      current
        ? { ...current, lines: current.lines.filter((l) => l.key !== key) }
        : current,
    );
  };

  /* ---------------- Item selection ---------------- */

  const resolveVatRate = async (
    vatProductGroupId?: string,
  ): Promise<number> => {
    const businessGroupId = vatBusinessGroupId;
    if (!businessGroupId || !vatProductGroupId) return 0;

    const cached = vatCache.current.get(vatProductGroupId);
    if (cached !== undefined) return cached;

    try {
      const params = new URLSearchParams({
        vat_business_group_id: businessGroupId,
        vat_product_group_id: vatProductGroupId,
      });
      const response = await fetch(`/api/lookups/vat-posting-setup?${params}`);
      const result = (await response.json()) as {
        data: { vat_rate: number | string } | null;
      };
      const rate = Number(result.data?.vat_rate ?? 0);
      vatCache.current.set(vatProductGroupId, rate);
      return rate;
    } catch {
      return 0;
    }
  };

  const handleItemsSelected = async (items: ItemLookupRecord[]) => {
    setItemModalOpen(false);
    if (!items.length || !draft) return;

    const existing = new Set(draft.lines.map((line) => line.item_id));
    const fresh = items.filter((item) => !existing.has(item.id));
    const skipped = items.length - fresh.length;

    const newLines: DraftLine[] = await Promise.all(
      fresh.map(async (item) => ({
        key: `new-${item.id}`,
        item_id: item.id,
        item_code: item.item_code || null,
        item_name: item.name,
        uom_name: item.base_uom_name || null,
        description: null,
        quantity: 1,
        unit_price: Number(item.standard_sales_price ?? 0),
        discount_type: "PERCENTAGE" as const,
        discount_value: 0,
        vat_product_group_id: item.vat_product_group_id ?? null,
        vat_rate:
          findVatOption(item.vat_product_group_id ?? null)?.vat_percent !==
          undefined
            ? Number(
                findVatOption(item.vat_product_group_id ?? null)!.vat_percent,
              )
            : await resolveVatRate(item.vat_product_group_id),
      })),
    );

    setDraft((current) =>
      current
        ? { ...current, lines: [...current.lines, ...newLines] }
        : current,
    );

    setNotice(
      skipped
        ? `${skipped} item${skipped > 1 ? "s were" : " was"} already in the list and skipped — change the quantity instead.`
        : "",
    );
  };

  /* ---------------- Save / actions ---------------- */

  const handleSave = async () => {
    if (!draft) return;

    const currencyId =
      prospectCurrency?.id ?? offer?.currency_id ?? defaults?.currency_id;

    if (!draft.lines.length) {
      setActionError("Add at least one item.");
      return;
    }
    if (!currencyId) {
      setActionError(
        "No currency is set for this prospect and no base currency is configured for the company.",
      );
      return;
    }
    if (draft.lines.some((line) => !(line.quantity > 0))) {
      setActionError("Every item needs a quantity greater than zero.");
      return;
    }

    setBusy(true);
    setActionError("");

    try {
      const saved = await saveOffer(
        {
          offer_date: draft.offer_date,
          valid_until: draft.valid_until || null,
          currency_id: currencyId,
          exchange_rate: prospectCurrency?.id
            ? prospectCurrency.exchange_rate || 1
            : Number(offer?.exchange_rate ?? defaults?.exchange_rate ?? 1),
          is_primary: offer?.is_primary ?? false,
          notes: draft.notes.trim() || null,
          lines: draft.lines.map((line) => ({
            item_id: line.item_id,
            description: line.description,
            quantity: line.quantity,
            unit_price: line.unit_price,
            discount_type: line.discount_type,
            discount_value: line.discount_value,
            vat_product_group_id: line.vat_product_group_id,
          })),
          vat_business_group_id: vatBusinessGroupId,
        },
        draft.offerId,
      );

      if (saved) setSelectedOfferId(saved.id);
      setDraft(null);
      setNotice("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setActionError("");
    try {
      await action();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  /* ---------------- Derived view data ---------------- */

  const viewLines = useMemo(
    () => (offer ? offerToDraftLines(offer) : []),
    [offer],
  );

  const lines = draft ? draft.lines : viewLines;

  const totals = draft
    ? calculateTotals(draft.lines)
    : {
        subtotal: Number(offer?.subtotal ?? 0),
        discount: Number(offer?.discount_total ?? 0),
        taxable: Number(offer?.taxable_amount ?? 0),
        vat: Number(offer?.vat_total ?? 0),
      };

  const grandTotal = round2(totals.taxable + totals.vat);

  const showDiscountColumn =
    editing || lines.some((line) => line.discount_value > 0);

  const columnCount = showDiscountColumn ? 7 : 6;

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Icon icon="lucide:layers" className="text-2xl text-emerald-700" />
            Pricing
          </h3>

          {editing && !draft?.offerId && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              New offer
            </span>
          )}

          {offer && !(editing && !draft?.offerId) && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {offers.length > 1 && !editing ? (
                <select
                  value={offer.id}
                  onChange={(event) => setSelectedOfferId(event.target.value)}
                  className="h-7 rounded-md border border-slate-300 bg-white pl-2 pr-6 text-xs text-slate-700"
                >
                  {offers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.offer_no}
                      {/* {o.is_primary ? " · Primary" : ""} */}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-medium text-slate-600">
                  {offer.offer_no}
                </span>
              )}

              <span
                className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_BADGE[offer.status]}`}
              >
                {offer.status.charAt(0) + offer.status.slice(1).toLowerCase()}
              </span>

              {/* {offer.sales_quote_id && (
                <a
                  href={`/${slug ?? ""}/sales/quotes/${offer.sales_quote_id}`}
                  className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 font-semibold text-sky-700 hover:underline"
                  title="Open the sales quote created from this offer"
                >
                  <Icon icon="lucide:file-check-2" />
                  Quote {offer.sales_quote_no ?? ""}
                </a>
              )} */}

              {offer.is_primary && offers.length > 1 && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                  Primary
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">

          {!editing &&
            offer &&
            (offer.sales_quote_id ? (
              <a
                href={`/${slug ?? ""}/sales/quotes/${offer.sales_quote_id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 font-semibold text-sky-800 hover:bg-sky-100"
              >
                <Icon icon="lucide:file-check-2" />
                View Sales Quote {offer.sales_quote_no ?? ""}
                <Icon icon="lucide:external-link" className="h-3 w-3" />
              </a>
            ) : (
              canConvertToQuote &&
              !editing &&
              offer.lines.length > 0 &&
              !["CANCELLED", "REJECTED", "EXPIRED"].includes(offer.status) && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setQuoteConfirmOpen(true)}
                  className="h-9 inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-3 py-1.5 font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
                >
                  <Icon icon="lucide:file-output" />
                  Convert to Sales Quote
                </button>
              )
            ))}


          {editing ? (
            <>
              <button
                type="button"
                onClick={() => setItemModalOpen(true)}
                disabled={busy}
                className={outlineButton}
              >
                <Icon icon="lucide:plus" />
                Add item
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={busy}
                className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={busy}
                className={solidButton}
              >
                <Icon
                  icon={busy ? "lucide:loader-2" : "lucide:check"}
                  className={busy ? "animate-spin" : ""}
                />
                Save
              </button>
            </>
          ) : readOnly ? null : (
            <>
              {offer && (
                <button
                  type="button"
                  onClick={() => startEdit(offer)}
                  disabled={!canEdit || busy}
                  title={
                    canEdit
                      ? "Edit quote"
                      : `A ${offer.status.toLowerCase()} offer cannot be edited`
                  }
                  className={outlineButton}
                >
                  <Icon icon="lucide:pencil" />
                  Edit quote
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  startEdit(offer && canEdit ? offer : null);
                  setItemModalOpen(true);
                }}
                disabled={busy || loading}
                className={outlineButton}
              >
                <Icon icon="lucide:plus" />
                Add item
              </button>
            </>
          )}
          
        </div>
      </div>

      {(loadError || actionError) && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {actionError || loadError}
        </div>
      )}

      {currencyMismatch && !editing && offer && (
        <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
          This offer was saved in {offer.currency_code}. The prospect currency
          is now {prospectCurrency?.code} — editing the offer will save it in{" "}
          {prospectCurrency?.code}.
        </div>
      )}

      {notice && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {notice}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && !offer && !editing ? (
        <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center">
          <Icon
            icon="lucide:tag"
            className="mx-auto text-4xl text-emerald-600"
          />
          <p className="mt-2 font-semibold text-slate-800">
            No price offer yet
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {readOnly
              ? "Click Edit to add products and prices."
              : "Add the products this prospect is interested in to build a quote."}
          </p>
          {!readOnly && (
            <button
              type="button"
              onClick={() => {
                startEdit(null);
                setItemModalOpen(true);
              }}
              className={`${solidButton} mx-auto mt-4`}
            >
              <Icon icon="lucide:plus" />
              Add items
            </button>
          )}
        </div>
      ) : loading && !offer && !editing ? (
        <div className="py-12 text-center text-sm text-slate-500">
          Loading pricing...
        </div>
      ) : (
        <>
          {/* OFFER DATES (edit) */}
          {editing && draft && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-xs font-medium text-slate-600">
                Offer date
                <DatePicker
                  value={
                    draft.offer_date ? parseISO(draft.offer_date) : undefined
                  }
                  containerClassName="text-sm"
                  maxDate={new Date()}
                  onChange={(date) =>
                    setDraft({
                      ...draft,
                      offer_date: date ? format(date, "yyyy-MM-dd") : "",
                    })
                  }
                />
                {/* <input
                  type="date"
                  value={draft.offer_date}
                  onChange={(event) =>
                    setDraft({ ...draft, offer_date: event.target.value })
                  }
                  className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm text-slate-800"
                /> */}
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                Valid until
                <DatePicker
                  value={
                    draft.valid_until ? parseISO(draft.valid_until) : undefined
                  }
                  minDate={
                    draft.offer_date ? parseISO(draft.offer_date) : undefined
                  }
                  containerClassName="text-sm"
                  onChange={(date) =>
                    setDraft({
                      ...draft,
                      valid_until: date ? format(date, "yyyy-MM-dd") : "",
                    })
                  }
                />
                {/* <input
                  type="date"
                  value={draft.valid_until}
                  min={draft.offer_date}
                  onChange={(event) =>
                    setDraft({ ...draft, valid_until: event.target.value })
                  }
                  className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm text-slate-800"
                /> */}
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                Notes
                <input
                  value={draft.notes}
                  onChange={(event) =>
                    setDraft({ ...draft, notes: event.target.value })
                  }
                  placeholder="Optional"
                  className="h-7 w-full rounded-md border border-slate-300 px-2 text-sm text-slate-800"
                />
              </label>
            </div>
          )}

          {/* LINES TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-emerald-50 text-emerald-800">
                  <th className="px-4 py-2 text-left font-semibold">Product</th>
                  <th className="w-24 px-3 py-2 text-right font-semibold">
                    Qty
                  </th>
                  <th className="w-32 px-3 py-2 text-right font-semibold">
                    Unit price
                  </th>
                  {showDiscountColumn && (
                    <th className="w-36 px-3 py-2 text-right font-semibold">
                      Discount
                    </th>
                  )}
                  <th className="w-40 px-3 py-2 text-left font-semibold">
                    VAT Rate
                  </th>
                  <th className="w-32 px-3 py-2 text-right font-semibold">
                    Line total
                  </th>
                  <th className="w-28 px-4 py-2 text-right font-semibold">
                    VAT
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line) => {
                  const { net, vat } = calculateLine(line);

                  return (
                    <tr key={line.key} className="align-middle">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {editing && (
                            <button
                              type="button"
                              onClick={() => removeLine(line.key)}
                              title="Remove item"
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Icon icon="lucide:trash-2" />
                            </button>
                          )}
                          <div className="min-w-0">
                            <p className="text-slate-900">{line.item_name}</p>
                            {(line.item_code || line.uom_name) && (
                              <p className="text-[11px] text-slate-500">
                                {[line.item_code, line.uom_name]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-2 text-right tabular-nums">
                        {editing ? (
                          <NumericTextInput
                            value={line.quantity}
                            allowDecimals
                            decimalScale={2}
                            onChange={(value) =>
                              updateLine(line.key, "quantity", value)
                            }
                            className={cellInputClass}
                          />
                        ) : (
                          formatQty(line.quantity)
                        )}
                      </td>

                      <td className="px-3 py-2 text-right tabular-nums">
                        {editing ? (
                          <NumericTextInput
                            value={line.unit_price}
                            allowDecimals
                            decimalScale={2}
                            onChange={(value) =>
                              updateLine(line.key, "unit_price", value)
                            }
                            className={cellInputClass}
                          />
                        ) : (
                          money(line.unit_price)
                        )}
                      </td>

                      {showDiscountColumn && (
                        <td className="px-3 py-2 text-right tabular-nums">
                          {editing ? (
                            <div className="flex gap-1">
                              <NumericTextInput
                                value={line.discount_value}
                                allowDecimals
                                decimalScale={2}
                                onChange={(value) =>
                                  updateLine(line.key, "discount_value", value)
                                }
                                className={cellInputClass}
                              />
                              <select
                                value={line.discount_type}
                                onChange={(event) =>
                                  updateLine(
                                    line.key,
                                    "discount_type",
                                    event.target
                                      .value as ProspectOfferDiscountType,
                                  )
                                }
                                className="h-8 rounded-md border border-slate-300 bg-white px-1 text-xs"
                              >
                                <option value="PERCENTAGE">%</option>
                                <option value="AMOUNT">Amt</option>
                              </select>
                            </div>
                          ) : line.discount_value > 0 ? (
                            line.discount_type === "PERCENTAGE" ? (
                              `${line.discount_value}%`
                            ) : (
                              money(line.discount_value)
                            )
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      )}

                      <td className="px-3 py-2">
                        {editing ? (
                          <select
                            value={
                              findVatOption(line.vat_product_group_id)?.id ?? ""
                            }
                            onChange={(event) =>
                              changeLineVat(line.key, event.target.value)
                            }
                            disabled={!vatBusinessGroupId}
                            title={
                              vatBusinessGroupId
                                ? undefined
                                : "Set a VAT business posting group on the prospect first"
                            }
                            className="h-8 w-full rounded-md border border-slate-300 bg-white px-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <option value="">0% (Exempt/Zero)</option>
                            {vatOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.code} ({Number(option.vat_percent)}%)
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-slate-700">
                            {vatRateLabel(line)}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-2 text-right font-medium tabular-nums text-slate-900">
                        {money(net)}
                      </td>

                      <td className="px-4 py-2 text-right tabular-nums text-slate-700">
                        {money(vat)}
                      </td>
                    </tr>
                  );
                })}

                {lines.length === 0 && (
                  <tr>
                    <td
                      colSpan={columnCount}
                      className="px-4 py-8 text-center text-sm text-slate-500"
                    >
                      No items yet — use{" "}
                      <span className="font-medium">Add item</span> to pick
                      products.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* TOTALS */}
          {lines.length > 0 && (
            <div className="flex justify-end border-t border-slate-200 pt-3">
              <dl className="grid w-full max-w-sm grid-cols-[1fr_auto] gap-x-8 gap-y-1.5 text-sm">
                <dt className="text-right text-slate-700">Subtotal</dt>
                <dd className="text-right tabular-nums">
                  {money(totals.subtotal)}
                </dd>

                {totals.discount > 0 && (
                  <>
                    <dt className="text-right text-slate-700">Discount</dt>
                    <dd className="text-right tabular-nums">
                      −{money(totals.discount)}
                    </dd>
                  </>
                )}

                <dt className="text-right text-slate-700">Total ex VAT</dt>
                <dd className="text-right tabular-nums">
                  {money(totals.taxable)}
                </dd>

                <dt className="text-right text-slate-700">
                  {vatLabel(lines.map((line) => line.vat_rate))}
                </dt>
                <dd className="text-right tabular-nums">{money(totals.vat)}</dd>

                <dt className="pt-1 text-right text-base font-bold text-emerald-700">
                  Total incl VAT
                </dt>
                <dd className="pt-1 text-right text-lg font-bold tabular-nums text-emerald-700">
                  {money(grandTotal)}
                </dd>
              </dl>
            </div>
          )}

          {editing && !vatBusinessGroupId && (
            <p className="text-xs text-amber-700">
              No VAT business posting group is set on this prospect, so VAT is
              calculated as 0%.
            </p>
          )}

          {/* OFFER FOOTER (view) */}
          {!editing && offer && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-600">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span>Offer date: {displayDate(offer.offer_date)}</span>
                <span>Valid until: {displayDate(offer.valid_until)}</span>
                {offer.notes && <span>Notes: {offer.notes}</span>}
              </div>

              {!readOnly && (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1">
                    Status
                    <select
                      value={offer.status}
                      disabled={busy}
                      onChange={(event) =>
                        void runAction(() =>
                          setStatus(
                            offer.id,
                            event.target.value as ProspectOfferStatus,
                          ),
                        )
                      }
                      className="h-7 rounded-md border border-slate-300 bg-white px-1.5 text-xs"
                    >
                      {OFFER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status.charAt(0) + status.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </label>

                  {!offer.is_primary && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void runAction(() => setPrimary(offer.id))}
                      className="rounded-md px-2 py-1 font-medium text-emerald-700 hover:bg-emerald-50"
                    >
                      Set as primary
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => startEdit(null)}
                    className="rounded-md px-2 py-1 font-medium text-emerald-700 hover:bg-emerald-50"
                  >
                    + New offer
                  </button>

                  {offer.status === "DRAFT" &&
                    (confirmDelete ? (
                      <span className="flex items-center gap-1">
                        Delete offer?
                        <button
                          type="button"
                          onClick={() =>
                            void runAction(() => deleteOffer(offer.id))
                          }
                          className="rounded px-1.5 py-0.5 font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          className="rounded px-1.5 py-0.5 hover:bg-slate-100"
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmDelete(true)}
                        className="rounded-md px-2 py-1 font-medium text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {quoteConfirmOpen && offer && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4 backdrop-blur-xs"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !convertingQuote) {
              setQuoteConfirmOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start gap-3 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Icon icon="lucide:file-output" className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Convert to a sales quote?
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  A draft sales quote will be created from offer{" "}
                  <span className="font-semibold">{offer.offer_no}</span> (
                  {offer.lines.length} item{offer.lines.length === 1 ? "" : "s"}
                  , {money(Number(offer.grand_total))} incl. VAT). It will
                  appear in the Sales Quotes module and this offer will be
                  locked.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
              <button
                type="button"
                disabled={convertingQuote}
                onClick={() => setQuoteConfirmOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={convertingQuote}
                onClick={async () => {
                  setConvertingQuote(true);
                  setActionError("");
                  try {
                    const created = await convertToQuote(offer.id);
                    setNotice(`Sales quote ${created.quoteNo} created.`);
                    setQuoteConfirmOpen(false);
                  } catch (err) {
                    setActionError(
                      err instanceof Error
                        ? err.message
                        : "Unable to convert to a sales quote.",
                    );
                    setQuoteConfirmOpen(false);
                  } finally {
                    setConvertingQuote(false);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
              >
                {convertingQuote && (
                  <Icon
                    icon="lucide:loader-2"
                    className="h-4 w-4 animate-spin"
                  />
                )}
                {convertingQuote ? "Converting..." : "Convert"}
              </button>
            </div>
          </div>
        </div>
      )}

      {itemModalOpen && (
        <ItemLookupModal
          open={itemModalOpen}
          onClose={() => setItemModalOpen(false)}
          multiple
          onSelect={(item) => void handleItemsSelected([item])}
          onSelectMultiple={(items) => void handleItemsSelected(items)}
        />
      )}
    </div>
  );
}
