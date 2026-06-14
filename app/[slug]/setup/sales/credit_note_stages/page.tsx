// app/[slug]/setup/sales/credit_note_stages/page.tsx

import RankedStagesTemplate from "@/app/components/setup/RankedStagesTemplate";
import { setupConfig } from "@/app/config/setupConfig";

export default function Page() {
  return <RankedStagesTemplate config={setupConfig.creditNoteStages} />;
}
