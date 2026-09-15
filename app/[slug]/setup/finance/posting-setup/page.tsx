// app/[slug]/setup/finance/posting-setup/page.tsx

import Breadcrumbs from "@/app/components/layout/shared/breadcrumb/BreadcrumbComp";
import InventoryPostingGroups from "@/app/components/setup/posting/InventoryPostingGroups";
import InventorySystemSetup from "@/app/components/setup/posting/InventorySystemSetup";
import PurchasePostingGroups from "@/app/components/setup/posting/PurchasePostingGroups";
import SalesPostingGroups from "@/app/components/setup/posting/SalesPostingGroups";

export default function PostingSetupPage() {
  return (
    <div className="space-y-4 ">
      <Breadcrumbs
        items={[
          {
            label: "Posting Setup",
          },
        ]}
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Posting Setup</h1>
      </div>

      <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-4">
        <InventorySystemSetup />

        <SalesPostingGroups />

        <PurchasePostingGroups />

        <InventoryPostingGroups />
      </div>
    </div>
  );
}
