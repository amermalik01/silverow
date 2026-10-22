// lib/validations/price-list.schema.ts

import { z } from "zod";

const numericInput = z.coerce.number().finite();

const requiredNumber = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === ""
      ? undefined
      : value,
  z.coerce.number({
    error: "Enter a valid number",
  }).finite(),
);

// const positiveQuantity = requiredNumber.gt(
//   0,
//   "Quantity must be greater than zero",
// );

// const nonNegativePrice = requiredNumber.min(
//   0,
//   "Price cannot be negative",
// );

const uuid = z.string().uuid();

const volumeDiscountSchema = z
  .object({
    id: uuid.optional(),
    min_order_qty: numericInput.gt(
      0,
      "Minimum quantity must be greater than zero",
    ),
    discount_type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
    discount_value: numericInput.min(0, "Discount cannot be negative"),
    discounted_price: numericInput.min(
      0,
      "Discounted price cannot be negative",
    ),
  })
  .superRefine((tier, ctx) => {
    if (tier.discount_type === "PERCENTAGE" && tier.discount_value > 100) {
      ctx.addIssue({
        code: "custom",
        path: ["discount_value"],
        message: "Percentage discount cannot exceed 100%",
      });
    }
  });

const priceListItemSchema = z
  .object({
    id: uuid.optional(),
    item_id: uuid,
    item_code: z.string().optional(),
    name: z.string().optional(),
    uom_id: uuid,
    uom_name: z.string().optional(),
    standard_price: numericInput.min(0),
    offered_price: numericInput.min(0),
    min_order_qty: numericInput.min(0),
    max_order_qty: numericInput
      .nullable()
      .optional()
      .transform((value) => value ?? ""),
    has_volume_discount: z.boolean(),
    volume_discounts: z.array(volumeDiscountSchema),
  })
  .superRefine((item, ctx) => {
    if (
      item.max_order_qty !== "" &&
      Number(item.max_order_qty) > 0 &&
      Number(item.max_order_qty) < Number(item.min_order_qty)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["max_order_qty"],
        message: "Maximum quantity cannot be less than minimum quantity",
      });
    }

    if (!item.has_volume_discount && item.volume_discounts.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["volume_discounts"],
        message: "Remove discount tiers or enable volume discounts",
      });
    }

    if (item.has_volume_discount && item.volume_discounts.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["volume_discounts"],
        message: "Add at least one volume discount tier",
      });
    }

    const tiers = [...item.volume_discounts].sort(
      (a, b) => Number(a.min_order_qty) - Number(b.min_order_qty),
    );

    for (let i = 1; i < tiers.length; i++) {
      if (
        Number(tiers[i].min_order_qty) <= Number(tiers[i - 1].min_order_qty)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["volume_discounts"],
          message: "Volume discount quantities must be unique and increasing",
        });
        break;
      }
    }

    for (const tier of item.volume_discounts) {
      if (
        tier.discount_type === "PERCENTAGE" &&
        Number(tier.discounted_price) > Number(item.offered_price)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["volume_discounts"],
          message: "Discounted price cannot exceed the offered price",
        });
        break;
      }
    }
  });

export const priceListSchema = z
  .object({
    id: uuid.optional(),
    party_id: uuid.optional(),
    name: z.string().trim().min(1, "Price list name is required"),
    list_type: z.enum(["SALES", "PURCHASE"]),
    start_date: z.iso.date("Invalid start date"),
    end_date: z.iso.date("Invalid end date"),
    currency_id: uuid,
    offer_method: z.string().trim().min(1, "Offer method is required"),
    salesperson_id: uuid.nullable().optional(),
    salesperson_name: z.string().optional(),
    items: z.array(priceListItemSchema),
  })
  .superRefine((list, ctx) => {
    if (list.start_date > list.end_date) {
      ctx.addIssue({
        code: "custom",
        path: ["end_date"],
        message: "End date must be on or after the start date",
      });
    }

    const seenItems = new Set<string>();

    for (const item of list.items) {
      const key = `${item.item_id}:${item.uom_id}`;

      if (seenItems.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["items"],
          message: `Duplicate item/UOM in price list: ${item.item_code || item.item_id}`,
        });
      }

      seenItems.add(key);
    }
  });

export const priceListsSchema = z.array(priceListSchema);

export type ValidatedPriceList = z.infer<typeof priceListSchema>;
