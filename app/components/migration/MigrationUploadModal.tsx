// app/components/migration/MigrationUploadModal.tsx

"use client";

import MigrationUploader from "./MigrationUploader";

type Props = {
  open: boolean;
  onClose: () => void;

  purchaseOrder: {
    id?: string;
    order_no?: string;
    supplier_name?: string;
  };

  onCompleted?: () => void;
};

export default function MigrationUploadModal({
  open,
  onClose,
  purchaseOrder,
  onCompleted,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-[1100px] max-w-[95vw] max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold">
              Import Purchase Order Items
            </h2>

            <p className="text-sm text-slate-500">
              {purchaseOrder.order_no}
              {purchaseOrder.supplier_name &&
                ` • ${purchaseOrder.supplier_name}`}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-6 max-h-[80vh]">
          <MigrationUploader
            purchaseOrder={purchaseOrder}
            onCompleted={() => {
              onCompleted?.();
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
