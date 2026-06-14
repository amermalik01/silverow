// app/[slug]/setup/purchases/purchase_order_stages/page.tsx

import RankedStagesTemplate from "@/app/components/setup/RankedStagesTemplate";
import { setupConfig } from "@/app/config/setupConfig";

export default function Page() {
  return <RankedStagesTemplate config={setupConfig.purchaseOrderStages} />;
}