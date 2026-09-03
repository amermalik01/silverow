// app/[slug]/finance/chart-of-accounts/[id]/ledger/page.tsx

import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { redirect } from "next/navigation";
import { format } from "date-fns";

export default async function SecureLedgerPage({ params }: { params: Promise<{ id: string; slug: string }> }) {
  const companyId = await getCompanyId();
  if (!companyId) redirect("/login");

  const { id, slug } = await params;
  const client = await pool.connect();

  try {
    const accountRes = await client.query(
      `SELECT name, code, account_type FROM chart_of_accounts WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );
    if (!accountRes.rows.length) return <div className="p-6 text-red-500 font-medium">Access Violation: Ledger Entry Out of Bounds</div>;

    const account = accountRes.rows[0];
    const ledgerLines = await client.query(
      `SELECT l.id, j.entry_date, j.reference, l.description, l.debit, l.credit
       FROM journal_entry_lines l
       JOIN journal_entries j ON j.id = l.journal_id
       WHERE l.account_id = $1 AND j.company_id = $2 AND j.is_posted = true
       ORDER BY j.entry_date ASC, l.created_at ASC`,
      [id, companyId]
    );

    let currentBalance = 0;
    const computedRows = ledgerLines.rows.map((row) => {
      const db = Number(row.debit);
      const cr = Number(row.credit);
      const change = ["ASSET", "EXPENSE"].includes(account.account_type) ? (db - cr) : (cr - db);
      currentBalance += change;
      return { ...row, db, cr, rollingBalance: currentBalance };
    });

    return (
      <div className="space-y-6 ">
        <div className="border-b pb-4">
          <h1 className="text-2xl font-bold tracking-tight">Ledger {account.code} — {account.name}</h1>
          <p className="text-xs text-gray-500 capitalize mt-1">Classification: {account.account_type}</p>
        </div>

        <div className="border rounded-xl bg-white dark:bg-slate-900 text-black dark:text-white overflow-hidden shadow-sm">
          <table className="w-full table-fixed text-xs">
            <thead className="bg-gray-50 border-b">
              <tr className="text-gray-600 font-medium">
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Reference</th>
                <th className="p-3 text-left">Description</th>
                <th className="p-3 text-right">Debit</th>
                <th className="p-3 text-right">Credit</th>
                <th className="p-3 text-right">Cumulative Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y font-mono">
              {computedRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 font-sans">No settled tracking operations posted here.</td>
                </tr>
              )}
              {computedRows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/70 transition">
                  <td className="p-3 whitespace-nowrap text-gray-600">{/* {new Date(row.entry_date).toLocaleDateString()} */} {format(row.entry_date, "dd/MM/yyyy")}</td>
                  <td className="p-3 font-sans font-medium">{row.reference}</td>
                  <td className="p-3 font-sans text-gray-600 max-w-xs truncate">{row.description}</td>
                  <td className="p-3 text-right text-emerald-600">{row.db > 0 ? row.db.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}</td>
                  <td className="p-3 text-right text-rose-600">{row.cr > 0 ? row.cr.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}</td>
                  <td className="p-3 text-right font-semibold text-gray-900">{row.rollingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  } finally {
    client.release();
  }
}
