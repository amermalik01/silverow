// app/components/common/MasterDropdown.tsx

"use client";

import { MasterItem, useMaster } from "@/lib/hooks/useMaster";
import { MasterType } from "@/lib/master/masterRegistry";
import { useEffect } from "react";

type Props = {
  type: MasterType;
  value?: string | null;
  onChange: (value: string | null) => void;
  className?: string;
  disabled?: boolean;
  defaultFilter?: (item: MasterItem) => boolean;
};

export default function MasterDropdown({
  type,
  value,
  onChange,
  className = "border p-2 w-full rounded",
  disabled,
  defaultFilter,
}: Props) {
  const options = useMaster(type);

  useEffect(() => {
    if (value || !defaultFilter || options.length === 0) return;

    const item = options.find(defaultFilter);

    if (item) {
      onChange(item.id);
    }
  }, [value, options, defaultFilter, onChange]);

  return (
    <select
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value ? e.target.value : null)}
      className={className}
    >
      <option value="">Select {type}</option>

      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {/* {opt.code ? `${opt.code} - ${opt.name}` : opt.name} */}
          {opt.code}
        </option>
      ))}
    </select>
  );
}

