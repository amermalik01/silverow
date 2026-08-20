// components/parties/tabs/ContactsTab.tsx

"use client";

import { Button } from "@/components/ui/button";
import type { PartyContactDraft } from "@/types/erp";

type Props = {
  contacts: PartyContactDraft[];
  setContacts: React.Dispatch<React.SetStateAction<PartyContactDraft[]>>;
  isReadonly?: boolean;
  errors: Record<string, string>;
};

export default function ContactsTab({
  contacts,
  setContacts,
  isReadonly = false,
  errors,
}: Props) {
  const addContactRow = () => {
    setContacts([
      ...contacts,
      {
        name: "",
        email: "",
        phone: "",
        mobile: "",
        job_title: "",
        notes: "",
        is_primary: contacts.length === 0,
      },
    ]);
  };

  const updateContactRow = (
    idx: number,
    key: keyof PartyContactDraft,
    val: string | boolean,
  ) => {
    setContacts(contacts.map((c, i) => (i === idx ? { ...c, [key]: val } : c)));
  };

  const getInputClass = (
    errorKey: string,
    extraClasses: string = "",
    disabled: boolean = isReadonly,
  ) => {
    const baseClasses =
      "w-full border p-2 rounded text-xs outline-none transition-colors duration-150";

    if (disabled) {
      return `${baseClasses} bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed select-none ${extraClasses}`;
    }

    const stateClasses = errors[errorKey]
      ? "border-red-500 bg-red-50/10 text-slate-900 dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

    return `${baseClasses} ${stateClasses} ${extraClasses}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wider">
          Contact(s)
        </h3>
        {!isReadonly && (
          <Button
            type="button"
            onClick={addContactRow}
            variant="add_line"
            // className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Add Contact
          </Button>
        )}
      </div>

      {contacts.length === 0 && (
        <div className="p-8 text-center text-xs border border-dashed rounded-xl border-slate-300 dark:border-slate-700 text-slate-400">
          No personnel assignments appended yet.
        </div>
      )}
      {/*  bg-slate-50/50 dark:bg-slate-800/20 rounded-xl */}
      {contacts.map((c, idx) => (
        <div
          key={idx}
          className="relative rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between font-medium px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">Contact {idx + 1}</span>

              {c.is_primary && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  Primary
                </span>
              )}
            </div>
            {!isReadonly && (
              <button
                type="button"
                onClick={() =>
                  setContacts(contacts.filter((_, i) => i !== idx))
                }
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
              >
                ✕
              </button>
            )}
          </div>
          {/* Body */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-3 p-4">
            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Contact Name *
              </label>
              <input
                type="text"
                value={c.name}
                disabled={isReadonly}
                onChange={(e) => updateContactRow(idx, "name", e.target.value)}
                className={getInputClass(`contacts.${idx}.name`)}
                // className={`col-span-2 p-2 rounded text-xs border ${
                //   errors[`contacts.${idx}.name`]
                //     ? "border-red-500"
                //     : "border-slate-300 dark:border-slate-700"
                // } dark:bg-slate-900`}
                // className={`w-full border p-2 rounded text-xs bg-white dark:bg-slate-900 ${errors[`contacts.${idx}.name`] ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
              />
              {errors[`contacts.${idx}.name`] && (
                <p className="text-red-500 text-[11px] mt-0.5">
                  {errors[`contacts.${idx}.name`]}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Job Title
              </label>
              <input
                type="text"
                value={c.job_title || ""}
                onChange={(e) =>
                  updateContactRow(idx, "job_title", e.target.value)
                }
                disabled={isReadonly}
                className={getInputClass(`contacts.${idx}.job_title`, "col-span-2")}
                // className="col-span-2 p-2 rounded text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                // className="w-full border p-2 rounded text-xs border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                type="email"
                value={c.email || ""}
                disabled={isReadonly}
                onChange={(e) => updateContactRow(idx, "email", e.target.value)}
                className={getInputClass(`contacts.${idx}.email`)}
                // className="col-span-2 p-2 rounded text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                // className={`w-full border p-2 rounded text-xs bg-white dark:bg-slate-900 ${errors[`contacts.${idx}.email`] ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
              />
              {errors[`contacts.${idx}.email`] && (
                <p className="text-red-500 text-[11px] mt-0.5">
                  {errors[`contacts.${idx}.email`]}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Phone
              </label>
              <input
                type="text"
                value={c.phone || ""}
                disabled={isReadonly}
                onChange={(e) => updateContactRow(idx, "phone", e.target.value)}
                className={getInputClass(`contacts.${idx}.phone`, "col-span-2")}
                // className="col-span-2 p-2 rounded text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                // className="w-full border p-2 rounded text-xs border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Mobile
              </label>
              <input
                type="text"
                value={c.mobile || ""}
                onChange={(e) =>
                  updateContactRow(idx, "mobile", e.target.value)
                }
                disabled={isReadonly}
                className={getInputClass(`contacts.${idx}.mobile`, "col-span-2")}
                // className="col-span-2 p-2 rounded text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                // className="w-full border p-2 rounded text-xs border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Mark as Primary
              </label>
              <div className="col-span-2">
                <div className="flex flex-wrap gap-4 text-xs font-medium p-2 w-8">
                  <input
                    type="checkbox"
                    checked={!!c.is_primary}
                    disabled={isReadonly}
                    onChange={() =>
                      setContacts(
                        contacts.map((contact, i) => ({
                          ...contact,
                          is_primary: i === idx,
                        })),
                      )
                    }
                    className={`w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 ${
                      isReadonly ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="xl:col-span-2 grid grid-cols-6 gap-3 items-start">
              <label className="text-xs font-medium col-span-1 pt-2">
                Notes
              </label>

              <textarea
                rows={4}
                disabled={isReadonly}
                value={c.notes || ""}
                onChange={(e) => updateContactRow(idx, "notes", e.target.value)}
                className={getInputClass(`contacts.${idx}.notes`, "col-span-5")}
                // className="col-span-5 p-2 rounded text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
