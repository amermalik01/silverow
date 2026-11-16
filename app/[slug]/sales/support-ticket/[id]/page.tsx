// /app/[slug]/sales/support-ticket/[id]/page.tsx

import SupportTicketFormView from "@/app/components/sales/tickets/SupportTicketFormView";

export default async function ViewSupportTicketPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id, slug } = await params;

  return (
    <div className="space-y-4">
      <SupportTicketFormView slug={slug} id={id} />
    </div>
  );
}
