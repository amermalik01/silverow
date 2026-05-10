// app/components/purchases/purchase-orders/PurchaseOrderTotals.tsx

export default function PurchaseOrderTotals({
  subtotal,
  tax,
  total,
}: {
  subtotal: number;
  tax: number;
  total: number;
}) {
  return (
    <div className="ml-auto w-80 space-y-2 border rounded p-4">
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{subtotal.toFixed(2)}</span>
      </div>

      <div className="flex justify-between">
        <span>Tax</span>
        <span>{tax.toFixed(2)}</span>
      </div>

      <div className="flex justify-between font-bold border-t pt-2">
        <span>Total</span>
        <span>{total.toFixed(2)}</span>
      </div>
    </div>
  );
}
