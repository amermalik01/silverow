// app/components/ui/SearchableDropdown.tsx

"use client";

import { useEffect, useState, useRef } from "react";

// T represents the generic object type passed into the options array
interface SearchableDropdownProps<T> {
  options: T[];
  selectedValue: string | number;
  onSelect: (item: T) => void;
  getOptionId: (item: T) => string | number;
  getOptionLabel: (item: T) => string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function SearchableDropdown<T>({
  options,
  selectedValue,
  onSelect,
  getOptionId,
  getOptionLabel,
  placeholder = "Search...",
  disabled = false,
  className = "",
}: SearchableDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // DERIVED STATE: Find the matching label directly during render pass
  const selectedOption = options.find((o) => getOptionId(o) === selectedValue);
  const currentDisplayLabel = selectedOption
    ? getOptionLabel(selectedOption)
    : "";

  // If the dropdown is closed, show the officially selected label.
  // If open, show what the user is actively typing.
  const inputValue = isOpen ? search : currentDisplayLabel;

  const filteredOptions = options.filter((option) =>
    getOptionLabel(option).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <input
        type="text"
        disabled={disabled}
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          // Initialize search string to the existing label so they can modify it
          setSearch(currentDisplayLabel);
          setIsOpen(true);
        }}
        className="w-full border p-1 rounded bg-white outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800 font-medium disabled:opacity-60"
      />

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-zinc-200 rounded shadow-lg text-left">
          {filteredOptions.length === 0 ? (
            <div className="p-2 text-zinc-400 text-center select-none">
              No matches found
            </div>
          ) : (
            filteredOptions.map((option, idx) => {
              const id = getOptionId(option);
              const label = getOptionLabel(option);
              return (
                <div
                  key={`${id}-${idx}`}
                  onClick={() => {
                    onSelect(option);
                    setSearch(label); // Pre-sets string value for next focus
                    setIsOpen(false);
                  }}
                  className="p-2 hover:bg-zinc-100 cursor-pointer text-zinc-700 truncate"
                >
                  {label}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
