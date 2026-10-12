// app/components/finance/journals/item-journal/hooks/useJournalPersistence.ts

"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import type {
  ApiResponse,
  ItemJournalLineRow,
  JournalMetadata,
} from "../types";

import { calculateAmount, getAllocationTotal, getStockStatus } from "../utils";

import type { ItemJournalAllocationRecord } from "../types";

interface UseJournalPersistenceProps {
  journalId?: string;
  apiBase: string;
  redirectPath: string;
  readOnly: boolean;
  loading: boolean;
  setLoading: (value: boolean) => void;
  setErrorMsg: (value: string | null) => void;
  setIsPosted: (value: boolean) => void;
  setIsEditing: (value: boolean) => void;
  setCurrentJournalId: (value: string | null) => void;
  metadata: JournalMetadata;
  setMetadata: React.Dispatch<React.SetStateAction<JournalMetadata>>;
  lines: ItemJournalLineRow[];
  setLines: React.Dispatch<React.SetStateAction<ItemJournalLineRow[]>>;
  getApiMessage: (response: Response, fallback: string) => Promise<string>;
  normalizeAllocation: (
    allocation: Partial<ItemJournalAllocationRecord>,
    locationId?: string,
    locationName?: string,
  ) => ItemJournalAllocationRecord;
  show: (message: string) => void;
  hide: () => void;
}

export function useJournalPersistence({
  journalId,
  apiBase,
  redirectPath,
  readOnly,
  loading,
  setLoading,
  setErrorMsg,
  setIsPosted,
  setIsEditing,
  setCurrentJournalId,
  metadata,
  setMetadata,
  lines,
  setLines,
  getApiMessage,
  normalizeAllocation,
  show,
  hide,
}: UseJournalPersistenceProps) {
  const router = useRouter();

  const buildApiPayload = useCallback(
    (postToLedger: boolean) => ({
      entry_no: metadata.entry_no || undefined,
      entry_date: metadata.entry_date,
      is_posted: false,
      source: "ITEM",
      post_to_ledger: postToLedger,
      lines: lines.map((line) => ({
        posting_date: line.posting_date || metadata.entry_date,
        transaction_type: line.transaction_type,
        item_id: line.item_id,
        item_no: line.item_no,
        item_description: line.item_description,
        warehouse_id: line.warehouse_id,
        warehouse_code: line.warehouse_code,
        warehouse_name: line.warehouse_name,
        location_id: line.location_id,
        location_name: line.location_name,
        quantity: Number(line.quantity || 0),
        uom: line.uom,
        cost_per_unit: Number(line.cost_per_unit || 0),
        amount: calculateAmount(
          Number(line.quantity || 0),
          Number(line.cost_per_unit || 0),
        ),
        balancing_account_id: line.balancing_account_id,
        balancing_display_name: line.balancing_display_name,
        allocations: line.allocations.map((allocation) =>
          normalizeAllocation(allocation, line.location_id, line.location_name),
        ),
      })),
    }),
    [metadata, lines, normalizeAllocation],
  );

  const validateBeforeSave = useCallback(
    (postToLedger: boolean): string | null => {
      if (!metadata.entry_date) return "Journal date is required.";
      if (!lines.length) return "At least one journal line is required.";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const n = i + 1;

        if (!line.item_id) return `Line ${n}: Item is required.`;
        if (!line.warehouse_id) return `Line ${n}: Warehouse is required.`;
        if (!line.location_id) return `Line ${n}: Location is required.`;

        const quantity = Number(line.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          return `Line ${n}: Quantity must be greater than zero.`;
        }

        const cost = Number(line.cost_per_unit);
        if (!Number.isFinite(cost) || cost < 0) {
          return `Line ${n}: Cost per unit cannot be negative.`;
        }

        if (!line.balancing_account_id) {
          return `Line ${n}: Balancing G/L account is required.`;
        }

        if (!postToLedger) continue;

        const allocated = getAllocationTotal(line.allocations);

        if (Math.abs(allocated - quantity) > 0.000001) {
          return `Line ${n}: Stock allocation must equal the journal quantity before posting.`;
        }

        for (let j = 0; j < line.allocations.length; j++) {
          const allocation = line.allocations[j];
          const a = j + 1;

          if (!allocation.location_id) {
            return `Line ${n}: Allocation ${a} is missing a location.`;
          }

          if (Number(allocation.quantity) <= 0) {
            return `Line ${n}: Allocation ${a} quantity must be greater than zero.`;
          }

          if (
            line.transaction_type === "Positive Entry" &&
            !allocation.sequence_no
          ) {
            return `Line ${n}: Allocation ${a} requires a stock sequence.`;
          }

          if (
            allocation.available_quantity !== undefined &&
            Number(allocation.quantity) >
              Number(allocation.available_quantity) + 0.000001
          ) {
            return `Line ${n}: Allocation ${a} exceeds available stock.`;
          }
        }
      }

      return null;
    },
    [metadata.entry_date, lines],
  );

  const saveDraft = useCallback(async (): Promise<boolean> => {
    if (loading || readOnly) return false;

    const validationError = validateBeforeSave(false);
    if (validationError) {
      setErrorMsg(validationError);
      toast.error(validationError);
      return false;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      show("Saving Draft...");

      const response = await fetch(
        journalId ? `${apiBase}/${journalId}` : apiBase,
        {
          method: journalId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildApiPayload(false)),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | (ApiResponse & Record<string, unknown>)
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.message || payload?.error || "Failed to save item journal.",
        );
      }

      const saved = (payload?.journal ?? payload?.data ?? payload) as Record<
        string,
        unknown
      > | null;

      const id = saved?.id ? String(saved.id) : journalId || null;
      if (id) setCurrentJournalId(id);

      const entryNo = saved?.entry_no;
      if (entryNo) {
        setMetadata((previous) => ({
          ...previous,
          entry_no: String(entryNo),
        }));
      }

      toast.success("Item journal saved successfully.");
      router.push(redirectPath);
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save item journal.";
      setErrorMsg(message);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
      hide();
    }
  }, [
    loading,
    readOnly,
    validateBeforeSave,
    setErrorMsg,
    setLoading,
    show,
    hide,
    journalId,
    apiBase,
    buildApiPayload,
    setCurrentJournalId,
    setMetadata,
    router,
    redirectPath,
  ]);

  const postJournal = useCallback(async (): Promise<boolean> => {
    if (loading || readOnly) return false;

    const validationError = validateBeforeSave(true);
    if (validationError) {
      setErrorMsg(validationError);
      toast.error(validationError);
      return false;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      show("Saving Journal...");

      const saveResponse = await fetch(
        journalId ? `${apiBase}/${journalId}` : apiBase,
        {
          method: journalId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildApiPayload(true)),
        },
      );

      const savePayload = (await saveResponse.json().catch(() => null)) as
        | (ApiResponse & Record<string, unknown>)
        | null;

      if (!saveResponse.ok) {
        throw new Error(
          savePayload?.message ||
            savePayload?.error ||
            "Failed to save item journal before posting.",
        );
      }

      const saved = (savePayload?.journal ??
        savePayload?.data ??
        savePayload) as Record<string, unknown> | null;

      const id = journalId || (saved?.id ? String(saved.id) : "");
      if (!id) throw new Error("No journal ID was returned after saving.");

      setCurrentJournalId(id);
      show("Posting Journal...");

      const postResponse = await fetch(`${apiBase}/${id}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const postPayload = (await postResponse
        .json()
        .catch(() => null)) as ApiResponse | null;

      if (!postResponse.ok) {
        throw new Error(
          postPayload?.message ||
            postPayload?.error ||
            "Failed to post journal.",
        );
      }

      setIsPosted(true);
      setIsEditing(false);

      setLines((previous) =>
        previous.map((line) => {
          const status = getStockStatus(line.quantity, line.allocations);
          return {
            ...line,
            initialAllocations: line.allocations.map((a) => ({ ...a })),
            stock_status: status,
            is_allocated: status === "allocated",
          };
        }),
      );

      toast.success("Item journal posted successfully.");
      router.push(redirectPath);
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to post item journal.";
      setErrorMsg(message);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
      hide();
    }
  }, [
    loading,
    readOnly,
    validateBeforeSave,
    setErrorMsg,
    setLoading,
    show,
    hide,
    journalId,
    apiBase,
    buildApiPayload,
    setCurrentJournalId,
    setIsPosted,
    setIsEditing,
    setLines,
    router,
    redirectPath,
  ]);

  const handleSaveOrPost = useCallback(
    (postToLedger = false) => (postToLedger ? postJournal() : saveDraft()),
    [postJournal, saveDraft],
  );

  return {
    buildApiPayload,
    validateBeforeSave,
    saveDraft,
    postJournal,
    handleSaveOrPost,
  };
}
