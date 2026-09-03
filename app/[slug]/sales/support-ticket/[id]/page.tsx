// /app/[slug]/sales/support-ticket/[id]/page.tsx

import SupportTicketFormView from "@/app/components/sales/tickets/SupportTicketFormView";

type Props = {
  params: Promise<{
    slug: string;
    id: string;
  }>;
};

export default async function ViewSupportTicketPage({ params }: Props) {
  const { slug, id } = await params;

  return (
    <div className="space-y-6 ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Edit Support Ticket</h1>
      </div>

      <SupportTicketFormView slug={slug} id={id} />
    </div>
  );
}
