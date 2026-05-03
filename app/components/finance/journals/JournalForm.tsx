//  app/components/finance/journals/JournalForm.tsx

"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

type Party = {
  id: string;
  name: string;
};

type Account = {
  id: string;
  code: string;
  name: string;
};

type Props = {
  slug: string;

  journalId?: string;

  journalType: "customer" | "supplier" | "item" | "general";

  apiBase: string;

  redirectPath: string;
};

export default function JournalForm({
  slug,
  journalId,
  journalType,
  apiBase,
  redirectPath,
}: Props) {
  const router = useRouter();

  const [parties, setParties] = useState<Party[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    entry_date: "",
    party_id: "",
    account_id: "",
    amount: "",
    type: "PAYMENT",
    reference: "",
    description: "",
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        // const partyType = journalType === "customer" ? "customer" : "supplier";
        const partyType =
          journalType === "customer"
            ? "customer"
            : journalType === "supplier"
              ? "supplier"
              : null;

        // const partyRes = await fetch(`/api/parties?type=${partyType}`);
        let partyData = { data: [] };

        if (partyType) {
          const partyRes = await fetch(`/api/parties?type=${partyType}`);

          partyData = await partyRes.json();
        }

        const accountRes = await fetch(`/api/finance/accounts`);

        // const partyData = await partyRes.json();

        const accountData = await accountRes.json();

        setParties(partyData.data || []);
        setAccounts(accountData.data || []);

        if (journalId) {
          const res = await fetch(`${apiBase}/${journalId}`);

          const data = await res.json();

          const partyLine = data.lines.find(
            (line: { party_id?: string }) => line.party_id,
          );

          const offsetLine = data.lines.find(
            (line: { party_id?: string }) => !line.party_id,
          );

          setForm({
            entry_date: data.entry_date || "",
            party_id: partyLine?.party_id || "",
            account_id: offsetLine?.account_id || "",
            amount: String(partyLine?.debit || partyLine?.credit || ""),
            type: partyLine?.debit > 0 ? "PAYMENT" : "RECEIPT",
            reference: data.reference || "",
            description: data.description || "",
          });
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadData();
  }, [journalId, apiBase, journalType]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setLoading(true);

      const method = journalId ? "PUT" : "POST";

      const url = journalId ? `${apiBase}/${journalId}` : apiBase;

      const res = await fetch(url, {
        method,

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(form),
      });

      if (!res.ok) {
        throw new Error("Failed to save journal");
      }

      router.push(redirectPath);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 p-6 rounded shadow dark:shadow-white"
    >
      <div className="grid grid-cols-2 gap-4">
        {/* DATE */}
        <div>
          <label className="block text-sm mb-1">Entry Date *</label>

          <input
            type="date"
            required
            value={form.entry_date}
            onChange={(e) =>
              setForm({
                ...form,
                entry_date: e.target.value,
              })
            }
            className="border p-2 rounded w-full"
          />
        </div>

        {/* TYPE */}
        <div>
          <label className="block text-sm mb-1">Type *</label>

          <select
            value={form.type}
            onChange={(e) =>
              setForm({
                ...form,
                type: e.target.value,
              })
            }
            className="border p-2 rounded w-full"
          >
            <option value="PAYMENT">Payment</option>

            <option value="RECEIPT">Receipt</option>
          </select>
        </div>

        {/* PARTY */}

        {journalType !== "general" && (
          <div>
            <label className="block text-sm mb-1">
              {journalType === "customer"
                ? "Customer"
                : journalType === "supplier"
                  ? "Supplier"
                  : "Party"}
              {/* {journalType === "customer" ? "Customer" : "Supplier"} */}
            </label>

            <select
              required
              value={form.party_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  party_id: e.target.value,
                })
              }
              className="border p-2 rounded w-full"
            >
              <option value="">Select</option>

              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ACCOUNT */}
        <div>
          <label className="block text-sm mb-1">Offset Account</label>

          <select
            required
            value={form.account_id}
            onChange={(e) =>
              setForm({
                ...form,
                account_id: e.target.value,
              })
            }
            className="border p-2 rounded w-full"
          >
            <option value="">Select</option>

            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} - {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* AMOUNT */}
        <div>
          <label className="block text-sm mb-1">Amount *</label>

          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) =>
              setForm({
                ...form,
                amount: e.target.value,
              })
            }
            className="border p-2 rounded w-full"
          />
        </div>

        {/* REFERENCE */}
        <div>
          <label className="block text-sm mb-1">Reference</label>

          <input
            type="text"
            value={form.reference}
            onChange={(e) =>
              setForm({
                ...form,
                reference: e.target.value,
              })
            }
            className="border p-2 rounded w-full"
          />
        </div>

        {/* DESCRIPTION */}
        <div className="col-span-2">
          <label className="block text-sm mb-1">Description</label>

          <textarea
            value={form.description}
            onChange={(e) =>
              setForm({
                ...form,
                description: e.target.value,
              })
            }
            className="border p-2 rounded w-full"
            rows={4}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          {loading ? "Saving..." : "Save Journal"}
        </button>
      </div>
    </form>
  );
}
