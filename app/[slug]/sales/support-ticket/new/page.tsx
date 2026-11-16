// /app/[slug]/sales/support-ticket/new/page.tsx

import SupportTicketFormView from "@/app/components/sales/tickets/SupportTicketFormView";

export default async function NewSupportTicketPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="space-y-4">
      <SupportTicketFormView slug={slug} />
    </div>
  );
}
