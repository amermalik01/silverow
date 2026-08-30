// app/components/hr/employees/EmployeeCellRenderers.tsx

"use client";

import React from "react";
import Link from "next/link";
import { Employee } from "@/types/hr/employee";
import { Eye, Edit, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export function getEmployeeCellRenderers(slug: string) {
  return {
    employee_code: (row: Employee) => (
      <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
        {row.employee_code || "-"}
      </span>
    ),

    display_name: (row: Employee) => {
      const fullName =
        row.display_name || `${row.first_name} ${row.last_name}`.trim();
      return (
        <div className="flex flex-col">
          <Link
            href={`/${slug}/hr/employees/${row.id}`}
            className=" text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors"
          >
            {fullName}
          </Link>
          {row.login_role && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
              {row.login_role}
            </span>
          )}
        </div>
      );
    },

    email: (row: Employee) => (
      <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
        {row.email || "-"}
      </span>
    ),

    phone: (row: Employee) => {
      const primaryPhone = row.phone || row.mobile || "-";
      return (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {primaryPhone}
        </span>
      );
    },

    department_name: (row: Employee) => (
      <span className="text-xs text-slate-700 dark:text-slate-300">
        {row.department_name || "-"}
      </span>
    ),

    designation_name: (row: Employee) => (
      <span className="text-xs text-slate-700 dark:text-slate-300">
        {row.designation_name || "-"}
      </span>
    ),

    manager_name: (row: Employee) => {
      const manager = row.manager_name?.trim();
      return (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {manager && manager !== "" ? manager : "-"}
        </span>
      );
    },

    status: (row: Employee) => {
      const statusStyles: Record<string, string> = {
        active:
          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        inactive:
          "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
        terminated:
          "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      };

      const currentStatus = row.status || "inactive";

      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs  border capitalize ${
            statusStyles[currentStatus] || statusStyles.inactive
          }`}
        >
          {currentStatus}
        </span>
      );
    },

    actions: (row: Employee) => (
      <div className="flex items-center gap-1.5">

        <Link
          href={`/${slug}/hr/employees/${row.id}/edit`}
          className="rounded border border-slate-300 dark:border-slate-700 px-2 py-1 text-[11px]  hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Edit
        </Link>
        {/* <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <Link href={`/${slug}/hr/employees/${row.id}`}>
            <Eye className="h-4 w-4" />
            <span className="sr-only">View</span>
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <Link href={`/${slug}/hr/employees/${row.id}/edit`}>
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Link>
        </Button> */}
      </div>
    ),
  };
}

/* "use client";

import React from "react";
import Link from "next/link";
import { Employee } from "@/types/hr/employee";

export function getEmployeeCellRenderers(slug: string) {
  return {
    display_name: (row: Employee) => {
      const fullName =
        row.display_name || `${row.first_name} ${row.last_name}`.trim();
      return (
        <div className="flex flex-col">
          <Link
            href={`/${slug}/hr/employees/${row.id}`}
            className="font-medium text-slate-900 dark:text-slate-100 hover:underline"
          >
            {fullName}
          </Link>
          {row.login_role && (
            <span className="text-xs text-slate-500 capitalize">
              {row.login_role}
            </span>
          )}
        </div>
      );
    },

    phone: (row: Employee) => {
      const primaryPhone = row.phone || row.mobile || "-";
      return (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {primaryPhone}
        </span>
      );
    },

    status: (row: Employee) => {
      const statusStyles: Record<string, string> = {
        active:
          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        inactive:
          "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
        terminated:
          "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      };

      const currentStatus = row.status || "inactive";

      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${
            statusStyles[currentStatus] || statusStyles.inactive
          }`}
        >
          {currentStatus}
        </span>
      );
    },
  };
}
 */
