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
  /**
   * Defines what is rendered in the select options:
   * - "name": Displays full name (e.g., "United Kingdom")
   * - "code": Displays ISO code (e.g., "GB")
   * - "both": Displays ISO code + full name (e.g., "GB - United Kingdom")
   * @default "code"
   */
  displayFormat?: "name" | "code" | "both";
  /**
   * Property used as the select option value sent to onChange:
   * - "code": Sends the ISO code (e.g., "GB")
   * - "id": Sends the database ID / internal ID
   * @default "code"
   */
  valueKey?: "code" | "id";
};

export default function MasterDropdown({
  type,
  value,
  onChange,
  className = "border p-2 w-full rounded",
  disabled,
  defaultFilter,
  displayFormat = "code",
  valueKey = "code",
}: Props) {
  const options = useMaster(type);

  useEffect(() => {
    if (value || !defaultFilter || options.length === 0) return;

    const item = options.find(defaultFilter);

    if (item) {
      const selectedVal = valueKey === "code" ? item.code || item.id : item.id;
      onChange(selectedVal);
    }
  }, [value, options, defaultFilter, onChange, valueKey]);

  const renderLabel = (opt: MasterItem) => {
    switch (displayFormat) {
      case "name":
        return opt.name;
      case "both":
        return opt.code ? `${opt.code} - ${opt.name}` : opt.name;
      case "code":
      default:
        return opt.code || opt.name;
    }
  };

  return (
    <select
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value ? e.target.value : null)}
      className={className}
    >
      <option value="">{type}</option>

      {options.map((opt) => {
        const optionValue = valueKey === "code" ? (opt.code || opt.id) : opt.id;
        return (
          <option key={opt.id} value={optionValue}>
            {renderLabel(opt)}
          </option>
        );
      })}
    </select>
  );
}
