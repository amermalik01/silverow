// lib/constants/table-configs/journals.ts

import { ColumnConfig } from "@/types/table";

export const journalsColumnsConfig: ColumnConfig[] = [
  {
    columnKey: "entry_no",
    label: "Code / Ref",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 1,
    columnWidth: 120,
  },
  {
    columnKey: "entry_date",
    label: "Entry Date",
    dataType: "date",
    isVisible: true,
    isPinned: false,
    columnOrder: 2,
    columnWidth: 100,
  },
  {
    columnKey: "posted_at",
    label: "Posted Date",
    dataType: "date",
    isVisible: true,
    isPinned: false,
    columnOrder: 3,
    columnWidth: 100,
  },
  {
    columnKey: "posted_by",
    label: "Posted By",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 4,
    columnWidth: 100,
  },
  {
    columnKey: "is_posted",
    label: "Status",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 5,
    columnWidth: 100,
  },
];
