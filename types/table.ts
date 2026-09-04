// types/table.ts

export type DataType = "text" | "date" | "number" | "select";

export interface SelectOption {
  label: string;
  value: string;
}

export interface ColumnConfig {
  columnKey: string;
  label: string;
  dataType: DataType;
  isVisible: boolean;
  isPinned: boolean;
  columnOrder: number;
  columnWidth: number;
  headerColor?: string;
  options?: SelectOption[];
  optionSource?: string;
}

export interface FilterItem {
  type: DataType;
  value?: string | number;
  from?: string | number;
  to?: string | number;
}

export interface FilterValue {
  [key: string]: FilterItem;
}

export interface FetchParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortColumn?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc" | "ASC" | "DESC";
  filters?: FilterValue;
}

export interface FetchResponse<T> {
  data: T[];
  totalRecords: number;
}

export interface DataTableColumnConfigApi {
  get: (moduleKey: string) => Promise<ColumnConfig[]>;
  save: (moduleKey: string, configs: ColumnConfig[]) => Promise<void>;
  reset: (moduleKey: string) => Promise<ColumnConfig[]>;
}
export interface DataTableProps<T> {
  moduleKey: string;
  fetchApi: (params: FetchParams) => Promise<FetchResponse<T>>;
  columnsConfigApi: DataTableColumnConfigApi;
  renderRowCell?: (row: T, columnKey: string) => React.ReactNode;

  enableRowSelection?: boolean;

  onSelectionChange?: (selectedIds: Array<string | number>) => void;
  rowKey?: keyof T | string;
}
export interface DataTableSelection<T> {
  enabled?: boolean;
  onSelectionChange?: (rows: T[]) => void;
}

// export interface FetchParams {
//   page: number;
//   pageSize: number;
//   search?: string;
//   sortBy?: string;
//   sortOrder?: "asc" | "desc";
//   filters?: FilterValue;
// }
