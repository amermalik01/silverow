// app/components/inventory/items/ItemDetailHeader.tsx

"use client";
import { useState } from "react";
import { ItemFormData } from "@/types/inventory";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";

type MetricProps = {
  item: ItemFormData;
  metrics: {
    onRouteStock: number;
    totalStock: number;
    availableStock: number;
    allocatedStock: number;
  };
  onItemUpdated?: (updatedAccount: Partial<ItemFormData>) => void;
};

export default function ItemDetailHeader({
  item,
  metrics,
  onItemUpdated,
}: MetricProps) {
  const formatQuantity = (value: number) =>
    Number(value || 0).toLocaleString(undefined, {
      maximumFractionDigits: 3,
    });

  const stockCards = [
    {
      title: "Total Stock",
      value: metrics.totalStock,
      subtitle: "Physical inventory",
      icon: "tabler:packages",
      color: "blue",
      container:
        "border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 dark:border-blue-900/50 dark:from-blue-950/40 dark:to-sky-950/20",
      titleColor: "text-blue-700 dark:text-blue-400",
      valueColor: "text-blue-950 dark:text-blue-100",
      iconContainer:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300",
      decoration: "bg-blue-400/10",
    },
    {
      title: "Allocated Stock",
      value: metrics.allocatedStock,
      subtitle: "Reserved inventory",
      icon: "tabler:lock-check",
      color: "amber",
      container:
        "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-900/50 dark:from-amber-950/40 dark:to-orange-950/20",
      titleColor: "text-amber-700 dark:text-amber-400",
      valueColor: "text-amber-950 dark:text-amber-100",
      iconContainer:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
      decoration: "bg-amber-400/10",
    },
    {
      title: "Available Stock",
      value: metrics.availableStock,
      subtitle: "Ready to use",
      icon: "tabler:circle-check",
      color: "emerald",
      container:
        "border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-teal-950/20",
      titleColor: "text-emerald-700 dark:text-emerald-400",
      valueColor: "text-emerald-950 dark:text-emerald-100",
      iconContainer:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
      decoration: "bg-emerald-400/10",
    },
  ];

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [statusLoading, setStatusLoading] = useState(false);

  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    targetStatus: "active" | "inactive" | null;
  }>({
    isOpen: false,
    targetStatus: null,
  });

  type ItemStatus = "active" | "inactive";

  const currentStatus = Number(item.status) === 1 ? "active" : "inactive";

  const targetStatus = statusModal.targetStatus;

  const isActivating = targetStatus === "active";
  const isDeactivating = targetStatus === "inactive";

  const openStatusModal = (status: "active" | "inactive") => {
    if (status === currentStatus) return;

    setStatusModal({
      isOpen: true,
      targetStatus: status,
    });
  };

  const handleStatusChange = async () => {
    if (!item.id || !targetStatus) return;

    setStatusLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/inventory/items/${item.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: targetStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update item status.");
      }

      const updatedStatus = targetStatus === "active" ? 1 : 0;

      onItemUpdated?.({
        ...data.item,
        status: updatedStatus,
      });

      // if (data.item) {
      //   onItemUpdated?.(data.item);
      // }

      setStatusModal({
        isOpen: false,
        targetStatus: null,
      });
    } catch (err) {
      console.error("Status change error:", err);

      setErrorMessage(
        err instanceof Error ? err.message : "Failed to update item status.",
      );
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <>
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-2 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {item.name || "Item"}
              </h2>

              {item.item_code && (
                <div className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded text-md font-bold border border-emerald-200 dark:border-emerald-900">
                  Item No. &nbsp;{item.item_code}
                </div>
              )}
            </div>
          </div>

          <div
            className={`grid grid-cols-1 gap-3  ${
              item.id ? "sm:grid-cols-4" : "sm:grid-cols-3"
            }`}
          >
            {item.id && (
              <div className="flex items-center justify-end pr-8">
                <button
                  type="button"
                  onClick={() =>
                    openStatusModal(
                      currentStatus === "active" ? "inactive" : "active",
                    )
                  }
                  disabled={statusLoading}
                  title={
                    currentStatus === "active"
                      ? "Click to deactivate"
                      : "Click to activate"
                  }
                  className={`group inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full capitalize border transition-all duration-200 hover:shadow-sm disabled:opacity-60 ${
                    currentStatus === "active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900 dark:hover:bg-emerald-950/70"
                      : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      currentStatus === "active"
                        ? "bg-emerald-500"
                        : "bg-slate-400"
                    }`}
                  />

                  <span>
                    {currentStatus === "active" ? "Active" : "Inactive"}
                  </span>

                  <Icon
                    icon="lucide:chevron-down"
                    className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity"
                  />
                </button>
              </div>
            )}

            {stockCards.map((card) => (
              <div
                key={card.title}
                className={`group relative overflow-hidden rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${card.container}`}
              >
                <div
                  className={`absolute -right-5 -top-5 h-20 w-20 rounded-full transition-transform duration-300 group-hover:scale-125 ${card.decoration}`}
                />

                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className={`flex items-center gap-2 text-md capitalize tracking-wider ${card.titleColor}`}
                    >
                      <Icon icon={card.icon} className="h-4 w-4 shrink-0" />
                      {card.title}
                    </div>
                  </div>

                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm ${card.iconContainer}`}
                  >
                    {formatQuantity(card.value)}
                  </div>
                </div>

                <div className="relative mt-2 h-1 overflow-hidden rounded-full bg-white/70 dark:bg-slate-800/60">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      card.color === "blue"
                        ? "w-full bg-blue-500"
                        : card.color === "amber"
                          ? "w-full bg-amber-500"
                          : "w-full bg-emerald-500"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {statusModal.isOpen && targetStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {/* Header */}
            <div className="p-6 pb-4">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                    isActivating
                      ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400"
                  }`}
                >
                  <Icon
                    icon={isActivating ? "lucide:power" : "lucide:power-off"}
                    className="w-5 h-5"
                  />
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {isActivating ? "Activate Item?" : "Deactivate Item?"}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {item.name || "This Item"}
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 pb-5">
              <div
                className={`rounded-xl border p-4 ${
                  isActivating
                    ? "border-emerald-100 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                    : "border-amber-100 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        currentStatus === "active"
                          ? "bg-emerald-500"
                          : "bg-slate-400"
                      }`}
                    />
                    {currentStatus}
                  </div>

                  <Icon
                    icon="lucide:arrow-right"
                    className="w-3.5 h-3.5 text-slate-400"
                  />

                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isActivating ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    />
                    {targetStatus}
                  </div>
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-400">
                  {isActivating
                    ? "This Item will become active and can be used in normal transactions."
                    : "This Item will become inactive. Existing historical transactions and records will remain preserved."}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/30">
              <Button
                type="button"
                variant="cancel"
                disabled={statusLoading}
                onClick={() =>
                  setStatusModal({
                    isOpen: false,
                    targetStatus: null,
                  })
                }
              >
                Cancel
              </Button>

              <Button
                type="button"
                disabled={statusLoading}
                onClick={handleStatusChange}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm transition-colors ${
                  isActivating
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-slate-600 hover:bg-slate-700"
                }`}
              >
                {statusLoading ? (
                  <>
                    <Icon
                      icon="svg-spinners:180-ring-with-bg"
                      className="w-3.5 h-3.5"
                    />
                    Updating...
                  </>
                ) : (
                  <>
                    <Icon
                      icon={isActivating ? "lucide:power" : "lucide:power-off"}
                      className="w-3.5 h-3.5"
                    />
                    {isActivating ? "Activate Item" : "Deactivate Item"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
