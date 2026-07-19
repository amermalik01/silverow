// /app/[slug]/sales/support-ticket/[id]/edit/page.tsx

import SupportTicketFormView from "@/app/components/sales/tickets/SupportTicketFormView";

type Props = {
  params: Promise<{
    slug: string;
    id: string;
  }>;
};

export default async function EditSupportTicketPage({ params }: Props) {
  const { slug, id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Support Ticket</h1>

      <SupportTicketFormView slug={slug} id={id} />
    </div>
  );
}
