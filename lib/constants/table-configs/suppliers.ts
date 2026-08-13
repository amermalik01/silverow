// lib/constants/table-configs/suppliers.ts

import { ColumnConfig } from "@/types/table";

export const suppliersConfig: ColumnConfig[] = [
  {
    columnKey: "supplier_no",
    label: "Supplier No.",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 1,
    columnWidth: 130,
  },
  {
    columnKey: "name",
    label: "Supplier Name",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 2,
    columnWidth: 220,
  },
  {
    columnKey: "country",
    label: "Country",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 3,
    columnWidth: 140,
  },
  {
    columnKey: "actions",
    label: "Actions",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 4,
    columnWidth: 100,
  },
];