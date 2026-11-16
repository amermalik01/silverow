// app/[slug]/sales/support-ticket/page.tsx

import SupportTicketListView from "@/app/components/sales/tickets/SupportTicketListView";

export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <SupportTicketListView
      slug={slug}
    />
  );
}
