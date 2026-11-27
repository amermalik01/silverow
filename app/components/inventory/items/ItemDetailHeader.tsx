// app/components/inventory/items/ItemDetailHeader.tsx

"use client";
import { useState } from "react";
import { ItemFormData } from "@/types/inventory";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import ItemStockModal, { StockDetailRow } from "./ItemStockModal";

type WarehouseStockItem = {
  warehouse_id: string;
  warehouse_name: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  [key: string]: unknown;
};

type ItemActivityState = {
  warehouseStock: WarehouseStockItem[];
  transactions: StockDetailRow[];
  allocations: StockDetailRow[];
};

type MetricProps = {
  item: ItemFormData;
  metrics: {
    onRouteStock: number;
    totalStock: number;
    availableStock: number;
    allocatedStock: number;
  };
  onItemUpdated?: (updatedAccount: Partial<ItemFormData>) => void;

  /* ---- Edit mode (buttons live in the header, like the parties form) ---- */
  canEdit?: boolean;
  isEditing?: boolean;
  saving?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  onCancelEdit?: () => void;
  onClose?: () => void;
  /** Item name changes (editable in the header while editing). */
  onNameChange?: (value: string) => void;
  nameError?: string;

  /* ---- Activity link ---- */
  onOpenActivities?: () => void;
  activityActive?: boolean;
  /** Small text under "Activity". */
  activitySubtitle?: string;
  /** Category name shown under the item name. */
  categoryName?: string;
};

export default function ItemDetailHeader({
  item,
  metrics,
  onItemUpdated,
  canEdit = false,
  isEditing = false,
  saving = false,
  onEdit,
  onSave,
  onCancelEdit,
  onClose,
  onNameChange,
  nameError,
  onOpenActivities,
  activityActive = false,
  activitySubtitle,
  categoryName,
}: MetricProps) {
  /* New items open with the name input ready */
  const [editingNameState, setEditingName] = useState(() => !item.id);
  const editingName =
    isEditing && Boolean(onNameChange) && (editingNameState || Boolean(nameError));
  const [activityData, setActivityData] = useState<ItemActivityState>({
    warehouseStock: [],
    transactions: [],
    allocations: [],
  });

  const [activeModal, setActiveModal] = useState<
    "total" | "allocated" | "available" | null
  >(null);

  const [activityLoading, setActivityLoading] = useState(false);

  const [activityError, setActivityError] = useState<string | null>(null);

  // Fetch activity breakdown when item id is present
  // useEffect(() => {
  //   if (!item.id) return;
  //   fetch(`/api/inventory/items/${item.id}/cards-activity`)
  //     .then((res) => res.json())
  //     .then((data) => {
  //       if (!data.error) {
  //         setActivityData({
  //           warehouseStock: data.warehouseStock || [],
  //           transactions: data.transactions || [],
  //           allocations: data.allocations || [],
  //         });
  //       }
  //     })
  //     .catch((err) =>
  //       console.error("Failed to load item activity metrics", err),
  //     );
  // }, [item.id]);

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
      modalKey: "total" as const,
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
      modalKey: "allocated" as const,
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
      modalKey: "available" as const,
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

  const handleStockCardClick = async (
    type: "total" | "allocated" | "available",
  ) => {
    if (!item.id || activityLoading) return;

    setActiveModal(type);
    setActivityLoading(true);
    setActivityError(null);

    // Clear previous card data.
    setActivityData({
      warehouseStock: [],
      transactions: [],
      allocations: [],
    });

    try {
      const res = await fetch(
        `/api/inventory/items/${item.id}/cards-activity?type=${type}`,
        {
          cache: "no-store",
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load stock activity");
      }

      if (type === "allocated") {
        setActivityData({
          warehouseStock: [],
          transactions: [],
          allocations: data.allocations || [],
        });
      } else {
        setActivityData({
          warehouseStock: [],
          transactions: data.transactions || [],
          allocations: [],
        });
      }
    } catch (error: unknown) {
      console.error("Failed to load stock card activity:", error);

      setActivityError(
        error instanceof Error
          ? error.message
          : "Failed to load stock activity",
      );
    } finally {
      setActivityLoading(false);
    }
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

  const outlineButton =
    "flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";
  const solidButton =
    "flex h-9 items-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60";

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#11161D]">
        <div className="flex flex-col gap-4 px-5 py-3 xl:flex-row xl:items-center xl:justify-between">
          {/* LEFT: icon, editable name, item no, status, activity */}
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/50">
              <Icon
                icon={Number(item.item_type) === 2 ? "tabler:tool" : "tabler:package"}
                className="text-3xl text-emerald-700 dark:text-emerald-400"
              />
            </div>

            <div className="min-w-0">
              {editingName ? (
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={item.name || ""}
                      onChange={(event) => onNameChange?.(event.target.value)}
                      onKeyDown={(event) => {
                        if (
                          (event.key === "Enter" || event.key === "Escape") &&
                          (item.name || "").trim()
                        ) {
                          setEditingName(false);
                        }
                      }}
                      placeholder="Item name"
                      aria-label="Item name"
                      maxLength={255}
                      className={`h-9 w-[min(28rem,70vw)] rounded-md border bg-white px-3 text-base font-semibold text-slate-900 outline-none focus:ring-2 dark:bg-slate-950 dark:text-slate-100 ${
                        nameError
                          ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                          : "border-emerald-300 focus:border-emerald-600 focus:ring-emerald-100"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setEditingName(false)}
                      disabled={!(item.name || "").trim()}
                      title="Finish editing"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-40"
                    >
                      <Icon icon="lucide:check" />
                    </button>
                  </div>
                  {nameError && (
                    <p className="mt-1 text-xs text-red-600">{nameError}</p>
                  )}
                </div>
              ) : (
                <div className="flex min-w-0 items-center gap-2">
                  <h1
                    className="truncate text-xl font-bold text-slate-950 dark:text-white"
                    title={item.name || ""}
                  >
                    {item.name || (item.id ? "Unnamed item" : "New Item")}
                  </h1>
                  {isEditing && onNameChange && (
                    <button
                      type="button"
                      onClick={() => setEditingName(true)}
                      title="Edit item name"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <Icon icon="lucide:pencil" />
                    </button>
                  )}
                </div>
              )}

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400">
                  Item No. {item.item_code || (item.id ? "—" : "Auto")}
                </span>
                {categoryName && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <Icon icon="tabler:category" className="h-3.5 w-3.5" />
                    {categoryName}
                  </span>
                )}
              </div>
            </div>

            {item.id && (
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
                className={`group ml-1 inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full capitalize border transition-all duration-200 hover:shadow-sm disabled:opacity-60 ${
                  currentStatus === "active"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900 dark:hover:bg-emerald-950/70"
                    : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    currentStatus === "active" ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                />
                <span>{currentStatus === "active" ? "Active" : "Inactive"}</span>
                <Icon
                  icon="lucide:chevron-down"
                  className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity"
                />
              </button>
            )}

            {/* Activity link — opens the Activity view in the tab area */}
            {item.id && onOpenActivities && (
              <button
                type="button"
                onClick={onOpenActivities}
                aria-pressed={activityActive}
                title="Open item activity"
                className={`group relative inline-flex shrink-0 items-center gap-2.5 overflow-hidden rounded-xl border py-1.5 pl-1.5 pr-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  activityActive
                    ? "border-emerald-600 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-md"
                    : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-900 dark:border-emerald-900/60 dark:from-emerald-950/40 dark:to-teal-950/30 dark:text-emerald-100"
                }`}
              >
                <span
                  className={`pointer-events-none absolute -right-4 -top-4 h-12 w-12 rounded-full transition-colors ${
                    activityActive ? "bg-white/10" : "bg-emerald-400/10 group-hover:bg-emerald-400/20"
                  }`}
                />
                <span
                  className={`relative flex h-8 w-8 items-center justify-center rounded-lg shadow-sm ${
                    activityActive
                      ? "bg-white/20 text-white"
                      : "bg-white text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                  }`}
                >
                  <Icon icon="tabler:activity-heartbeat" className="h-4.5 w-4.5" />
                </span>
                <span className="relative leading-tight">
                  <span className="block text-sm font-semibold">Activity</span>
                  <span
                    className={`block text-[10px] ${
                      activityActive ? "text-emerald-100" : "text-emerald-700/80 dark:text-emerald-300/80"
                    }`}
                  >
                    {activitySubtitle || "Stock movements"}
                  </span>
                </span>
                <Icon
                  icon="lucide:arrow-up-right"
                  className={`relative h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                    activityActive ? "text-white" : "text-emerald-600"
                  }`}
                />
              </button>
            )}
          </div>

          {/* RIGHT: edit / save / cancel / close */}
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className={solidButton}
                >
                  <Icon
                    icon={saving ? "svg-spinners:180-ring-with-bg" : "lucide:save"}
                    className="h-4 w-4"
                  />
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingName(false);
                    onCancelEdit?.();
                  }}
                  disabled={saving}
                  className={outlineButton}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                {canEdit && onEdit && (
                  <button type="button" onClick={onEdit} className={outlineButton}>
                    <Icon icon="lucide:pencil" className="text-emerald-600" />
                    Edit
                  </button>
                )}
                {onClose && (
                  <button type="button" onClick={onClose} className={outlineButton}>
                    Close
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Stock KPI strip (existing items) */}
        {item.id && (
          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 px-5 py-3 sm:grid-cols-3 dark:border-slate-800">
            {stockCards.map((card) => (
              <button
                key={card.title}
                type="button"
                onClick={() => handleStockCardClick(card.modalKey)}
                title={`View ${card.title.toLowerCase()} details`}
                className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${card.container}`}
              >
                <span
                  className={`pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full transition-transform duration-300 group-hover:scale-125 ${card.decoration}`}
                />
                <span
                  className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.iconContainer}`}
                >
                  <Icon icon={card.icon} className="h-5 w-5" />
                </span>
                <span className="relative min-w-0 flex-1">
                  <span className={`block text-[11px] font-semibold ${card.titleColor}`}>
                    {card.title}
                  </span>
                  <span className={`block text-lg font-bold leading-tight tabular-nums ${card.valueColor}`}>
                    {formatQuantity(card.value)}
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                    {card.subtitle}
                  </span>
                </span>
                <Icon
                  icon="tabler:external-link"
                  className={`relative h-4 w-4 shrink-0 opacity-60 group-hover:opacity-100 ${card.titleColor}`}
                />
              </button>
            ))}
          </div>
        )}

        {errorMessage && (
          <div className="mx-5 mb-3 p-2.5 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg dark:bg-red-950/40 dark:text-red-400 dark:border-red-900">
            <strong>Error:</strong> {errorMessage}
          </div>
        )}
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

      {activeModal && activityLoading && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-400">
          <Icon icon="svg-spinners:180-ring-with-bg" className="h-4 w-4" />
          Loading stock details...
        </div>
      )}

      {activeModal && activityError && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          <span>{activityError}</span>

          <button
            type="button"
            onClick={() => handleStockCardClick(activeModal)}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Dynamic Stock Modal */}

      <ItemStockModal
        isOpen={Boolean(activeModal)}
        // title={activeModalTitle}
        title={`${item.item_code || ""} - (${item.name || "Item"}) ${
          activeModal === "total"
            ? "Stock Sheet"
            : activeModal === "allocated"
              ? "Allocated Stock"
              : "Available Stock"
        }`}
        data={
          activeModal === "allocated"
            ? activityData.allocations
            : activityData.transactions
        }
        loading={activityLoading}
        error={activityError}
        onRetry={() => {
          if (activeModal) {
            void handleStockCardClick(activeModal);
          }
        }}
        onClose={() => {
          setActiveModal(null);
          setActivityError(null);
        }}
      />
      {/* <ItemStockModal
        isOpen={activeModal !== null}
        title={`${item.item_code || ""} - (${item.name || "Item"}) ${
          activeModal === "total"
            ? "Stock Sheet"
            : activeModal === "allocated"
              ? "Allocated Stock"
              : "Available Stock"
        }`}
        data={
          activeModal === "allocated"
            ? activityData.allocations
            : activityData.transactions
        }
        // data={
        //   activeModal === "total"
        //     ? activityData.transactions
        //     : activeModal === "allocated"
        //       ? activityData.allocations
        //       : activityData.transactions.filter(
        //           (t) => Number(t.available_qty || 0) > 0,
        //         )
        // }
        onClose={() => setActiveModal(null)}
      /> */}
    </>
  );
}
{
  /* <div className="relative flex items-start justify-between gap-3">
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
                </div> */
}
