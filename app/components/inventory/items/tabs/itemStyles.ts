// app/components/inventory/items/tabs/itemStyles.ts

/* Shared look for the item record tabs — same theme as the parties tabs
   (General / Finance / Price List / Rebates). */

export const cardClass =
  "rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#11161D] p-4 shadow-2xs transition-colors";

export const sectionHeaderClass =
  "flex items-center gap-2 text-sm font-semibold text-black dark:text-slate-100 mb-3.5";

export const sectionIconClass =
  "text-emerald-800 dark:text-emerald-400 text-3xl";

/** Label + field row, capped at a medium width. */
export const fieldRowClass =
  "grid grid-cols-12 gap-x-3 gap-y-1 items-center max-w-[520px]";
export const fieldLabelClass =
  "col-span-4 text-sm font-medium text-black dark:text-slate-400";
export const fieldInputClass = "col-span-8 min-w-0";

export const errorTextClass = "text-red-500 text-[11px] mt-0.5";

const inputBase =
  "w-full border px-2.5 py-1.5 rounded-lg text-sm outline-none transition-colors duration-150";

/** Input / select class — read-only and error states match the parties tabs. */
export const getInputClass = (hasError = false, disabled = false) => {
  if (disabled) {
    return `${inputBase} bg-slate-100/80 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-black dark:text-slate-300 cursor-not-allowed`;
  }
  return hasError
    ? `${inputBase} border-red-500 bg-red-50/20 text-black dark:text-white focus:border-red-500 focus:ring-1 focus:ring-red-500`
    : `${inputBase} border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-black dark:text-slate-100 focus:border-emerald-600 dark:focus:border-emerald-500 focus:ring-1 focus:ring-emerald-600 dark:focus:ring-emerald-500`;
};

/** Input with a unit suffix ("kg", "cm"): wrapper + inner input. */
export const getSuffixWrapClass = (disabled = false) =>
  `flex items-center rounded-lg border overflow-hidden transition-colors ${
    disabled
      ? "bg-slate-100/80 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800"
      : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600"
  }`;
export const suffixInputClass =
  "w-full min-w-0 px-2.5 py-1.5 text-sm bg-transparent border-none outline-none text-black dark:text-slate-100 disabled:cursor-not-allowed";
export const suffixUnitClass =
  "px-2.5 self-stretch flex items-center text-[11px] font-semibold text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60";

export const tableHeadRowClass =
  "border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold text-black dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/40";

export const primaryButtonClass =
  "inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const pillClass =
  "rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400";
