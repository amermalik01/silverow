// app/components/energy/sites/SiteDetailHeader.tsx


"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import type { SitesFormData } from "@/types/sites";

interface Props {
  site: SitesFormData;
  isNew?: boolean;
  isEditing?: boolean;
  canChangeStatus?: boolean;
  onStatusChange: (status: 0 | 1) => Promise<boolean>;
}

export default function SiteDetailHeader({
  site,
  isNew = false,
  isEditing = false,
  canChangeStatus = true,
  onStatusChange,
}: Props) {
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const isActive = site.status === 1;
  const nextStatus: 0 | 1 = isActive ? 0 : 1;

  const handleStatusChange = async () => {
    setStatusLoading(true);

    try {
      const success = await onStatusChange(nextStatus);
      if (success) {
        setStatusModalOpen(false);
      }
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <>
      <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/40">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            {/* <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Icon
                icon="lucide:zap"
                className="text-xl"
              />
            </div> */}

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold">
                  {isNew ? "New Energy Site" : site.site_no || "Energy Site"}
                </h2>

                {!isNew && (
                  <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
                    SITE
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {site.site_name ||
                  "Manage site configuration, services and payments"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!isNew && (
              <>
                <div className="hidden border-r border-slate-200 pr-4 text-right dark:border-slate-700 sm:block">
                  <p className="text-[10px] text-slate-500">
                    BESS Units
                  </p>
                  <p className="text-sm font-bold">
                    {site.bess_units.length}
                  </p>
                </div>

                <div className="hidden border-r border-slate-200 pr-4 text-right dark:border-slate-700 sm:block">
                  <p className="text-[10px] text-slate-500">
                    Meters
                  </p>
                  <p className="text-sm font-bold">
                    {site.meters.length}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    statusLoading ||
                    isEditing ||
                    !canChangeStatus
                  }
                  onClick={() => setStatusModalOpen(true)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    isActive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isActive ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                  {isActive ? "Active" : "Inactive"}
                  {canChangeStatus && (
                    <Icon icon="lucide:chevron-down" />
                  )}
                </button>
              </>
            )}

            {isNew && (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400">
                New Record
              </span>
            )}
          </div>
        </div>
      </div>

      {statusModalOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="site-status-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="p-6">
              <div className="mb-4 flex items-start gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    isActive
                      ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40"
                      : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"
                  }`}
                >
                  <Icon
                    icon={
                      isActive
                        ? "lucide:power-off"
                        : "lucide:power"
                    }
                    className="text-xl"
                  />
                </div>

                <div>
                  <h3
                    id="site-status-title"
                    className="text-base font-bold"
                  >
                    {isActive
                      ? "Deactivate Site?"
                      : "Activate Site?"}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {site.site_no}
                  </p>
                </div>
              </div>

              <p className="text-xs leading-6 text-slate-600 dark:text-slate-400">
                {isActive
                  ? "This site will become inactive. Existing records and historical information will be preserved."
                  : "This site will become active and available for normal operations."}
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/30">
              <Button
                type="button"
                variant="cancel"
                disabled={statusLoading}
                onClick={() => setStatusModalOpen(false)}
              >
                Cancel
              </Button>

              <Button
                type="button"
                disabled={statusLoading}
                onClick={() => void handleStatusChange()}
                className={
                  isActive
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : "bg-emerald-700 text-white hover:bg-emerald-800"
                }
              >
                {statusLoading
                  ? "Updating..."
                  : isActive
                    ? "Deactivate"
                    : "Activate"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


/* "use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { SitesFormData } from "@/types/sites";

type MetricProps = {
  site: SitesFormData;
  onSiteUpdated?: (updatedAccount: Partial<SitesFormData>) => void;
};

export default function SiteDetailHeader({ site, onSiteUpdated }: MetricProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [statusLoading, setStatusLoading] = useState(false);

  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    targetStatus: "active" | "inactive" | null;
  }>({
    isOpen: false,
    targetStatus: null,
  });

  type SiteStatus = "active" | "inactive";

  const currentStatus = Number(site.status) === 1 ? "active" : "inactive";

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
    if (!site.id || !targetStatus) return;

    setStatusLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/energy/site/${site.id}/status`, {
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
        throw new Error(data.error || "Failed to update site status.");
      }

      const updatedStatus = targetStatus === "active" ? 1 : 0;

      onSiteUpdated?.({
        ...data.site,
        status: updatedStatus,
      });

      // if (data.site) {
      //   onSiteUpdated?.(data.site);
      // }

      setStatusModal({
        isOpen: false,
        targetStatus: null,
      });
    } catch (err) {
      console.error("Status change error:", err);

      setErrorMessage(
        err instanceof Error ? err.message : "Failed to update site status.",
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
                {site.name || "Site"}
                 
              </h2>

              {site.site_no && (
                <div className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded text-md font-bold border border-emerald-200 dark:border-emerald-900">
                  Site No. &nbsp;{site.site_no}
                </div>
              )}
            </div>
          </div>

          <div
            className={`grid grid-cols-1 gap-3  ${
              site.id ? "sm:grid-cols-4" : "sm:grid-cols-3"
            }`}
          >
            {site.id && (
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
          </div>
        </div>
      </div>

      {statusModal.isOpen && targetStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">

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
                    {isActivating ? "Activate Site?" : "Deactivate Site?"}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {site.site_no || "This Site"}
                  </p>
                </div>
              </div>
            </div>


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
                    ? "This Site will become active and can be used in normal transactions."
                    : "This Site will become inactive. Existing historical transactions and records will remain preserved."}
                </p>
              </div>
            </div>


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
                    {isActivating ? "Activate Site" : "Deactivate Site"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} */
