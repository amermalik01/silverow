// app/components/finance/JournalEntryForm.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { JournalLine } from "@/types/finance";

type Props = {
  slug: string;
  journalId?: string;
};

type Account = {
  id: string;
  code: string;
  name: string;
  vat_rate?: number;
};

type Line = {
  account_id: string;
  debit: string;
  credit: string;
  description: string;
};

export default function JournalEntryForm({
  slug,
  journalId,
}: {
  slug: string;
  journalId?: string;
}) {
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [lines, setLines] = useState<Line[]>([
    { account_id: "", debit: "", credit: "", description: "" },
  ]);

  const [header, setHeader] = useState({
    entry_date: "",
    reference: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);

  /* ---------------- LOAD ACCOUNTS ---------------- */

  useEffect(() => {
    const loadAccounts = fetch("/api/finance/accounts")
      .then((res) => res.json())
      .then(setAccounts);

    if (journalId) {
      const loadJournal = fetch(`/api/finance/journal/${journalId}`)
        .then((res) => res.json())
        .then((data) => {
          setHeader({
            entry_date: data.entry_date,
            reference: data.reference || "",
            description: data.description || "",
          });

          setLines(
            data.lines.map((l: JournalLine) => ({
              account_id: l.account_id,
              debit: l.debit ? String(l.debit) : "",
              credit: l.credit ? String(l.credit) : "",
              description: l.description || "",
            })),
          );
        });

      Promise.all([loadAccounts, loadJournal]);
    } else {
      loadAccounts;
    }
  }, [journalId]);

  /* ---------------- LINE HANDLING ---------------- */

  const updateLine = (index: number, field: keyof Line, value: string) => {
    const updated = [...lines];
    updated[index][field] = value;

    if (field === "account_id") {
      const acc = accounts.find((a) => a.id === value);

      if (acc?.vat_rate) {
        const amount = Number(updated[index].debit || updated[index].credit);

        if (amount > 0) {
          const vatAmount = (amount * acc.vat_rate) / 100;

          // add VAT line
          updated.push({
            account_id: "VAT_ACCOUNT_ID", // configure
            debit: updated[index].debit ? String(vatAmount) : "",
            credit: updated[index].credit ? String(vatAmount) : "",
            description: "VAT Auto",
          });
        }
      }
    }

    setLines(updated);
  };

  //   const updateLine = (index: number, field: keyof Line, value: string) => {
  //     const updated = [...lines];

  //     updated[index][field] = value;

  //     // 🔥 enforce single side entry
  //     if (field === "debit" && value) {
  //       updated[index].credit = "";
  //     }

  //     if (field === "credit" && value) {
  //       updated[index].debit = "";
  //     }

  //     setLines(updated);
  //   };

  const addLine = () => {
    setLines([
      ...lines,
      { account_id: "", debit: "", credit: "", description: "" },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length === 1) return;

    setLines(lines.filter((_, i) => i !== index));
  };

  /* ---------------- TOTALS ---------------- */

  const totalDebit = lines.reduce((sum, l) => sum + Number(l.debit || 0), 0);

  const totalCredit = lines.reduce((sum, l) => sum + Number(l.credit || 0), 0);

  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  /* ---------------- SUBMIT ---------------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isBalanced) {
      alert("Journal is not balanced");
      return;
    }

    setLoading(true);

    try {
      //   const res = await fetch("/api/finance/journal", {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //     },
      //     body: JSON.stringify({
      //       ...header,
      //       lines: lines.map((l) => ({
      //         account_id: l.account_id,
      //         debit: Number(l.debit || 0),
      //         credit: Number(l.credit || 0),
      //         description: l.description,
      //       })),
      //     }),
      //   });

      const url = journalId
        ? `/api/finance/journal/${journalId}`
        : `/api/finance/journal`;

      const method = journalId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...header,
          lines: lines.map((l) => ({
            account_id: l.account_id,
            debit: Number(l.debit || 0),
            credit: Number(l.credit || 0),
            description: l.description,
          })),
        }),
      });

      if (res.ok) {
        router.push(`/${slug}/finance/general-journal`);
      } else {
        alert("Failed to save");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving journal");
    }

    setLoading(false);
  };

  /* ---------------- UI ---------------- */

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 rounded shadow dark:shadow-white space-y-6"
    >
      {/* HEADER */}

      <div className="grid grid-cols-3 gap-4">
        <input
          type="date"
          value={header.entry_date}
          onChange={(e) => setHeader({ ...header, entry_date: e.target.value })}
          className="border p-2 rounded"
          required
        />

        <input
          placeholder="Reference"
          value={header.reference}
          onChange={(e) => setHeader({ ...header, reference: e.target.value })}
          className="border p-2 rounded"
        />

        <input
          placeholder="Description"
          value={header.description}
          onChange={(e) =>
            setHeader({ ...header, description: e.target.value })
          }
          className="border p-2 rounded"
        />
      </div>

      {/* LINES */}

      <table className="w-full border text-xs">
        <thead>
          <tr>
            <th className="p-2">Account</th>
            <th className="p-2">Debit</th>
            <th className="p-2">Credit</th>
            <th className="p-2">Description</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {lines.map((line, index) => (
            <tr key={index} className="border-t">
              {/* Account */}
              <td className="p-2">
                <select
                  value={line.account_id}
                  onChange={(e) =>
                    updateLine(index, "account_id", e.target.value)
                  }
                  className="border p-2 w-full"
                  required
                >
                  <option value="">Select</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>
              </td>

              {/* Debit */}
              <td className="p-2">
                <input
                  type="number"
                  value={line.debit}
                  onChange={(e) => updateLine(index, "debit", e.target.value)}
                  className="border p-2 w-full"
                />
              </td>

              {/* Credit */}
              <td className="p-2">
                <input
                  type="number"
                  value={line.credit}
                  onChange={(e) => updateLine(index, "credit", e.target.value)}
                  className="border p-2 w-full"
                />
              </td>

              {/* Description */}
              <td className="p-2">
                <input
                  value={line.description}
                  onChange={(e) =>
                    updateLine(index, "description", e.target.value)
                  }
                  className="border p-2 w-full"
                />
              </td>

              {/* Remove */}
              <td className="p-2 text-center">
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  className="text-red-500"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ADD LINE */}

      <button
        type="button"
        onClick={addLine}
        className="bg-gray-200 px-3 py-1 rounded"
      >
        + Add Line
      </button>

      {/* TOTALS */}

      <div className="flex justify-end gap-6 text-xs font-semibold">
        <div>Debit: {totalDebit.toFixed(2)}</div>
        <div>Credit: {totalCredit.toFixed(2)}</div>
      </div>

      {/* VALIDATION */}

      {!isBalanced && (
        <p className="text-red-600 text-xs">Journal must be balanced</p>
      )}

      {/* SUBMIT */}

      <button
        type="submit"
        disabled={!isBalanced || loading}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
      >
        {loading ? "Saving..." : "Save Journal"}
      </button>
    </form>
  );
}
