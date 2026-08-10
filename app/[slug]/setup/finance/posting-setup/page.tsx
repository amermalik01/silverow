// app/[slug]/setup/finance/posting-setup/page.tsx

import InventoryPostingGroups from "@/app/components/setup/posting/InventoryPostingGroups";
import InventorySystemSetup from "@/app/components/setup/posting/InventorySystemSetup";
import PurchasePostingGroups from "@/app/components/setup/posting/PurchasePostingGroups";
import SalesPostingGroups from "@/app/components/setup/posting/SalesPostingGroups";

export default function PostingSetupPage() {
  return (
    <div className="space-y-6 container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Posting Setup</h1>
      </div>

      <InventorySystemSetup />

      <SalesPostingGroups />

      <PurchasePostingGroups />

      <InventoryPostingGroups />
    </div>
  );
}
