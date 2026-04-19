// app/components/common/MasterDropdown.tsx

"use client";

import { useMaster } from "@/lib/hooks/useMaster";
import { MasterType } from "@/lib/master/masterRegistry";

type Props = {
  type: MasterType;
  value?: string | null;
  onChange: (value: string | null) => void;
};

export default function MasterDropdown({ type, value, onChange }: Props) {
  const options = useMaster(type);

  return (
    <select
      value={value ?? ""}
      onChange={(e) =>
        onChange(e.target.value ? e.target.value : null)
      }
      className="border p-2 w-full rounded"
    >
      <option value="">Select {type}</option>

      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.code ? `${opt.code} - ${opt.name}` : opt.name}
        </option>
      ))}
    </select>
  );
}

/* <MasterDropdown
  type="country"
  value={form.country_id}
  onChange={(val) =>
    setForm({ ...form, country_id: val })
  }
/> */