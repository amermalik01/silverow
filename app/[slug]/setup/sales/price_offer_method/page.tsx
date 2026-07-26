// app/[slug]/setup/sales/price_offer_method/page.tsx

import SetupDataGrid from "@/app/components/setup/SetupDataGrid"
import { setupConfig } from "@/app/config/setupConfig"

export default function Page() {
  return <SetupDataGrid {...setupConfig.salesPriceOfferMethod} />
}

