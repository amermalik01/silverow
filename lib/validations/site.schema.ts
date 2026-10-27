// lib/validations/site.schema.ts

import { z } from "zod";

const optionalText = z.string().trim().default("");

const optionalNumber = z.number().finite().nonnegative().nullable();

const optionalDate = z.union([z.literal(""), z.iso.date()]);

export const SiteMeterSchema = z.object({
  id: z.string().uuid().optional(),
  mpan_no: z
    .string()
    .trim()
    .regex(/^\d{13}$/, "MPAN must contain exactly 13 digits"),
  meter_serial_no: optionalText,
  meter_type: z.enum([
    "IMPORT",
    "EXPORT",
    "IMPORT_EXPORT",
    "GENERATION",
    "OTHER",
  ]),
  is_primary: z.boolean(),
});

export const SiteBessUnitSchema = z.object({
  id: z.string().uuid().optional(),
  brand: z.string().trim().min(1, "Brand is required"),
  model: z.string().trim().min(1, "Model is required"),
  serial_no: z.string().trim().min(1, "Serial number is required"),
  capacity_kw: optionalNumber,
  capacity_kwh: optionalNumber,
  allocation_date: optionalDate,
  notes: optionalText,
});

export const SiteServiceRecordSchema = z.object({
  id: z.string().uuid().optional(),
  service_type: z.enum([
    "PREVENTIVE",
    "MAINTENANCE",
    "REPAIR",
    "INSPECTION",
    "OTHER",
  ]),
  service_date: optionalDate,
  next_service_date: optionalDate,
  description: z.string().trim().min(1, "Service description is required"),
  documentation_url: optionalText,
  performed_by: optionalText,
  cost: optionalNumber,
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
});

export const SitePaymentScheduleSchema = z
  .object({
    id: z.string().uuid().optional(),
    description: optionalText,
    due_date: z.iso.date(),
    amount: z
      .number()
      .finite()
      .positive("Payment amount must be greater than zero"),
    paid_amount: z.number().finite().nonnegative(),
    status: z.enum(["PENDING", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"]),
    reference_no: optionalText,
    paid_date: optionalDate,
  })
  .refine((value) => value.paid_amount <= value.amount, {
    path: ["paid_amount"],
    message: "Paid amount cannot exceed scheduled amount",
  });

export const SiteSchema = z
  .object({
    id: z.string().uuid().optional(),
    company_id: z.string().uuid().optional(),

    site_no: z.string().trim().min(1, "Site number is required").max(50),

    site_name: optionalText,
    gsp_uk: optionalText,
    distributor_network_operator: optionalText,
    segments: optionalText,

    connection_size: optionalNumber,
    connection_size_approved: optionalNumber,

    connection_size_unit: z.enum(["KW", "KVA", "MW", "MVA"]),

    bess_brand_model: optionalText,
    bess_function_trading: optionalText,

    bess_function: z.enum([
      "TRADING",
      "UPS",
      "PEAK_SHAVING",
      "BACKUP",
      "OTHER",
    ]),

    ups_enabled: z.boolean(),
    status: z.union([z.literal(0), z.literal(1)]),

    service_interval_months: z.number().int().positive().nullable(),

    service_start_date: optionalDate,
    service_notes: optionalText,

    payment_frequency: z.enum(["MONTHLY", "QUARTERLY", "ANNUALLY", "CUSTOM"]),

    allow_partial_payments: z.boolean(),
    payment_currency: z.string().trim().length(3),
    contract_amount: optionalNumber,
    payment_notes: optionalText,

    meters: z
      .array(SiteMeterSchema)
      .max(2, "A maximum of two MPANs is allowed"),

    bess_units: z.array(SiteBessUnitSchema),
    services: z.array(SiteServiceRecordSchema),
    payment_schedules: z.array(SitePaymentScheduleSchema),
  })
  .superRefine((data, ctx) => {
    const mpans = new Set<string>();
    const serials = new Set<string>();

    data.meters.forEach((meter, index) => {
      if (mpans.has(meter.mpan_no)) {
        ctx.addIssue({
          code: "custom",
          path: ["meters", index, "mpan_no"],
          message: "Duplicate MPAN is not allowed",
        });
      }
      mpans.add(meter.mpan_no);
    });

    if (data.meters.filter((meter) => meter.is_primary).length > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["meters"],
        message: "Only one meter can be primary",
      });
    }

    data.bess_units.forEach((unit, index) => {
      const serial = unit.serial_no.trim().toUpperCase();

      if (serials.has(serial)) {
        ctx.addIssue({
          code: "custom",
          path: ["bess_units", index, "serial_no"],
          message: "Duplicate BESS serial number",
        });
      }
      serials.add(serial);
    });

    data.services.forEach((service, index) => {
      if (
        service.service_date &&
        service.next_service_date &&
        service.next_service_date < service.service_date
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["services", index, "next_service_date"],
          message: "Next service date cannot precede service date",
        });
      }
    });

    if (!data.allow_partial_payments) {
      data.payment_schedules.forEach((payment, index) => {
        if (payment.paid_amount > 0 && payment.paid_amount < payment.amount) {
          ctx.addIssue({
            code: "custom",
            path: ["payment_schedules", index, "paid_amount"],
            message: "Partial payments are disabled",
          });
        }
      });
    }
  });

export type SiteInput = z.infer<typeof SiteSchema>;
