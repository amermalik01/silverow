// app/[slug]/finance/chart-of-accounts/[id]/edit/page.tsx

import EditAccountForm from "@/app/components/finance/EditAccountForm";

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Finance / Chart of Accounts / Edit</h1>

      <EditAccountForm slug={slug} id={id} />
    </div>
  );
}

/* import EditAccountForm from "@/app/components/finance/EditAccountForm";
import { pool } from "@/lib/db";

export default async function EditAccountPage(
  context: { params: Promise<{ slug: string; id: string }> }
) {

  const { slug, id } = await context.params;

  const client = await pool.connect();

  try {

    const accountResult = await client.query(
      `
      SELECT *
      FROM chart_of_accounts
      WHERE id = $1
      `,
      [id]
    );

    const parentsResult = await client.query(
      `
      SELECT id, name, code
      FROM chart_of_accounts
      WHERE id != $1
      ORDER BY code
      `,
      [id]
    );

    const vatRates = await client.query(
      `
      SELECT id, name, rate
      FROM vat_rates
      ORDER BY rate DESC
      `
    );

    const postingGroups = await client.query(
      `
      SELECT id, name
      FROM posting_groups
      ORDER BY name
      `
    );

    const account = accountResult.rows[0];

    return (
      <div className="space-y-6">

        <h1 className="text-2xl font-bold">
          Edit Chart of Account
        </h1>

        <EditAccountForm
          slug={slug}
          account={account}
          parents={parentsResult.rows}
          vatRates={vatRates.rows}
          postingGroups={postingGroups.rows}
        />

      </div>
    );

  } finally {
    client.release();
  }
} */
