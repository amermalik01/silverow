// lib/validations/energy-site.schema.ts

import { z } from "zod";

const uuid = z.string().uuid();
const text = z.string().trim().default("");
const optionalId = uuid.optional();

const numberOrNull = z
  .union([
    z.number().finite(),
    z
      .string()
      .trim()
      .transform((value, ctx) => {
        if (value === "") return null;
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
          ctx.addIssue({
            code: "custom",
            message: "Invalid number",
          });
          return z.NEVER;
        }
        return parsed;
      }),
    z.null(),
  ])
  .optional()
  .transform((value) => value ?? null);

const dateOrEmpty = z.union([z.iso.date(), z.literal("")]).default("");

export const EnergyMeterSchema = z.object({
  id: optionalId,
  mpan_no: z.string().regex(/^\d{13}$/, "MPAN must be 13 digits"),
  meter_serial_no: text,
  meter_type: z.enum([
    "IMPORT",
    "EXPORT",
    "IMPORT_EXPORT",
    "GENERATION",
    "OTHER",
  ]),
  is_primary: z.boolean().default(false),
});

export const EnergyBessSchema = z.object({
  id: optionalId,
  brand: text,
  model: text,
  serial_no: z.string().trim().min(1),
  capacity_kw: numberOrNull,
  capacity_kwh: numberOrNull,
  allocation_date: dateOrEmpty,
  notes: text,
});

export const EnergyServiceSchema = z.object({
  id: optionalId,
  service_type: z.enum([
    "PREVENTIVE",
    "MAINTENANCE",
    "REPAIR",
    "INSPECTION",
    "OTHER",
  ]),
  service_date: dateOrEmpty,
  next_service_date: dateOrEmpty,
  description: z.string().trim().min(1),
  documentation_url: text,
  performed_by: text,
  cost: numberOrNull,
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
});

export const EnergyPaymentSchema = z
  .object({
    id: optionalId,
    description: text,
    due_date: z.iso.date(),
    amount: z.number().finite().positive(),
    paid_amount: z.number().finite().nonnegative(),
    status: z.enum(["PENDING", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"]),
    reference_no: text,
    paid_date: dateOrEmpty,
  })
  .refine((value) => value.paid_amount <= value.amount, {
    path: ["paid_amount"],
    message: "Paid amount cannot exceed amount",
  });

export const EnergySiteFieldsSchema = z.object({
  id: optionalId,
  site_no: z.string().trim().min(1).max(60),
  site_name: text,
  gsp_uk: text,
  distributor_network_operator: text,
  segments: text,
  connection_size: numberOrNull,
  connection_size_approved: numberOrNull,
  connection_size_unit: z.enum(["KW", "KVA", "MW", "MVA"]),
  bess_brand_model: text,
  bess_function_trading: text,
  bess_function: z.enum(["TRADING", "UPS", "PEAK_SHAVING", "BACKUP", "OTHER"]),
  ups_enabled: z.boolean(),
  status: z.union([z.literal(0), z.literal(1)]),
  service_interval_months: numberOrNull,
  service_start_date: dateOrEmpty,
  service_notes: text,
  payment_frequency: z.enum(["MONTHLY", "QUARTERLY", "ANNUALLY", "CUSTOM"]),
  allow_partial_payments: z.boolean(),
  payment_currency: z.string().trim().length(3),
  contract_amount: numberOrNull,
  payment_notes: text,
});

export const EnergySitePayloadSchema = z
  .object({
    site: EnergySiteFieldsSchema,
    meters: z.array(EnergyMeterSchema).max(2),
    bess_units: z.array(EnergyBessSchema),
    services: z.array(EnergyServiceSchema),
    payment_schedules: z.array(EnergyPaymentSchema),
  })
  .superRefine((data, ctx) => {
    const { site, meters, bess_units, services, payment_schedules } = data;

    const issue = (path: (string | number)[], message: string) => {
      ctx.addIssue({ code: "custom", path, message });
    };

    if (site.site_name)
      issue(["site", "site_name"], "Site name column is not available");
    if (site.segments)
      issue(["site", "segments"], "Segments column is not available");
    if (site.contract_amount !== null) {
      issue(
        ["site", "contract_amount"],
        "Contract amount column is not available",
      );
    }
    if (site.payment_notes) {
      issue(["site", "payment_notes"], "Payment notes column is not available");
    }
    if (site.service_start_date) {
      issue(
        ["site", "service_start_date"],
        "Service start date column is not available",
      );
    }
    if (!site.allow_partial_payments) {
      issue(
        ["site", "allow_partial_payments"],
        "Partial payment setting is not stored",
      );
    }
    if (site.bess_function_trading) {
      issue(
        ["site", "bess_function_trading"],
        "Trading notes column is not available",
      );
    }

    const paymentTerms = {
      MONTHLY: "OTHER",
      QUARTERLY: "QUARTERLY",
      ANNUALLY: "OTHER",
      CUSTOM: "OTHER",
    } as const;

    if (site.payment_frequency !== "QUARTERLY") {
      issue(
        ["site", "payment_frequency"],
        `Cannot persist ${site.payment_frequency} distinctly in payment_terms`,
      );
    }
    void paymentTerms;

    if (site.connection_size !== null && site.connection_size < 0) {
      issue(["site", "connection_size"], "Cannot be negative");
    }

    if (
      site.connection_size_approved !== null &&
      site.connection_size_approved < 0
    ) {
      issue(["site", "connection_size_approved"], "Cannot be negative");
    }

    if (
      site.service_interval_months !== null &&
      (!Number.isInteger(site.service_interval_months) ||
        site.service_interval_months <= 0)
    ) {
      issue(["site", "service_interval_months"], "Must be a positive integer");
    }

    if (
      meters.length > 0 &&
      meters.filter((meter) => meter.is_primary).length !== 1
    ) {
      issue(["meters"], "Exactly one meter must be primary");
    }

    const mpans = new Set<string>();
    meters.forEach((meter, index) => {
      if (mpans.has(meter.mpan_no)) {
        issue(["meters", index, "mpan_no"], "Duplicate MPAN");
      }
      mpans.add(meter.mpan_no);
    });

    const serials = new Set<string>();
    bess_units.forEach((unit, index) => {
      const serial = unit.serial_no.toUpperCase();

      if (serials.has(serial)) {
        issue(["bess_units", index, "serial_no"], "Duplicate serial number");
      }
      serials.add(serial);

      if (unit.capacity_kwh !== null || unit.notes) {
        issue(
          ["bess_units", index],
          "BESS kWh capacity and notes are not stored in the current schema",
        );
      }
      if (unit.capacity_kw !== null && unit.capacity_kw < 0) {
        issue(["bess_units", index, "capacity_kw"], "Cannot be negative");
      }
    });

    services.forEach((service, index) => {
      if (!service.service_date) {
        issue(["services", index, "service_date"], "Service date is required");
      }
      if (
        service.service_type === "PREVENTIVE" ||
        service.service_type === "OTHER"
      ) {
        issue(
          ["services", index, "service_type"],
          "Service type is not supported by the database",
        );
      }
      if (
        service.performed_by ||
        service.cost !== null ||
        service.status !== "SCHEDULED"
      ) {
        issue(
          ["services", index],
          "Service performer, cost and status are not stored in the current schema",
        );
      }
      if (
        service.next_service_date &&
        service.service_date &&
        service.next_service_date < service.service_date
      ) {
        issue(
          ["services", index, "next_service_date"],
          "Date cannot precede service date",
        );
      }
    });

    payment_schedules.forEach((payment, index) => {
      if (payment.description) {
        issue(
          ["payment_schedules", index, "description"],
          "Payment description is not stored",
        );
      }

      const expectedStatus =
        payment.paid_amount === 0
          ? "PENDING"
          : payment.paid_amount >= payment.amount
            ? "PAID"
            : "PARTIAL";

      if (payment.status !== expectedStatus) {
        issue(
          ["payment_schedules", index, "status"],
          `Status must be ${expectedStatus} for the supplied paid amount`,
        );
      }
    });
  });

export type EnergySitePayload = z.infer<typeof EnergySitePayloadSchema>;
