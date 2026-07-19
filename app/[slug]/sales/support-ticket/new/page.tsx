// /app/[slug]/sales/support-ticket/new/page.tsx

import SupportTicketFormView from "@/app/components/sales/tickets/SupportTicketFormView";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function NewSupportTicketPage({ params }: Props) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New Support Ticket</h1>
      <SupportTicketFormView slug={slug} />
    </div>
  );
}
