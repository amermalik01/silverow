// app/config/setupConfig.ts

type Field = {
  name: string;
  label?: string;
  type?: "text" | "select" | "number" | "hidden";
  required?: boolean;
  options?: { value: string; label: string }[];
};

type Column = {
  name: string;
  label: string;
  sortable?: boolean;
};

export type SetupConfig = {
  title: string;
  api: string;
  fields: Field[];
  columns: Column[];
  defaultValues?: Record<string, string | number>;
};

export const setupConfig = {
  salesSegments: {
    title: "Sales Segments",
    api: "/api/setup/sales/segments?module=sales",
    fields: [
      {
        name: "name",
        label: "Name",
        required: true,
      },
      {
        name: "module",
        type: "hidden",
      },
    ],
    columns: [
      {
        name: "name",
        label: "Name",
        sortable: true,
      },
    ],
    defaultValues: {
      module: "sales",
    },
  } satisfies SetupConfig,

  purchasesSegments: {
    title: "Purchase Segments",
    api: "/api/setup/sales/segments?module=purchases",
    fields: [
      {
        name: "name",
        label: "Name",
        required: true,
      },
      {
        name: "module",
        type: "hidden",
      },
    ],
    columns: [
      {
        name: "name",
        label: "Name",
        sortable: true,
      },
    ],
    defaultValues: {
      module: "purchases",
    },
  } satisfies SetupConfig,

  purchasesClassification: {
    title: "Purchase Classification",
    api: "/api/setup/sales/classification?module=purchases",
    fields: [
      {
        name: "name",
        label: "Name",
        required: true,
      },
      {
        name: "module",
        type: "hidden",
      },
    ],
    columns: [
      {
        name: "name",
        label: "Name",
        sortable: true,
      },
    ],
    defaultValues: {
      module: "purchases",
    },
  } satisfies SetupConfig,

  salesTerritories: {
    title: "Sales Territories",
    api: "/api/setup/sales/territories",
    fields: [
      {
        name: "name",
        label: "Name",
        required: true,
      },
      {
        name: "module",
        type: "hidden",
      },
    ],
    columns: [
      {
        name: "name",
        label: "Name",
        sortable: true,
      },
    ],
    defaultValues: {
      module: "sales",
    },
  } satisfies SetupConfig,

  purchasesTerritories: {
    title: "Purchase Territories",
    api: "/api/setup/sales/territories?module=purchases",
    fields: [
      {
        name: "name",
        label: "Name",
        required: true,
      },
      {
        name: "module",
        type: "hidden",
      },
    ],
    columns: [
      {
        name: "name",
        label: "Name",
        sortable: true,
      },
    ],
    defaultValues: {
      module: "purchases",
    },
  } satisfies SetupConfig,

  salesBuyingGroups: {
    title: "Sales Buying Groups",
    api: "/api/setup/sales/buying_groups",
    fields: [
      {
        name: "name",
        label: "Name",
        required: true,
      },
    ],
    columns: [
      {
        name: "name",
        label: "Name",
        sortable: true,
      },
    ],
  } satisfies SetupConfig,

  salesCreditRating: {
    title: "Sales Credit Rating",
    api: "/api/setup/sales/credit_ratings",
    fields: [
      {
        name: "name",
        label: "Name",
        required: true,
      },
    ],
    columns: [
      {
        name: "name",
        label: "Name",
        sortable: true,
      },
    ],
  } satisfies SetupConfig,

  

  salesOwnershipType: {
    title: "Ownership Type",
    api: "/api/setup/sales/ownership_type",
    fields: [
      {
        name: "name",
        label: "Name",
        required: true,
      },
    ],
    columns: [
      {
        name: "name",
        label: "Name",
        sortable: true,
      },
    ],
  } satisfies SetupConfig,

  salesOrderSource: {
    title: "Sales Order Source",
    api: "/api/setup/sales/order_sources",
    fields: [
      {
        name: "name",
        label: "Name",
        required: true,
      },
    ],
    columns: [
      {
        name: "name",
        label: "Name",
        sortable: true,
      },
    ],
  } satisfies SetupConfig,

  salesSource: {
    title: "Sales Source of CRM",
    api: "/api/setup/sales/sources",
    fields: [
      {
        name: "name",
        label: "Name",
        required: true,
      },
    ],
    columns: [
      {
        name: "name",
        label: "Name",
        sortable: true,
      },
    ],
  } satisfies SetupConfig,

  salesType: {
    title: "Type",
    api: "/api/setup/sales/type",
    fields: [
      {
        name: "name",
        label: "Name",
        required: true,
      },
    ],
    columns: [
      {
        name: "name",
        label: "Name",
        sortable: true,
      },
    ],
  } satisfies SetupConfig,

  salesStatus: {
    title: "Status",
    api: "/api/setup/sales/status",
    fields: [
      {
        name: "name",
        label: "Name",
        required: true,
      },
    ],
    columns: [
      {
        name: "name",
        label: "Name",
        sortable: true,
      },
    ],
  } satisfies SetupConfig,

  salesClassification: {
    title: "Classification",
    api: "/api/setup/sales/classification",
    fields: [
      {
        name: "name",
        label: "Name",
        required: true,
      },
    ],
    columns: [
      {
        name: "name",
        label: "Name",
        sortable: true,
      },
    ],
  } satisfies SetupConfig,
  

  salesOrderStages: {
    title: "Sales Order Stages",
    api: "/api/setup/sales/order_stages",
    fields: [{ name: "name", label: "Stage Name", required: true, type: "text" }],
    columns: [{ name: "name", label: "Stage Name", sortable: false }],
  } satisfies SetupConfig,

  creditNoteStages: {
    title: "Credit Note Stages",
    api: "/api/setup/sales/credit_note_stages",
    fields: [{ name: "name", label: "Stage Name", required: true, type: "text" }],
    columns: [{ name: "name", label: "Stage Name", sortable: false }],
  } satisfies SetupConfig,

  purchaseOrderStages: {
    title: "Purchase Order Stages",
    api: "/api/setup/sales/purchase_order_stages",
    fields: [{ name: "name", label: "Stage Name", required: true, type: "text" }],
    columns: [{ name: "name", label: "Stage Name", sortable: false }],
  } satisfies SetupConfig,

  debitNoteStages: {
    title: "Debit Note Stages",
    api: "/api/setup/sales/debit_note_stages",
    fields: [{ name: "name", label: "Stage Name", required: true, type: "text" }],
    columns: [{ name: "name", label: "Stage Name", sortable: false }],
  } satisfies SetupConfig,

  

  purchasesSellingGroups: {
    title: "Purchase Selling Groups",
    api: "/api/setup/sales/selling_groups",
    fields: [
      {
        name: "name",
        label: "Name",
        required: true,
      },
    ],
    columns: [
      {
        name: "name",
        label: "Name",
        sortable: true,
      },
    ],
  } satisfies SetupConfig,
};
