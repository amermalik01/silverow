// app/[slug]/setup/purchases/payment_terms/page.tsx

import SetupDataGrid from "@/app/components/setup/SetupDataGrid";
import { setupConfig } from "@/app/config/setupConfig";

export default function Page() {
  return <SetupDataGrid {...setupConfig.purchasesPaymentTerms} />;
}
