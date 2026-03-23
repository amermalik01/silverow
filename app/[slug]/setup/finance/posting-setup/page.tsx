// app/[slug]/setup/finance/posting-setup/page.tsx

import InventoryPostingGroups from "@/app/components/setup/posting/InventoryPostingGroups";
import InventorySystemSetup from "@/app/components/setup/posting/InventorySystemSetup";
import PurchasePostingGroups from "@/app/components/setup/posting/PurchasePostingGroups";
import SalesPostingGroups from "@/app/components/setup/posting/SalesPostingGroups";

export default function PostingSetupPage() {
  return (
    <div className="container mx-auto p-6 space-y-10">
      <h1 className="text-2xl font-bold">Posting Setup</h1>

      <InventorySystemSetup />

      <SalesPostingGroups />

      <PurchasePostingGroups />

      <InventoryPostingGroups />
    </div>
  );
}
