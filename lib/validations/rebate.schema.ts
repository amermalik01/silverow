// lib/validations/rebate.schema.ts

import { z } from "zod";

const uuid = z.uuid();

const money = z.coerce.number().finite().nonnegative();

const rebateCategorySchema = z.object({
  id: uuid.optional(),
  category_id: uuid,
});

const rebateItemSchema = z.object({
  id: uuid.optional(),
  item_id: uuid,
  uom_id: uuid.nullable().optional(),
});

const rebateTierSchema = z.object({
  id: uuid.optional(),
  min_quantity: z.coerce.number().positive(),
  max_quantity: z.coerce.number().positive().nullable().optional(),
  rebate_value: money,
});

export const rebateSchema = z
  .object({
    id: uuid.optional(),
    party_id: uuid,

    name: z.string().trim().min(1),
    rebate_type: z.enum(["SALES", "PURCHASE"]),

    scope: z.enum(["UNIVERSAL", "CATEGORY", "ITEM"]),

    calculation_method: z.enum(["FLAT", "TIERED"]).default("FLAT"),

    price_type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),

    rebate_value: money,

    rebate_base: z.enum(["STANDARD_PRICE", "NET_PRICE"]).default("NET_PRICE"),

    settlement_method: z.enum(["IMMEDIATE", "DEFERRED"]).default("DEFERRED"),

    currency_id: uuid,

    start_date: z.iso.date(),
    end_date: z.iso.date(),

    priority: z.coerce.number().int().nonnegative().default(100),

    is_stackable: z.boolean().default(false),

    notes: z.string().nullable().optional(),

    categories: z.array(rebateCategorySchema).default([]),

    items: z.array(rebateItemSchema).default([]),

    tiers: z.array(rebateTierSchema).default([]),
  })
  .superRefine((rebate, ctx) => {
    if (rebate.start_date > rebate.end_date) {
      ctx.addIssue({
        code: "custom",
        path: ["end_date"],
        message: "End date must follow start date",
      });
    }

    if (rebate.price_type === "PERCENTAGE" && rebate.rebate_value > 100) {
      ctx.addIssue({
        code: "custom",
        path: ["rebate_value"],
        message: "Rebate cannot exceed 100%",
      });
    }

    if (rebate.scope === "CATEGORY" && rebate.categories.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["categories"],
        message: "Select at least one category",
      });
    }

    if (rebate.scope === "ITEM" && rebate.items.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: "Select at least one item",
      });
    }

    if (
      rebate.scope === "UNIVERSAL" &&
      (rebate.categories.length > 0 || rebate.items.length > 0)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["scope"],
        message: "Universal rebate cannot have item or category restrictions",
      });
    }

    if (rebate.calculation_method === "TIERED" && rebate.tiers.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["tiers"],
        message: "Add at least one rebate tier",
      });
    }

    const seenCategories = new Set<string>();
    for (const category of rebate.categories) {
      if (seenCategories.has(category.category_id)) {
        ctx.addIssue({
          code: "custom",
          path: ["categories"],
          message: "Duplicate category selected",
        });
      }
      seenCategories.add(category.category_id);
    }

    const seenItems = new Set<string>();
    for (const item of rebate.items) {
      const key = `${item.item_id}:${item.uom_id ?? ""}`;
      if (seenItems.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["items"],
          message: "Duplicate item/UOM selected",
        });
      }
      seenItems.add(key);
    }
  });

export type ValidatedRebate = z.infer<typeof rebateSchema>;
