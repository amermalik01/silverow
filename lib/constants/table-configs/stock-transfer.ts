// lib/constants/table-configs/stock-transfer.ts

import { ColumnConfig } from "@/types/table";

/**
 * Default Stock Transfer Orders table configuration.
 *
 * moduleKey:
 *   stock_transfer_orders
 *
 * Keep the columnKey values synchronized with:
 * StockTransferRecord and transferStockCellRenderers.tsx
 */
export const stockTransferColumnsConfig: ColumnConfig[] = [
  {
    columnKey: "transfer_no",
    label: "Transfer No.",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 1,
    columnWidth: 130,
  },

  {
    columnKey: "transfer_date",
    label: "Transfer Date",
    dataType: "date",
    isVisible: true,
    isPinned: false,
    columnOrder: 2,
    columnWidth: 110,
  },

  {
    columnKey: "warehouse_from_name",
    label: "Source Warehouse",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 3,
    columnWidth: 170,
  },

  {
    columnKey: "warehouse_to_name",
    label: "Destination Warehouse",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 4,
    columnWidth: 170,
  },

  {
    columnKey: "in_transit_code",
    label: "Transit Method",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 5,
    columnWidth: 130,
  },

  {
    columnKey: "shipping_charge",
    label: "Freight Cost",
    dataType: "number",
    isVisible: true,
    isPinned: false,
    columnOrder: 6,
    columnWidth: 120,
  },

  {
    columnKey: "is_posted",
    label: "Status",
    dataType: "text",
    isVisible: true,
    isPinned: false,
    columnOrder: 7,
    columnWidth: 100,
  },

  {
    columnKey: "posted_at",
    label: "Posted Date",
    dataType: "date",
    isVisible: false,
    isPinned: false,
    columnOrder: 8,
    columnWidth: 110,
  },

  {
    columnKey: "posted_by",
    label: "Posted By",
    dataType: "text",
    isVisible: false,
    isPinned: false,
    columnOrder: 9,
    columnWidth: 120,
  },

  {
    columnKey: "description",
    label: "Description",
    dataType: "text",
    isVisible: false,
    isPinned: false,
    columnOrder: 10,
    columnWidth: 220,
  },
];
