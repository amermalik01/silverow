// app/[slug]/purchases/purchase-orders/page.tsx

import Breadcrumbs from "@/app/components/layout/shared/breadcrumb/BreadcrumbComp";
import PurchaseOrderList from "@/app/components/purchases/purchase-orders/PurchaseOrderList";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PurchaseOrdersPage({ params }: Props) {
  const { slug } = await params;

  return (
    <div>
      {/* <Breadcrumbs items={[ { label: "Reports", href: `/${slug}/reports`, }, { label: "All Reports", href: `/${slug}/reports`, }, { label: "Posted Sales Invoice and Credit Note", }, ]} /> */}
      <PurchaseOrderList slug={slug} />
    </div>
  );
}
