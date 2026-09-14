// lib/validations/sales-quote.schema.ts

import { z } from "zod";

const looseString = z.preprocess(
  (val) => {
    if (
      val === "" ||
      val === null ||
      val === undefined ||
      val === "undefined"
    ) {
      return undefined;
    }

    return String(val);
  },
  z.string().optional(),
);

const looseNumber = z.preprocess(
  (val) => {
    if (
      val === "" ||
      val === null ||
      val === undefined
    ) {
      return 0;
    }

    const parsed = Number(val);

    return Number.isNaN(parsed) ? 0 : parsed;
  },
  z.number().default(0),
);

const looseUuid = z.preprocess(
  (val) => {
    if (
      val === "" ||
      val === null ||
      val === undefined ||
      val === "undefined"
    ) {
      return undefined;
    }

    return val;
  },
  z.string().uuid().optional(),
);

const requiredUuid = z.string().uuid(
  "A valid selection is required",
);

const requiredDate = z
  .string()
  .min(1, "Date is required");


export const SalesQuoteAddressSchema = z.object({
  id: looseUuid,
  company_id: looseUuid,
  sales_quote_id: looseUuid,

  address_type: z.enum([
    "primary",
    "billing",
    "shipping",
  ]),

  contact_name: looseString.superRefine(
    (val, ctx) => {
      if (val && val.length > 150) {
        ctx.addIssue({
          code: "custom",
          message:
            "String must contain at most 150 character(s)",
        });
      }
    },
  ),

  name: looseString.superRefine(
    (val, ctx) => {
      if (val && val.length > 255) {
        ctx.addIssue({
          code: "custom",
          message:
            "String must contain at most 255 character(s)",
        });
      }
    },
  ),

  company_name: looseString,

  attention: looseString,

  contact_person: looseString,

  phone: looseString.superRefine(
    (val, ctx) => {
      if (val && val.length > 100) {
        ctx.addIssue({
          code: "custom",
          message:
            "String must contain at most 100 character(s)",
        });
      }
    },
  ),

  email: looseString.superRefine(
    (val, ctx) => {
      if (
        val &&
        val !== "undefined" &&
        !/^\S+@\S+\.\S+$/.test(val)
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Invalid email structure",
        });
      }
    },
  ),

  address_1: looseString,

  address_2: looseString,

  city: looseString,

  state: looseString,

  county: looseString,

  postcode: looseString,

  country: looseString,
});

/**
 * ---------------------------------------------------------
 * Sales Quote Line Schema
 * ---------------------------------------------------------
 */

export const SalesQuoteLineSchema = z
  .object({
    _key: looseString,

    id: looseUuid,

    company_id: looseUuid,

    sales_quote_id: looseUuid,

    line_no: z.coerce
      .number()
      .int()
      .min(0)
      .optional(),

    line_type: z.enum([
      "ITEM",
      "GL_ACCOUNT",
      "COMMENT",
    ]),

    /**
     * ITEM
     */
    item_id: looseUuid,

    item_code: looseString,

    item_name: looseString,

    /**
     * GL ACCOUNT
     */
    gl_account_id: looseUuid,

    account_code: looseString,

    account_name: looseString,

    description: z
      .string()
      .max(500)
      .optional()
      .nullable(),

    /**
     * Warehouse.
     */
    warehouse_id: looseUuid,

    warehouse_code: looseString,

    warehouse_name: looseString,

    warehouse_location_id: looseUuid,

    /**
     * UOM.
     */
    uom_id: looseUuid,

    uom_name: looseString,

    /**
     * Quantity.
     */
    quantity: z.coerce
      .number()
      .min(
        0,
        "Quantity cannot be negative",
      ),

    /**
     * Conversion tracking.
     */
    quantity_converted: z.coerce
      .number()
      .min(
        0,
        "Converted quantity cannot be negative",
      )
      .optional()
      .nullable(),

    quantity_remaining: z.coerce
      .number()
      .min(
        0,
        "Remaining quantity cannot be negative",
      )
      .optional()
      .nullable(),

    /**
     * Pricing.
     */
    unit_price: looseNumber,

    discount_type: z
      .enum([
        "PERCENT",
        "FIXED",
      ])
      .optional()
      .nullable(),

    discount_value: looseNumber,

    discount_percent: looseNumber,

    discount_amount: looseNumber,

    original_amount: z
      .union([
        z.string(),
        z.number(),
      ])
      .optional()
      .nullable(),

    /**
     * VAT.
     */
    vat_business_posting_group_id:
      looseUuid,

    vat_product_posting_group_id:
      looseUuid,

    vat_percent: looseNumber,

    vat_amount: looseNumber,

    /**
     * Amounts.
     */
    line_amount: looseNumber,

    net_amount: looseNumber,

    gross_amount: looseNumber,

    /**
     * Conversion status.
     */
    line_status: z
      .enum([
        "OPEN",
        "PARTIALLY_CONVERTED",
        "FULLY_CONVERTED",
        "CANCELLED",
      ])
      .optional(),

    /**
     * GL routing.
     */
    purchase_gl_id: looseUuid,

    sales_gl_id: looseUuid,

    inventory_gl_id: looseUuid,

    /**
     * Soft delete.
     */
    is_deleted: z
      .boolean()
      .optional()
      .default(false),

    deleted_at: looseString,

    deleted_by: looseUuid,

    created_at: looseString,

    updated_at: looseString,
  })
  .superRefine((line, ctx) => {
    /**
     * -----------------------------------------------------
     * ITEM validation
     * -----------------------------------------------------
     */
    if (line.line_type === "ITEM") {
      if (!line.item_id) {
        ctx.addIssue({
          code: "custom",
          message:
            "Item selection is required",
          path: ["item_id"],
        });
      }

      if (!line.uom_id) {
        ctx.addIssue({
          code: "custom",
          message:
            "Unit of measure is required",
          path: ["uom_id"],
        });
      }

      if (line.quantity <= 0) {
        ctx.addIssue({
          code: "custom",
          message:
            "Quantity must be greater than 0",
          path: ["quantity"],
        });
      }

      /**
       * Warehouse is optional because not every
       * ERP quote needs warehouse allocation.
       */
    }

    /**
     * -----------------------------------------------------
     * GL ACCOUNT validation
     * -----------------------------------------------------
     */
    if (
      line.line_type === "GL_ACCOUNT" &&
      !line.gl_account_id
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "GL Account selection is required",
        path: ["gl_account_id"],
      });
    }

    /**
     * -----------------------------------------------------
     * COMMENT validation
     * -----------------------------------------------------
     */
    if (line.line_type === "COMMENT") {
      if (
        !line.description ||
        line.description.trim().length === 0
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "Comment description is required",
          path: ["description"],
        });
      }
    }

    /**
     * -----------------------------------------------------
     * Conversion quantity validation
     * -----------------------------------------------------
     */
    const converted =
      line.quantity_converted ?? 0;

    if (converted > line.quantity) {
      ctx.addIssue({
        code: "custom",
        message:
          "Converted quantity cannot exceed quoted quantity",
        path: ["quantity_converted"],
      });
    }

    /**
     * Remaining quantity should never exceed
     * original quantity.
     */
    const remaining =
      line.quantity_remaining ??
      Math.max(
        0,
        line.quantity - converted,
      );

    if (remaining > line.quantity) {
      ctx.addIssue({
        code: "custom",
        message:
          "Remaining quantity cannot exceed quoted quantity",
        path: ["quantity_remaining"],
      });
    }

    /**
     * -----------------------------------------------------
     * Discount validation
     * -----------------------------------------------------
     */
    if (
      line.discount_type === "PERCENT" &&
      (line.discount_value ?? 0) > 100
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Percentage discount cannot exceed 100%",
        path: ["discount_value"],
      });
    }

    if (
      (line.discount_value ?? 0) < 0
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Discount cannot be negative",
        path: ["discount_value"],
      });
    }

    /**
     * -----------------------------------------------------
     * VAT validation
     * -----------------------------------------------------
     */
    if ((line.vat_percent ?? 0) < 0) {
      ctx.addIssue({
        code: "custom",
        message:
          "VAT percentage cannot be negative",
        path: ["vat_percent"],
      });
    }
  });

/**
 * ---------------------------------------------------------
 * Sales Quote Header Schema
 * ---------------------------------------------------------
 */

export const SalesQuoteSchema = z
  .object({
    id: looseUuid,

    company_id: looseUuid,

    quote_no: looseString,

    /**
     * Customer is mandatory unless the application
     * explicitly supports anonymous quotations.
     */
    customer_id: requiredUuid,

    customer_no: looseString,

    customer_name: looseString,

    customer_posting_group_id:
      looseUuid,

    vat_business_posting_group_id:
      looseUuid,

    stage_id: looseUuid,

    stage_name: looseString,

    current_stage: looseString,

    /**
     * Currency.
     */
    currency_id: looseUuid,

    currency_code: looseString,

    exchange_rate: z.coerce
      .number()
      .positive(
        "Exchange rate must be greater than 0",
      )
      .default(1),

    /**
     * Dates.
     */
    quote_date: requiredDate,

    valid_from: looseString,

    valid_until: looseString,

    requested_delivery_date:
      looseString,

    /**
     * Salesperson.
     */
    salesperson_id: looseUuid,

    salesperson: looseString,

    reference: looseString,

    customer_reference:
      looseString,

    source_of_quote:
      looseString,

    opportunity_id: looseUuid,

    contact_id: looseUuid,

    /**
     * Payment.
     */
    payment_terms_id: looseUuid,

    payment_terms: looseString,

    payment_method_id: looseUuid,

    payment_method: looseString,

    receivable_bank_id:
      looseUuid,

    receivable_bank:
      looseString,

    /**
     * Shipping.
     */
    shipment_method_id:
      looseUuid,

    shipment_method:
      looseString,

    shipping_agent:
      looseString,

    warehouse_id:
      looseUuid,

    warehouse_name:
      looseString,

    /**
     * Totals.
     */
    subtotal: looseNumber,

    discount_amount:
      looseNumber,

    freight_charges:
      looseNumber,

    finance_charges:
      looseNumber,

    insurance_charges:
      looseNumber,

    vat_amount:
      looseNumber,

    total_amount:
      looseNumber,

    /**
     * Lifecycle.
     */
    status: z
      .enum([
        "draft",
        "sent",
        "accepted",
        "rejected",
        "expired",
        "converted",
        "cancelled",
      ])
      .optional(),

    conversion_status:
      z
        .enum([
          "NOT_CONVERTED",
          "PARTIALLY_CONVERTED",
          "FULLY_CONVERTED",
        ])
        .optional(),

    is_posted:
      z.boolean().optional(),

    is_expired:
      z.boolean().optional(),

    is_accepted:
      z.boolean().optional(),

    is_rejected:
      z.boolean().optional(),

    is_cancelled:
      z.boolean().optional(),

    is_converted:
      z.boolean().optional(),

    /**
     * Acceptance.
     */
    accepted_at:
      looseString,

    accepted_by:
      looseUuid,

    /**
     * Rejection.
     */
    rejected_at:
      looseString,

    rejected_by:
      looseUuid,

    rejection_reason:
      looseString,

    /**
     * Cancellation.
     */
    cancelled_at:
      looseString,

    cancelled_by:
      looseUuid,

    cancellation_reason:
      looseString,

    /**
     * Expiration.
     */
    expired_at:
      looseString,

    /**
     * Conversion.
     */
    converted_at:
      looseString,

    converted_by:
      looseUuid,

    /**
     * Customer contact.
     */
    anonymous_customer:
      z.boolean().optional(),

    email: looseString.superRefine(
      (val, ctx) => {
        if (
          val &&
          !/^\S+@\S+\.\S+$/.test(val)
        ) {
          ctx.addIssue({
            code: "custom",
            message:
              "Invalid email structure",
          });
        }
      },
    ),

    contact:
      looseString,

    phone:
      looseString,

    /**
     * Notes.
     */
    notes:
      looseString,

    internal_notes:
      looseString,

    terms_and_conditions:
      looseString,

    footer_text:
      looseString,

    reason:
      looseString,

    /**
     * Optimistic locking.
     */
    version:
      z.coerce
        .number()
        .int()
        .min(1)
        .optional(),

    /**
     * Audit.
     */
    created_by:
      looseUuid,

    updated_by:
      looseUuid,

    created_at:
      looseString,

    updated_at:
      looseString,

    posted_at:
      looseString,
  })
  .superRefine((quote, ctx) => {
    /**
     * -----------------------------------------------------
     * Date validation
     * -----------------------------------------------------
     */

    if (
      quote.valid_from &&
      quote.valid_until
    ) {
      const from = new Date(
        quote.valid_from,
      );

      const until = new Date(
        quote.valid_until,
      );

      if (
        !Number.isNaN(from.getTime()) &&
        !Number.isNaN(until.getTime()) &&
        until < from
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "Valid until date cannot be earlier than valid from date",
          path: ["valid_until"],
        });
      }
    }

    /**
     * Quote date cannot be after valid-until.
     */
    if (
      quote.quote_date &&
      quote.valid_until
    ) {
      const quoteDate = new Date(
        quote.quote_date,
      );

      const validUntil = new Date(
        quote.valid_until,
      );

      if (
        !Number.isNaN(
          quoteDate.getTime(),
        ) &&
        !Number.isNaN(
          validUntil.getTime(),
        ) &&
        validUntil < quoteDate
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "Valid until date cannot be earlier than quote date",
          path: ["valid_until"],
        });
      }
    }

    /**
     * -----------------------------------------------------
     * Status consistency
     * -----------------------------------------------------
     */

    if (
      quote.status === "accepted" &&
      quote.is_rejected
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "An accepted quote cannot be marked as rejected",
        path: ["status"],
      });
    }

    if (
      quote.status === "rejected" &&
      !quote.rejection_reason
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Rejection reason is required",
        path: ["rejection_reason"],
      });
    }

    if (
      quote.status === "cancelled" &&
      !quote.cancellation_reason
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Cancellation reason is required",
        path: ["cancellation_reason"],
      });
    }
  });

/**
 * ---------------------------------------------------------
 * Quote → Sales Order Conversion Schemas
 * ---------------------------------------------------------
 */

export const SalesQuoteConversionRequestLineSchema =
  z.object({
    sales_quote_line_id:
      z.string().uuid(
        "Quote line selection is required",
      ),

    quantity: z.coerce
      .number()
      .positive(
        "Conversion quantity must be greater than 0",
      ),
  });

export const SalesQuoteConversionRequestSchema =
  z.object({
    sales_quote_id:
      z.string().uuid(
        "Sales quote selection is required",
      ),

    lines: z
      .array(
        SalesQuoteConversionRequestLineSchema,
      )
      .min(
        1,
        "At least one quote line must be selected for conversion",
      ),
  });

/**
 * ---------------------------------------------------------
 * Quote → Order Conversion Line
 * ---------------------------------------------------------
 */

export const SalesQuoteConversionLineSchema =
  z.object({
    id: looseUuid,

    company_id: looseUuid,

    sales_quote_id:
      z.string().uuid(),

    sales_quote_line_id:
      z.string().uuid(),

    sales_order_id:
      z.string().uuid(),

    sales_order_line_id:
      z.string().uuid(),

    quantity_converted:
      z.coerce
        .number()
        .positive(),

    converted_at:
      looseString,

    converted_by:
      looseUuid,

    created_at:
      looseString,
  });

/**
 * ---------------------------------------------------------
 * Quote → Order Conversion Header
 * ---------------------------------------------------------
 */

export const SalesQuoteOrderConversionSchema =
  z.object({
    id: looseUuid,

    company_id: looseUuid,

    sales_quote_id:
      z.string().uuid(),

    sales_order_id:
      z.string().uuid(),

    conversion_no:
      z.coerce
        .number()
        .int()
        .positive()
        .optional(),

    conversion_date:
      looseString,

    converted_by:
      looseUuid,

    notes:
      looseString,

    created_at:
      looseString,
  });

/**
 * ---------------------------------------------------------
 * Complete Sales Quote Payload
 * ---------------------------------------------------------
 */

export const SalesQuotePayloadSchema =
  z.object({
    quote:
      SalesQuoteSchema,

    lines:
      z
        .array(SalesQuoteLineSchema)
        .min(
          1,
          "Sales quote must contain at least 1 line",
        ),

    primary_address:
      SalesQuoteAddressSchema
        .nullable()
        .optional(),

    billing_address:
      SalesQuoteAddressSchema
        .nullable()
        .optional(),

    shipping_address:
      SalesQuoteAddressSchema
        .nullable()
        .optional(),

    allow_empty_lines:
      z.boolean().optional(),
  });

/**
 * ---------------------------------------------------------
 * Inferred Types
 * ---------------------------------------------------------
 */

export type SalesQuoteInput =
  z.infer<typeof SalesQuoteSchema>;

export type SalesQuoteAddressInput =
  z.infer<
    typeof SalesQuoteAddressSchema
  >;

export type SalesQuoteLineInput =
  z.infer<
    typeof SalesQuoteLineSchema
  >;

export type SalesQuotePayloadInput =
  z.infer<
    typeof SalesQuotePayloadSchema
  >;

export type SalesQuoteConversionRequestInput =
  z.infer<
    typeof SalesQuoteConversionRequestSchema
  >;

export type SalesQuoteConversionLineInput =
  z.infer<
    typeof SalesQuoteConversionLineSchema
  >;

export type SalesQuoteOrderConversionInput =
  z.infer<
    typeof SalesQuoteOrderConversionSchema
  >;
