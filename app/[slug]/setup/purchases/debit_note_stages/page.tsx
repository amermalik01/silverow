// app/[slug]/setup/purchases/debit_note_stages/page.tsx

import RankedStagesTemplate from "@/app/components/setup/RankedStagesTemplate";
import { setupConfig } from "@/app/config/setupConfig";

export default function Page() {
  return <RankedStagesTemplate config={setupConfig.debitNoteStages} />;
}