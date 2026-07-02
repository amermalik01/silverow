// app/components/purchases/purchase-invoices/PurchaseInvoiceStatusBadge.tsx

import { PurchaseInvoiceStatus } from "@/types/purchase-invoice";

export default function PurchaseInvoiceStatusBadge({
  status,
}: {
  status?: PurchaseInvoiceStatus;
}) {
  const normalizedStatus = status?.toLowerCase() || "draft";

  let colorClasses =
    "bg-gray-100 border-gray-300 text-gray-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300";

  if (normalizedStatus === "posted") {
    colorClasses =
      "bg-green-50 border-green-300 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400";
  } else if (normalizedStatus === "paid") {
    colorClasses =
      "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400";
  } else if (normalizedStatus === "cancelled") {
    colorClasses =
      "bg-red-50 border-red-300 text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400";
  }

  return (
    <span
      className={`px-2 py-1 rounded text-xs border font-medium ${colorClasses}`}
    >
      {status || "Draft"}
    </span>
  );
}
