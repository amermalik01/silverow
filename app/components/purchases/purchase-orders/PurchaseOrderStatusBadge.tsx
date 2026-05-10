// app/components/purchases/purchase-orders/PurchaseOrderStatusBadge.tsx

import { PurchaseOrderStatus } from "@/types/purchase-order";

export default function PurchaseOrderStatusBadge({
  status,
}: {
  status?: PurchaseOrderStatus;
}) {
  return (
    <span className="px-2 py-1 rounded text-xs border">
      {status || "draft"}
    </span>
  );
}
