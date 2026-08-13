// types/table.ts

export type DataType = "text" | "date" | "number" | "select";

export interface ColumnConfig {
  columnKey: string;
  label: string;
  dataType: DataType;
  isVisible: boolean;
  isPinned: boolean;
  columnOrder: number;
  columnWidth: number;
  headerColor?: string;
  options?: { label: string; value: string }[]; // For select inputs
  optionSource?: string;
}

export interface FilterValue {
  [key: string]: {
    type: DataType;
    value?: string | number;
    from?: string | number;
    to?: string | number;
  };
}

export interface FetchParams {
  page: number;
  pageSize: number;
  filters: FilterValue;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface FetchResponse<T> {
  data: T[];
  totalRecords: number;
}
