// /app/[slug]/sales/support-ticket/[id]/edit/page.tsx

import SupportTicketFormView from "@/app/components/sales/tickets/SupportTicketFormView";

export default async function EditSupportTicketPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id, slug } = await params;

  return (
    <div className="space-y-4">
      <SupportTicketFormView id={id} slug={slug} />
    </div>
  );
}
