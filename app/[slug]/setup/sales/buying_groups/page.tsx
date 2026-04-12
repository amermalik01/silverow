// app/[slug]/setup/sales/buying_groups/page.tsx

import SetupDataGrid from "@/app/components/setup/SetupDataGrid";
import { setupConfig } from "@/app/config/setupConfig";

export default function Page() {
  return <SetupDataGrid {...setupConfig.salesBuyingGroups} />;
}
