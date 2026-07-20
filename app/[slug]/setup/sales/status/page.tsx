// app/[slug]/setup/sales/status/page.tsx

import SetupDataGrid from "@/app/components/setup/SetupDataGrid";
import { setupConfig } from "@/app/config/setupConfig";

export default function Page() {
  return <SetupDataGrid {...setupConfig.salesStatus} />;
}
