// app/components/hr/employees/EmployeeDetailHeader.tsx

"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { Employee } from "@/types/hr/employee";

type Props = {
  employee: Partial<Employee>;
  onEmployeeUpdated?: (updatedEmployee: Partial<Employee>) => void;
};

type EmployeeStatus = "active" | "inactive";

export default function EmployeeDetailHeader({
  employee,
  onEmployeeUpdated,
}: Props) {
  const [statusLoading, setStatusLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    targetStatus: EmployeeStatus | null;
  }>({
    isOpen: false,
    targetStatus: null,
  });

  const currentStatus: EmployeeStatus =
    employee.status === "inactive" ? "inactive" : "active";

  const targetStatus = statusModal.targetStatus;

  const isActivating = targetStatus === "active";

  const openStatusModal = (status: EmployeeStatus) => {
    if (status === currentStatus || statusLoading || !employee.id) {
      return;
    }

    setErrorMessage(null);

    setStatusModal({
      isOpen: true,
      targetStatus: status,
    });
  };

  const closeStatusModal = () => {
    if (statusLoading) return;

    setStatusModal({
      isOpen: false,
      targetStatus: null,
    });
  };

  const handleStatusChange = async () => {
    if (!employee.id || !targetStatus || statusLoading) {
      return;
    }

    setStatusLoading(true);
    setErrorMessage(null);

    try {
      // Keep the endpoint consistent with EmployeeRecord.tsx.
      const res = await fetch(
        `/api/hr/employees/${encodeURIComponent(String(employee.id))}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: targetStatus,
          }),
        },
      );

      const data: {
        error?: string;
        employee?: Partial<Employee>;
        data?: Partial<Employee>;
      } = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update employee status.");
      }

      const updatedEmployee = data.employee ?? data.data;

      // Synchronize the header and parent record.
      onEmployeeUpdated?.({
        ...employee,
        ...(updatedEmployee ?? {}),
        status: targetStatus,
      });

      setStatusModal({
        isOpen: false,
        targetStatus: null,
      });

      toast.success(
        `Employee ${targetStatus === "active" ? "activated" : "deactivated"} successfully.`,
      );
    } catch (error) {
      console.error("Employee status change error:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Failed to update employee status.";

      setErrorMessage(message);
      toast.error(message);
    } finally {
      setStatusLoading(false);
    }
  };

  const employeeName = [
    employee.first_name,
    employee.middle_name,
    employee.last_name,
  ]
    .filter(
      (part): part is string =>
        typeof part === "string" && part.trim().length > 0,
    )
    .join(" ");

  const employeeCode = employee.employee_code || "";

  const jobTitle =
    typeof employee.job_title === "string" ? employee.job_title : "";

  return (
    <>
      <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          {/* Employee information */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0">

                <h2 className="break-words text-lg font-bold text-slate-900 dark:text-white">
                  {employeeName || "Employee"}
                </h2>

                {/* {jobTitle && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {jobTitle}
                  </p>
                )} */}
              </div>

              <div className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-sm font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400">
                Employee No. <span>{employeeCode || "Not assigned"}</span>
              </div>
            </div>
          </div>

          {/* Employee status */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Status
            </span>

            <button
              type="button"
              onClick={() =>
                openStatusModal(
                  currentStatus === "active" ? "inactive" : "active",
                )
              }
              disabled={statusLoading || !employee.id}
              title={
                currentStatus === "active"
                  ? "Click to deactivate employee"
                  : "Click to activate employee"
              }
              aria-label={`Employee status: ${currentStatus}. Click to change status.`}
              className={`group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize transition-all duration-200 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${
                currentStatus === "active"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/70"
                  : "border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  currentStatus === "active" ? "bg-emerald-500" : "bg-slate-400"
                }`}
              />

              <span>{currentStatus}</span>

              <Icon
                icon="lucide:chevron-down"
                className="h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100"
              />
            </button>
          </div>
        </div>

        {/* Status update error */}
        {errorMessage && (
          <div
            role="alert"
            className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
          >
            <strong>Status Update Error:</strong> {errorMessage}
          </div>
        )}
      </div>

      {/* Status confirmation modal */}
      {statusModal.isOpen && targetStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-status-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            {/* Modal header */}
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
                    className="h-5 w-5"
                  />
                </div>

                <div>
                  <h3
                    id="employee-status-title"
                    className="text-base font-bold text-slate-900 dark:text-white"
                  >
                    {isActivating
                      ? "Activate Employee?"
                      : "Deactivate Employee?"}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {employeeName || "Selected Employee"}
                    {employeeCode ? ` · ${employeeCode}` : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal body */}
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
                    className="h-3.5 w-3.5 text-slate-400"
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
                    ? "This employee will become active and can be used in normal operations."
                    : "This employee will become inactive. Historical records should remain preserved."}
                </p>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/30">
              <Button
                type="button"
                variant="cancel"
                disabled={statusLoading}
                onClick={closeStatusModal}
              >
                Cancel
              </Button>

              <Button
                type="button"
                disabled={statusLoading || !employee.id}
                onClick={handleStatusChange}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  isActivating
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-slate-600 hover:bg-slate-700"
                }`}
              >
                {statusLoading ? (
                  <>
                    <Icon
                      icon="svg-spinners:180-ring-with-bg"
                      className="h-3.5 w-3.5"
                    />
                    Updating...
                  </>
                ) : (
                  <>
                    <Icon
                      icon={isActivating ? "lucide:power" : "lucide:power-off"}
                      className="h-3.5 w-3.5"
                    />
                    {isActivating ? "Activate Employee" : "Deactivate Employee"}
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
