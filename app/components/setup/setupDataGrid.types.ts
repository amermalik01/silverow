// app/components/setup/setupDataGrid.types.ts

export type Field = {
  name: string;
  label?: string;
  type?: "text" | "select" | "number" | "hidden";
  options?: {
    value: string;
    label: string;
  }[];
  required?: boolean;
};

export type Column = {
  name: string;
  label: string;
  sortable?: boolean;
};

export type Row = Record<string, string | number | undefined>;

export type SortState = {
  field: string;
  direction: "asc" | "desc";
} | null;

export type SetupConfig = {
  title: string;
  api: string;
  fields: Field[];
  columns: Column[];
  defaultValues?: Record<string, string | number>;
};