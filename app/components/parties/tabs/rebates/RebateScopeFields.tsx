// app/components/parties/tabs/rebates/RebateScopeFields.tsx

"use client";

import type { RebateDraft } from "@/types/rebate";
import RebateCategorySelector from "./RebateCategorySelector";
import RebateItemSelector from "./RebateItemSelector";

interface Props {
  value: RebateDraft;
  onChange: (patch: Partial<RebateDraft>) => void;
  readonly?: boolean;
  categoryLookupUrl?: string;
  itemLookupUrl?: string;
}

export default function RebateScopeFields({
  value,
  onChange,
  readonly = false,
  categoryLookupUrl,
  itemLookupUrl,
}: Props) {
  if (value.scope === "UNIVERSAL") return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/20">
      {value.scope === "CATEGORY" ? (
        <RebateCategorySelector
          value={value.categories}
          onChange={(categories) => onChange({ categories })}
          readonly={readonly}
          lookupUrl={categoryLookupUrl}
        />
      ) : (
        <RebateItemSelector
          value={value.items}
          onChange={(items) => onChange({ items })}
          readonly={readonly}
          lookupUrl={itemLookupUrl}
        />
      )}
    </div>
  );
}
