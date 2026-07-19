// app/[slug]/sales/support-ticket/page.tsx

import SupportTicketListView from "@/app/components/sales/tickets/SupportTicketListView";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function SupportTicketPage({ params }: Props) {
  const { slug } = await params;

  return (
    <div>
      <SupportTicketListView slug={slug} />
    </div>
  );
}
