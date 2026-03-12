// app/[slug]/finance/chart-of-accounts/[id]/ledger/page.js

import { pool } from "@/lib/db";
import { LedgerRow } from "@/types/finance";

export default async function LedgerPage(context: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await context.params;

  const client = await pool.connect();

  try {
    const account = await client.query(
      `
      SELECT name, code
      FROM chart_of_accounts
      WHERE id = $1
      `,
      [id],
    );

    const ledger = await client.query(
      `
      SELECT
        l.id,
        j.entry_date,
        j.reference,
        l.description,
        l.debit,
        l.credit
      FROM journal_entry_lines l
      JOIN journal_entries j
        ON j.id = l.journal_entry_id
      WHERE l.account_id = $1
      ORDER BY j.entry_date
      `,
      [id],
    );

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">
          Ledger {account.rows[0].code}
          {" - "}
          {account.rows[0].name}
        </h1>

        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Date</th>
              <th className="p-2">Reference</th>
              <th className="p-2">Description</th>
              <th className="p-2 text-right">Debit</th>
              <th className="p-2 text-right">Credit</th>
            </tr>
          </thead>

          <tbody>
            {ledger.rows.map((row: LedgerRow) => (
              <tr key={row.id} className="border-t">
                <td className="p-2">{row.entry_date}</td>

                <td className="p-2">{row.reference}</td>

                <td className="p-2">{row.description}</td>

                <td className="p-2 text-right">
                  {Number(row.debit).toFixed(2)}
                </td>

                <td className="p-2 text-right">
                  {Number(row.credit).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } finally {
    client.release();
  }
}
