// app/[slug]/setup/finance/page.tsx

import Breadcrumbs from "@/app/components/layout/shared/breadcrumb/BreadcrumbComp";
import FinanceSetupForm from "@/app/components/setup/finance/FinanceSetupForm";

export default function GeneralCompanySetupPage() {
  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          {
            label: "Finance Setup",
          },
        ]}
      />

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="absolute inset-x-0 top-0 h-1 bg-[#103701] dark:bg-emerald-500" />

        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className=" flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 7.5h18M6 3.5h12A1.5 1.5 0 0 1 19.5 5v14A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 11h8M8 15h5"
                />
              </svg>
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Finance Setup
              </h1>

              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Configure transaction posting classifications, standard rates,
                and account mappings.
              </p>
            </div>
          </div>

          <div className=" hidden rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400 sm:block">
            Finance Configuration
          </div>
        </div>
      </div>

      <FinanceSetupForm />
    </div>
  );
}
