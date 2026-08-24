//  app/components/finance/journals/JournalForm.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";

import GLAccountLookupModal, {
  GLAccountLookupRecord,
} from "@/app/components/shared/modals/GLAccountLookupModal";

import CustomerLookupModal, {
  CustomerLookupItem,
} from "@/app/components/shared/modals/CustomerLookupModal";

import SupplierLookupModal, {
  SupplierLookupItem,
} from "../../shared/modals/SupplierLookupModal";

import AllocateJournalPaymentModal from "./modals/AllocateJournalPaymentModal";
import { useLoader } from "@/app/context/LoaderContext";
import { PostedTransactionsModal } from "./modals/PostedTransactionsModal";
import { JournalPayload2, JournalSource } from "@/types/journal";
import NumericTextInput from "@/components/ui/NumericTextInput";

type Currency = {
  id: string;
  code: string;
  name: string;
  exchange_rate: string | number;
  is_base: boolean;
};

export type LineAllocationItem = {
  invoice_ledger_id: string;
  amount: number;
};

type JournalLineRow = {
  posting_date: string;
  document_type: string;
  document_no: string;
  transaction_type: "gl_no" | "customer" | "supplier";
  account_id: string;
  party_id: string;
  currency_id: string;
  exchange_rate: number;
  debit: number;
  credit: number;
  description: string;
  balancing_account_id: string;
  display_code?: string;
  display_name?: string;
  balancing_display_name?: string;
  allocations?: LineAllocationItem[];
};

interface ApiJournalLine {
  posting_date: string;
  document_type: string;
  document_no: string;
  account_id: string;
  party_id: string;
  party_type: string;
  party_name: string;
  customer_id?: string | null;
  supplier_id?: string | null;
  currency_id?: string | null;
  exchange_rate?: string | number | null;
  debit: string | number;
  credit: string | number;
  description?: string | null;
  balancing_account_id?: string | null;
  reference_id?: string | null;
  reference_type?: string | null;
  account_code?: string;
  account_name?: string;
  customer_code?: string;
  customer_name?: string;
  supplier_code?: string;
  supplier_name?: string;
  balancing_account_code?: string;
  balancing_account_name?: string;
  allocations?: LineAllocationItem[];
}

interface ApiResponsePayload {
  journal: {
    entry_date?: string;
    reference?: string | null;
    description?: string | null;
    is_posted?: boolean;
    entry_no?: string;
  };
  lines?: ApiJournalLine[];
}

type Props = {
  slug?: string;
  journalId?: string;
  journalType: "customer" | "supplier" | "item" | "general";
  readOnly?: boolean;
  apiBase: string;
  redirectPath: string;
};

export default function JournalForm({
  journalId,
  journalType,
  readOnly = false,
  apiBase,
  redirectPath,
}: Props) {
  const router = useRouter();

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPosted, setIsPosted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showNavigateModal, setShowNavigateModal] = useState(false);

  const [isEditing, setIsEditing] = useState<boolean>(!journalId);

  const [originalMetadata, setOriginalMetadata] = useState<{
    entry_date: string;
    reference: string;
    description: string;
    entry_no: string;
  } | null>(null);
  const [originalLines, setOriginalLines] = useState<JournalLineRow[] | null>(
    null,
  );

  const { show, hide } = useLoader();

  const isGeneral = journalType === "general";
  const formDisabled = readOnly || isPosted || !isEditing;

  const [activeModal, setActiveModal] = useState<{
    index: number;
    type: "main_account" | "balancing_account";
    target: "gl" | "customer" | "supplier";
  } | null>(null);

  const [allocationModalIndex, setAllocationModalIndex] = useState<
    number | null
  >(null);

  const [metadata, setMetadata] = useState({
    entry_date: new Date().toISOString().split("T")[0],
    reference: "",
    description: "",
    entry_no: "",
  });

  const createInitialRow = (): JournalLineRow => {
    return {
      posting_date:
        metadata.entry_date || new Date().toISOString().split("T")[0],
      document_type: isGeneral ? "General Journal" : "Payment",
      document_no: "",
      transaction_type: isGeneral
        ? "gl_no"
        : (journalType as "customer" | "supplier"),
      account_id: "",
      party_id: "",
      currency_id: "",
      exchange_rate: 1.0,
      debit: 0,
      credit: 0,
      description: "",
      balancing_account_id: "",
      balancing_display_name: "",
      display_code: "",
      display_name: "",
      allocations: [],
    };
  };

  const [lines, setLines] = useState<JournalLineRow[]>([createInitialRow()]);

  const isDebitDisabled = (line: JournalLineRow) => {
    if (formDisabled) return true;
    if (journalType === "supplier") {
      return line.document_type === "Refund";
    }
    if (journalType === "customer") {
      return line.document_type === "Payment";
    }
    return false;
  };

  const isCreditDisabled = (line: JournalLineRow) => {
    if (formDisabled) return true;
    if (journalType === "supplier") {
      return line.document_type === "Payment";
    }
    if (journalType === "customer") {
      return line.document_type === "Refund";
    }
    return false;
  };

  const totalDebitConverted = lines.reduce((sum, line) => {
    const rate = Number(line.exchange_rate || 1.0);
    const lineDebit = Number(line.debit || 0);

    if (line.balancing_account_id && line.balancing_account_id.trim() !== "") {
      const balancingDebit = Number(line.credit || 0);
      const activeDebit = lineDebit > 0 ? lineDebit : balancingDebit;
      return sum + Number((activeDebit * rate).toFixed(2));
    }

    return sum + Number((lineDebit * rate).toFixed(2));
  }, 0);

  const totalCreditConverted = lines.reduce((sum, line) => {
    const rate = Number(line.exchange_rate || 1.0);
    const lineCredit = Number(line.credit || 0);

    if (line.balancing_account_id && line.balancing_account_id.trim() !== "") {
      const balancingCredit = Number(line.debit || 0);
      const activeCredit = lineCredit > 0 ? lineCredit : balancingCredit;
      return sum + Number((activeCredit * rate).toFixed(2));
    }

    return sum + Number((lineCredit * rate).toFixed(2));
  }, 0);

  const difference = Number(
    (totalDebitConverted - totalCreditConverted).toFixed(2),
  );

  const isBalanced = Math.abs(difference) < 0.01;

  useEffect(() => {
    const loadLookupsAndData = async () => {
      try {
        show("Fetching Record...");
        const curRes = await fetch(`/api/parties/currencies`);
        if (curRes.ok) setCurrencies((await curRes.json()) || []);

        if (journalId) {
          const res = await fetch(`${apiBase}/${journalId}`);
          const data: ApiResponsePayload = await res.json();

          setIsPosted(!!data.journal.is_posted);

          const loadedMeta = {
            entry_date: data.journal.entry_date?.split("T")[0] || "",
            reference: data.journal.reference || "",
            description: data.journal.description || "",
            entry_no: data.journal.entry_no || "",
          };

          setMetadata(loadedMeta);
          setOriginalMetadata(loadedMeta);

          if (data.lines && data.lines.length > 0) {
            const loadedLines: JournalLineRow[] = data.lines.map((l) => {
              const txType: "gl_no" | "customer" | "supplier" =
                (l.party_type === "customer" || l.customer_code
                  ? "customer"
                  : null) ||
                (l.party_type === "supplier" || l.supplier_code
                  ? "supplier"
                  : null) ||
                "gl_no";

              let dispCode = "";
              let dispName = "";

              if (txType === "customer") {
                dispCode = l.customer_code || "";
                dispName = l.party_name || l.customer_name || "";
              } else if (txType === "supplier") {
                dispCode = l.supplier_code || "";
                dispName = l.party_name || l.supplier_name || "";
              } else {
                dispCode = l.account_code || "";
                dispName = l.account_name || "";
              }

              let finalLineDate = new Date().toISOString().split("T")[0];
              const rawDateValue = l.posting_date || data.journal.entry_date;
              if (rawDateValue) {
                finalLineDate =
                  typeof rawDateValue === "string"
                    ? rawDateValue.split("T")[0]
                    : new Date(rawDateValue).toISOString().split("T")[0];
              }

              return {
                posting_date: finalLineDate,
                document_type:
                  l.document_type ||
                  (isGeneral ? "General Journal" : "Payment"),
                document_no: l.document_no,
                transaction_type: txType,
                account_id: l.account_id || "",
                party_id: l.party_id || l.supplier_id || l.customer_id || "",
                currency_id: l.currency_id || "",
                exchange_rate: Number(l.exchange_rate || 1.0),
                debit: Number(l.debit || 0),
                credit: Number(l.credit || 0),
                description: l.description || "",
                display_code: dispCode,
                display_name: dispName,

                balancing_account_id:
                  l.reference_id || l.balancing_account_id || "",

                balancing_display_name: l.balancing_account_name
                  ? `${l.balancing_account_code || ""} - ${l.balancing_account_name}`
                  : "",
                allocations: l.allocations || [],
              };
            });

            setLines(loadedLines);
            setOriginalLines(loadedLines);
          }
        }
      } catch (err) {
        console.error("Error loading journal configuration data:", err);
      } finally {
        hide();
      }
    };
    loadLookupsAndData();
  }, [journalId, apiBase, isGeneral]);

  const baseCurrencyObj = currencies.find((c) => c.is_base) || { code: "GBP" };
  const baseCurrencyCode = baseCurrencyObj.code;

  const handleLineChange = (
    index: number,
    field: keyof JournalLineRow,
    value: string | number | LineAllocationItem[],
  ) => {
    if (formDisabled) return;
    const updated = [...lines];

    if (field === "transaction_type") {
      updated[index].account_id = "";
      updated[index].party_id = "";
      updated[index].display_code = "";
      updated[index].display_name = "";
      updated[index].allocations = [];
    }

    if (field === "debit" && Number(value) > 0) {
      updated[index].credit = 0;
    } else if (field === "credit" && Number(value) > 0) {
      updated[index].debit = 0;
    }

    if (field === "currency_id") {
      if (value === "") {
        updated[index].exchange_rate = 1.0;
      } else {
        const selectedCurrency = currencies.find((c) => c.id === value);
        updated[index].exchange_rate = selectedCurrency
          ? Number(selectedCurrency.exchange_rate)
          : 1.0;
      }
    }

    updated[index] = { ...updated[index], [field]: value } as JournalLineRow;
    setLines(updated);
  };

  const fetchGLAccountDetails = async (accountId: string) => {
    if (!accountId) return null;

    try {
      const res = await fetch(`/api/finance/accounts/${accountId}`);
      if (!res.ok) return null;
      const data = await res.json();
      return {
        id: data.id,
        code: data.code,
        name: data.name,
        displayName: `${data.code} - ${data.name}`,
      };
    } catch (err) {
      console.error("Failed to fetch GL Account details:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleModalSelection = async (selectedRecord: {
    id: string;
    code?: string;
    name: string;
    currency_id?: string;
    gl_account_receivable?: string;
    gl_account_payable?: string;
  }) => {
    if (!activeModal) return;

    const { index, type, target } = activeModal;
    const updated = [...lines];
    const targetLine = { ...updated[index] };

    if (type === "main_account") {
      if (targetLine.transaction_type === "gl_no") {
        targetLine.account_id = selectedRecord.id;
        targetLine.party_id = "";
      } else {
        targetLine.account_id = "";
        targetLine.party_id = selectedRecord.id;
      }

      targetLine.display_code = selectedRecord.code || "";
      targetLine.display_name = selectedRecord.name;

      if (selectedRecord.currency_id && !targetLine.currency_id) {
        targetLine.currency_id = selectedRecord.currency_id;
        const matchedCurr = currencies.find(
          (c) => c.id === selectedRecord.currency_id,
        );
        if (matchedCurr) {
          targetLine.exchange_rate = Number(matchedCurr.exchange_rate);
        }
      }

      if (target === "customer") {
        targetLine.balancing_account_id =
          selectedRecord.gl_account_receivable || "";

        if (targetLine.balancing_account_id) {
          const glAccount = await fetchGLAccountDetails(
            targetLine.balancing_account_id,
          );
          if (glAccount) {
            targetLine.balancing_display_name = glAccount.displayName;
          }
        }
      } else if (target === "supplier") {
        targetLine.balancing_account_id =
          selectedRecord.gl_account_payable || "";

        if (targetLine.balancing_account_id) {
          const glAccount = await fetchGLAccountDetails(
            targetLine.balancing_account_id,
          );
          if (glAccount) {
            targetLine.balancing_display_name = glAccount.displayName;
          }
        }
      }
    } else if (type === "balancing_account") {
      if (target === "customer") {
        targetLine.balancing_account_id =
          selectedRecord.gl_account_receivable || "";
      } else if (target === "supplier") {
        targetLine.balancing_account_id =
          selectedRecord.gl_account_payable || "";
      } else {
        targetLine.balancing_account_id = selectedRecord.id;
      }

      targetLine.balancing_display_name = selectedRecord.code
        ? `${selectedRecord.code} - ${selectedRecord.name}`
        : selectedRecord.name;
    }

    updated[index] = targetLine;
    setLines(updated);
    setActiveModal(null);
  };

  const addLineRow = () => {
    if (formDisabled) return;
    setLines([...lines, createInitialRow()]);
  };

  const removeLineRow = (index: number) => {
    if (formDisabled || lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleCancelEdit = () => {
    if (originalMetadata) {
      setMetadata(originalMetadata);
    }
    if (originalLines) {
      setLines(originalLines);
    }
    setErrorMsg(null);
    setIsEditing(false);
  };

  // Callback function when allocations are applied from modal
  const handleApplyAllocations = (
    index: number,
    newAllocations: LineAllocationItem[],
  ) => {
    handleLineChange(index, "allocations", newAllocations);
  };

  const handlePersistAction = async (postToLedger: boolean = false) => {
    if (formDisabled) return;
    setErrorMsg(null);

    if (!metadata.entry_date) {
      setErrorMsg(
        "Journal entry header requires a valid Entry Date definition.",
      );
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.transaction_type === "gl_no" && !line.account_id) {
        setErrorMsg(
          `Line ${i + 1}: Missing explicit G/L Account binding target`,
        );
        return;
      }

      if (line.transaction_type !== "gl_no" && !line.party_id) {
        setErrorMsg(
          `Line ${i + 1}: Missing sub-ledger party profile reference link`,
        );
        return;
      }

      const lineAmount =
        Number(line.debit || 0) > 0
          ? Number(line.debit)
          : Number(line.credit || 0);

      if (lineAmount === 0) {
        setErrorMsg(
          `Line ${i + 1}: Entry legs require an amount value greater than 0 (Debit or Credit)`,
        );
        return;
      }

      if (Number(line.exchange_rate || 0) <= 0) {
        setErrorMsg(
          `Line ${i + 1}: Exchange conversion rate cannot be zero or a negative expression`,
        );
        return;
      }

      // Validate allocations against total line amount
      if (line.allocations && line.allocations.length > 0) {
        const totalAllocated = line.allocations.reduce(
          (sum, item) => sum + Number(item.amount || 0),
          0,
        );

        if (totalAllocated > lineAmount) {
          setErrorMsg(
            `Line ${i + 1}: Total allocated amount (${totalAllocated.toFixed(
              2,
            )}) exceeds the line total (${lineAmount.toFixed(2)}).`,
          );
          return;
        }
      }
    }

    if (postToLedger && !isBalanced) {
      setErrorMsg(
        `Posting blocked: Journal entries must be perfectly balanced. Discrepancy: ${difference.toFixed(2)}`,
      );
      return;
    }

    try {
      setLoading(true);
      show("Saving Record...");

      const payload: JournalPayload2 = {
        entry_date: metadata.entry_date,
        is_posted: postToLedger,
        source:
          journalType === "general"
            ? "GENERAL"
            : (journalType.toUpperCase() as JournalSource),
        lines: lines.map((line) => ({
          posting_date: line.posting_date,
          document_type: line.document_type,
          document_no: line.document_no,
          transaction_type: line.transaction_type,
          account_id: line.account_id,
          party_id: line.party_id,
          party_type:
            line.transaction_type !== "gl_no"
              ? line.transaction_type
              : undefined,
          currency_id: line.currency_id || undefined,
          exchange_rate: Number(line.exchange_rate || 1.0),
          debit: line.debit,
          credit: line.credit,
          currency_amount: Number(
            (
              (line.debit > 0 ? line.debit : line.credit) *
              Number(line.exchange_rate || 1.0)
            ).toFixed(2),
          ),
          description: line.description,
          balancing_account_id: line.balancing_account_id || undefined,
          allocations: line.allocations || [],
        })),
      };

      const method = journalId ? "PUT" : "POST";
      const url = journalId ? `${apiBase}/${journalId}` : apiBase;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(
          errData.error || "Failed to commit journal transaction layer.",
        );
      }

      const resData = await res.json();

      if (postToLedger) {
        // Posted: Navigate back to the main listing page
        router.push(redirectPath);
      } else {
        // Saved as draft: Update original state snapshots and switch to View Mode
        setOriginalMetadata(metadata);
        setOriginalLines(lines);
        setIsEditing(false);

        if (!journalId && resData?.id) {
          // If creating a new record, update the URL without triggering full reload
          router.replace(`${redirectPath}/${resData.id}`);
        } else {
          router.refresh();
        }
      }

      // router.push(redirectPath);
      // router.refresh();
      // setIsEditing(false);
    } catch (err) {
      if (err instanceof Error) setErrorMsg(err.message);
    } finally {
      hide();
      setLoading(false);
    }
  };

  const activeAllocationLine =
    allocationModalIndex !== null ? lines[allocationModalIndex] : null;

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-6">
      {errorMsg && (
        <div className="p-2 bg-red-200 text-red-800 rounded font-medium">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-6 bg-white p-3 rounded shadow-sm border border-zinc-200">
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-600">Journal No.</span>
          <input
            type="text"
            readOnly
            className="border bg-zinc-50 p-1 px-2 rounded w-32 font-bold tracking-wide outline-none text-zinc-700"
            value={metadata.entry_no || "DRAFT"}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-600 shrink-0">
            Header Desc.
          </span>
          <input
            type="text"
            disabled={formDisabled}
            placeholder="Global transaction remarks..."
            className="border p-1 px-2 rounded w-full text-zinc-700 outline-none bg-white"
            value={metadata.description}
            onChange={(e) =>
              setMetadata({ ...metadata, description: e.target.value })
            }
          />
        </div>
      </div>

      {/* MATRIX LAYOUT */}
      <div className="overflow-x-auto bg-white text-zinc-600 rounded border border-zinc-200 shadow-sm">
        <table className="w-full border-collapse table-fixed text-left min-w-[1250px]">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold select-none">
              <th className="p-2 w-28">Posting Date</th>
              <th className="p-2 w-32">Doc. Type</th>
              <th className="p-2 w-24">Doc. No.</th>
              <th className="p-2 w-32">Tx Type</th>
              <th className="p-2 w-72">Account Selection</th>
              <th className="p-2 w-20">Currency</th>
              <th className="p-2 w-24">Debit</th>
              <th className="p-2 w-24">Credit</th>
              <th className="p-2 w-20 text-center">Cnv. Rate</th>
              <th className="p-2 w-28">Converted</th>
              <th className="p-2 w-64">Balancing G/L Selector</th>
              <th className="p-2 w-24 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 font-medium text-zinc-600">
            {lines.map((line, index) => {
              const localAmount = line.debit > 0 ? line.debit : line.credit;
              const convertedValue = localAmount * line.exchange_rate;

              const debitDisabled = isDebitDisabled(line);
              const creditDisabled = isCreditDisabled(line);

              const isPartyLine =
                line.transaction_type === "supplier" ||
                line.transaction_type === "customer";

              const totalLineAllocated = (line.allocations || []).reduce(
                (s, a) => s + (a.amount || 0),
                0,
              );

              return (
                <tr
                  key={index}
                  className="hover:bg-zinc-200/50 transition-colors"
                >
                  <td className="p-1.5 min-w-[130px]">
                    <DatePicker
                      id={`posting-date-${index}`}
                      disabled={formDisabled}
                      value={
                        line.posting_date
                          ? new Date(line.posting_date)
                          : undefined
                      }
                      onChange={(selectedDate) => {
                        if (!selectedDate) return;
                        const year = selectedDate.getFullYear();
                        const month = String(
                          selectedDate.getMonth() + 1,
                        ).padStart(2, "0");
                        const day = String(selectedDate.getDate()).padStart(
                          2,
                          "0",
                        );
                        const localIsoString = `${year}-${month}-${day}`;

                        handleLineChange(index, "posting_date", localIsoString);
                      }}
                    />
                  </td>

                  <td className="p-1.5">
                    <select
                      disabled={formDisabled}
                      value={line.document_type || "Payment"}
                      onChange={(e) =>
                        handleLineChange(index, "document_type", e.target.value)
                      }
                      className="w-full border p-1 rounded bg-white text-zinc-700 disabled:bg-zinc-100 disabled:text-zinc-500"
                    >
                      {isGeneral ? (
                        <>
                          <option value="General Journal">
                            General Journal
                          </option>
                          <option value="Payment">Payment</option>
                          <option value="Refund">Refund</option>
                        </>
                      ) : (
                        <>
                          <option value="Payment">Payment</option>
                          <option value="Refund">Refund</option>
                        </>
                      )}
                    </select>
                  </td>

                  <td className="p-1.5">
                    <input
                      type="text"
                      disabled={formDisabled}
                      placeholder="REF"
                      value={line.document_no}
                      onChange={(e) =>
                        handleLineChange(index, "document_no", e.target.value)
                      }
                      className="w-full border bg-white p-1 rounded text-center capitalize font-mono disabled:bg-zinc-100 disabled:text-zinc-500"
                    />
                  </td>

                  <td className="p-1.5">
                    <select
                      disabled={formDisabled || journalType !== "general"}
                      value={line.transaction_type}
                      onChange={(e) =>
                        handleLineChange(
                          index,
                          "transaction_type",
                          e.target.value,
                        )
                      }
                      className="w-full border p-1 rounded bg-white text-zinc-700 font-semibold disabled:bg-zinc-100 disabled:text-zinc-500"
                    >
                      <option value="gl_no">G/L No.</option>
                      <option value="customer">Customer</option>
                      <option value="supplier">Supplier</option>
                    </select>
                  </td>

                  <td className="p-1.5">
                    <div className="flex gap-1">
                      <input
                        type="text"
                        readOnly
                        placeholder={`Select ${line.transaction_type}...`}
                        value={
                          line.display_code
                            ? `${line.display_code} - ${line.display_name}`
                            : ""
                        }
                        className="w-full border p-1 rounded bg-zinc-50 text-zinc-700 font-mono text-[11px] outline-none truncate"
                      />

                      <Button
                        type="button"
                        disabled={formDisabled}
                        onClick={() =>
                          setActiveModal({
                            index,
                            type: "main_account",
                            target:
                              line.transaction_type === "gl_no"
                                ? "gl"
                                : line.transaction_type,
                          })
                        }
                        className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                      >
                        <Icon icon="tabler:external-link" className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>

                  <td className="p-1.5">
                    <select
                      disabled={formDisabled}
                      value={line.currency_id}
                      onChange={(e) =>
                        handleLineChange(index, "currency_id", e.target.value)
                      }
                      className="w-full border p-1 rounded bg-white font-bold text-center"
                    >
                      <option value="">{baseCurrencyCode}</option>
                      {currencies
                        .filter((c) => !c.is_base)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code}
                          </option>
                        ))}
                    </select>
                  </td>

                  <td className="p-1.5">
                    {/* <input
                      type="number"
                      step="0.01"
                      disabled={debitDisabled}
                      value={line.debit || ""}
                      onChange={(e) =>
                        handleLineChange(
                          index,
                          "debit",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className={`w-full border p-1 rounded text-right font-mono ${
                        debitDisabled
                          ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                          : "bg-white"
                      }`}
                    /> */}
                    <NumericTextInput
                      value={Number(line.debit)}
                      allowDecimals
                      decimalScale={2}
                      disabled={debitDisabled}
                      onChange={(val) =>
                        handleLineChange(index, "debit", String(val))
                      }
                      className={`w-full border p-1 rounded text-right font-mono ${
                        debitDisabled
                          ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                          : "bg-white"
                      }`}
                    />
                  </td>
                  <td className="p-1.5">
                    {/* <input
                      type="number"
                      step="0.01"
                      disabled={creditDisabled}
                      value={line.credit || ""}
                      onChange={(e) =>
                        handleLineChange(
                          index,
                          "credit",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className={`w-full border p-1 rounded text-right font-mono ${
                        creditDisabled
                          ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                          : "bg-white"
                      }`}
                    /> */}

                    <NumericTextInput
                      value={Number(line.credit)}
                      allowDecimals
                      decimalScale={2}
                      disabled={creditDisabled}
                      onChange={(val) =>
                        handleLineChange(index, "credit", String(val))
                      }
                      className={`w-full border p-1 rounded text-right font-mono ${
                        creditDisabled
                          ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                          : "bg-white"
                      }`}
                    />
                  </td>

                  <td className="p-1.5">
                    {/* <input
                      type="number"
                      step="0.01"
                      disabled={!line.currency_id || formDisabled}
                      value={line.currency_id ? line.exchange_rate : 1}
                      onChange={(e) =>
                        handleLineChange(
                          index,
                          "exchange_rate",
                          parseFloat(e.target.value) || 1.0,
                        )
                      }
                      className="w-full border p-1 rounded text-center bg-zinc-50 font-mono"
                    /> */}

                    <NumericTextInput
                      value={Number(line.currency_id ? line.exchange_rate : 1)}
                      allowDecimals
                      decimalScale={2}
                      disabled={!line.currency_id || formDisabled}
                      onChange={(val) =>
                        handleLineChange(index, "exchange_rate", String(val))
                      }
                      className={`w-full border p-1 rounded text-right font-mono ${
                        creditDisabled
                          ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                          : "bg-white"
                      }`}
                    />
                  </td>

                  <td className="p-1.5 text-right font-mono bg-zinc-50/60 text-zinc-600 font-semibold pr-3">
                    {convertedValue > 0 ? convertedValue.toFixed(2) : "0.00"}
                  </td>

                  <td className="p-1.5">
                    <div className="flex gap-1">
                      <input
                        type="text"
                        readOnly
                        placeholder="None"
                        value={line.balancing_display_name || ""}
                        className="w-full border p-1 rounded bg-zinc-50 text-zinc-700 font-mono text-[11px] outline-none truncate"
                      />

                      <Button
                        type="button"
                        disabled={formDisabled}
                        onClick={() =>
                          setActiveModal({
                            index,
                            type: "balancing_account",
                            target: "gl",
                          })
                        }
                        className="px-2 bg-slate-100 hover:bg-slate-300 dark:bg-slate-800 border dark:border-slate-700 rounded text-slate-600"
                      >
                        <Icon icon="tabler:external-link" className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>

                  <td className="p-1.5 ">
                    <div className="flex flex-row gap-1">
                      {isPartyLine ? (
                        <Button
                          type="button"
                          title={
                            totalLineAllocated > 0
                              ? `$${totalLineAllocated.toFixed(2)}`
                              : "Allocate"
                          }
                          disabled={
                            formDisabled || !line.party_id || localAmount <= 0
                          }
                          onClick={() => setAllocationModalIndex(index)}
                          className={`flex items-center justify-center gap-1 py-1 px-2 border rounded font-semibold transition ${
                            totalLineAllocated > 0
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                              : "bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200"
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          <Icon icon="tabler:box-seam" className="w-4 h-4" />
                        </Button>
                      ) : (
                        <span className="text-zinc-300">-</span>
                      )}
                      <Button
                        type="button"
                        disabled={lines.length === 1 || formDisabled}
                        onClick={() => removeLineRow(index)}
                        className="text-red-600 hover:text-red-800 p-1 rounded font-medium bg-slate-100  dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
                      >
                        <Icon icon="lucide:x" className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 bg-white rounded border border-zinc-200">
        {!formDisabled && (
          <div className="flex justify-start">
            <Button
              type="button"
              // variant="outline"
              onClick={addLineRow}
              // className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              variant="add_line"
            >
              Add Line
            </Button>
          </div>
        )}
        <div className="flex justify-start"></div>

        <div className="flex items-center justify-end gap-6 font-mono text-zinc-600 bg-zinc-50 border p-2 px-4 rounded font-bold">
          <div>
            Total Converted Debit:{" "}
            <span className="text-zinc-800">
              {totalDebitConverted.toFixed(2)}
            </span>
          </div>
          <div>
            Total Converted Credit:{" "}
            <span className="text-zinc-800">
              {totalCreditConverted.toFixed(2)}
            </span>
          </div>
          <div className="border-l pl-6">
            Difference:{" "}
            <span className={isBalanced ? "text-emerald-600" : "text-red-500"}>
              {difference.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-end items-center gap-2 pt-5 border-t border-slate-100 dark:border-slate-800">
        {!readOnly && (
          <>
            {isPosted && (
              <Button
                type="button"
                onClick={() => setShowNavigateModal(true)}
                variant="add_line"
                // className="px-5 font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                Navigate
              </Button>
            )}
            {!isEditing ? (
              /* VIEW MODE BUTTONS */
              <>
                <Button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  disabled={isPosted}
                  variant="edit"
                >
                  Edit
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="px-5 font-semibold text-zinc-700 hover:bg-zinc-50 bg-white dark:bg-slate-800 dark:text-zinc-200"
                >
                  Close
                </Button>
              </>
            ) : (
              /* EDIT MODE BUTTONS */
              <>
                <Button
                  type="button"
                  disabled={
                    loading ||
                    (!isBalanced && lines.every((l) => !l.balancing_account_id))
                  }
                  onClick={() => handlePersistAction(true)}
                  variant="post"
                >
                  {loading ? "Posting..." : "Post Journal"}
                </Button>

                <Button
                  type="button"
                  onClick={() => handlePersistAction(false)}
                  disabled={loading}
                  variant="save"
                >
                  {loading ? "Saving..." : "Save"}
                </Button>

                <Button
                  type="button"
                  variant="cancel"
                  onClick={journalId ? handleCancelEdit : () => router.back()}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </>
            )}
          </>
        )}
      </div>

      {activeModal?.target === "gl" && (
        <GLAccountLookupModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSelect={(rec: GLAccountLookupRecord) =>
            handleModalSelection({
              id: rec.id,
              code: rec.code,
              name: rec.name,
            })
          }
        />
      )}

      {activeModal?.target === "customer" && (
        <CustomerLookupModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSelect={(rec: CustomerLookupItem) =>
            handleModalSelection({
              id: rec.id,
              code: rec.customer_code || "CUST",
              name: rec.name,
              currency_id: rec.currency_id,
              gl_account_receivable: rec.gl_account_receivable,
            })
          }
        />
      )}

      {activeModal?.target === "supplier" && (
        <SupplierLookupModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSelect={(rec: SupplierLookupItem) =>
            handleModalSelection({
              id: rec.id,
              code: rec.supplier_code || "SUPP",
              name: rec.name,
              currency_id: rec.currency_id,
              gl_account_payable: rec.gl_account_payable,
            })
          }
        />
      )}

      {/* ALLOCATION MODAL BINDING */}
      {activeAllocationLine && allocationModalIndex !== null && (
        <AllocateJournalPaymentModal
          isOpen={allocationModalIndex !== null}
          onClose={() => setAllocationModalIndex(null)}
          partyId={activeAllocationLine.party_id}
          partyType={
            activeAllocationLine.transaction_type as "supplier" | "customer"
          }
          documentType={activeAllocationLine.document_type}
          paymentAmount={
            activeAllocationLine.debit > 0
              ? activeAllocationLine.debit
              : activeAllocationLine.credit
          }
          currencyIsoCode={
            currencies.find((c) => c.id === activeAllocationLine.currency_id)
              ?.code || baseCurrencyCode
          }
          initialAllocations={activeAllocationLine.allocations || []}
          onApplyAllocations={(allocations) =>
            handleApplyAllocations(allocationModalIndex, allocations)
          }
        />
      )}

      {isPosted && journalId && (
        <PostedTransactionsModal
          isOpen={showNavigateModal}
          onClose={() => setShowNavigateModal(false)}
          journalId={journalId}
          journalNo={metadata.entry_no}
        />
      )}
    </div>
  );
}

// const sanitizedLines = lines.map((line) => {
//   const rate = Number(line.exchange_rate || 1.0);
//   const amt = line.debit > 0 ? line.debit : line.credit;
//   const convertedAmount = Number((amt * rate).toFixed(2));

//   return {
//     posting_date: line.posting_date,
//     document_type: line.document_type,
//     document_no: line.document_no,
//     account_id: line.account_id || null,
//     party_id: line.party_id || null,
//     party_type:
//       line.transaction_type === "gl_no" ? null : line.transaction_type,
//     currency_id: line.currency_id || null,
//     exchange_rate: rate,
//     debit: line.debit,
//     credit: line.credit,
//     currency_amount: convertedAmount,
//     description: line.description || metadata.description || "",
//     reference_id: line.balancing_account_id || null,
//     reference_type: line.balancing_account_id ? "G/L Account" : null,
//     allocations: line.allocations || [],
//   };
// });

// const payload = {
//   entry_date: metadata.entry_date,
//   reference: metadata.reference,
//   description: metadata.description,
//   lines: sanitizedLines,
//   is_posted: postToLedger,
// };

{
  /* 🌟 INLINE JOURNAL ALLOCATION MODAL */
}
{
  /* {allocationModalIndex !== null && activeAllocationLine && (
        <AllocateJournalPaymentModal
          isOpen={true}
          onClose={() => setAllocationModalIndex(null)}
          partyId={activeAllocationLine.party_id}
          partyType={journalType === "supplier" ? "supplier" : "customer"}
          documentType={activeAllocationLine.document_type}
          paymentAmount={
            activeAllocationLine.debit > 0
              ? activeAllocationLine.debit
              : activeAllocationLine.credit
          }
          initialAllocations={activeAllocationLine.allocations || []}
          onApplyAllocations={(allocations) => {
            handleLineChange(allocationModalIndex, "allocations", allocations);
          }}
        />
      )} */
}
{
  /* <div className="flex justify-end gap-2 pt-2">
        {!formDisabled && (
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={() => handlePersistAction(false)}
              className="px-5 font-semibold shadow-sm"
            >
              Save Draft
            </Button>
            <Button
              type="button"
              disabled={
                loading ||
                (!isBalanced && lines.every((l) => !l.balancing_account_id))
              }
              onClick={() => handlePersistAction(true)}
              className="px-5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm disabled:opacity-40"
            >
              {loading ? "Posting..." : "Post Journal"}
            </Button>
          </>
        )}

        {isPosted && (
          <Button
            type="button"
            onClick={() => setShowNavigateModal(true)}
            className="px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Navigate
          </Button>
        )}


      </div> */
}
