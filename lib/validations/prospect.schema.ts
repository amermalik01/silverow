// lib/validations/prospect.schema.ts

import { z } from "zod";

export const PROSPECT_STATUSES = [
  "New",
  "Contacted",
  "Interested",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Converted",
  "Lost",
] as const;

export const PROSPECT_SOURCES = [
  "Website",
  "Referral",
  "Social Media",
  "Email Campaign",
  "Cold Call",
  "Trade Show",
  "Advertisement",
  "Other",
] as const;

export const PROSPECT_PRIORITIES = ["Low", "Medium", "High"] as const;

export const PROSPECT_ACTIVITY_TYPES = [
  "Email",
  "Call",
  "Meeting",
  "Task",
  "Note",
  "Other",
] as const;

const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .nullable()
    .optional()
    .transform((value) => value || null);

const optionalUuid = z
  .string()
  .uuid()
  .nullable()
  .optional()
  .transform((value) => value || null);

const optionalEmail = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .max(255)
  .nullable()
  .optional()
  .or(z.literal("").transform(() => null));

const optionalDate = z
  .string()
  .date()
  .nullable()
  .optional()
  .transform((value) => value || null);

const optionalDateTime = z
  .string()
  .datetime({ offset: true })
  .nullable()
  .optional()
  .transform((value) => value || null);

export const ProspectContactSchema = z.object({
  id: optionalUuid,
  name: z.string().trim().min(1, "Contact name is required.").max(255),
  job_title: optionalText(150),
  email: optionalEmail,
  phone: optionalText(50),
  mobile: optionalText(50),
  is_primary: z.boolean().default(false),
  notes: optionalText(2000),
});

export const ProspectAddressSchema = z.object({
  id: optionalUuid,
  label: z.string().trim().max(100).default("Head Office"),
  address_1: optionalText(500),
  address_2: optionalText(500),
  city: optionalText(100),
  state: optionalText(100),
  country: optionalText(100),
  postcode: optionalText(50),
  phone: optionalText(50),
  email: optionalEmail,
  is_primary: z.boolean().default(false),
  is_billing: z.boolean().default(false),
  is_shipping: z.boolean().default(false),
});

export const ProspectInputSchema = z.object({
  company_name: z.string().trim().min(1, "Company name is required.").max(255),

  website: optionalText(255),

  status: z.enum(PROSPECT_STATUSES).default("New"),
  source: z.enum(PROSPECT_SOURCES).default("Website"),
  priority: z.enum(PROSPECT_PRIORITIES).default("Medium"),

  assigned_to: optionalUuid,
  assigned_to_name: optionalText(255),

  estimated_deal_value: z.coerce
    .number()
    .finite()
    .min(0, "Deal value cannot be negative.")
    .default(0),

  currency_id: optionalUuid,

  //   last_contacted_at: optionalDateTime,
  last_contacted_at: optionalDate,

  next_follow_up_at: optionalDate,
  reminder_enabled: z.boolean().default(false),

  description: optionalText(10000),
  lost_reason: optionalText(5000),
});

export const ProspectNoteSchema = z.object({
  id: optionalUuid,
  title: z.string().trim().max(255).default("General Note Entry"),
  content: z.string().trim().min(1, "Note content is required.").max(20000),
});

export const ProspectActivitySchema = z.object({
  activity_type: z.enum(PROSPECT_ACTIVITY_TYPES),
  subject: z.string().trim().min(1, "Activity subject is required.").max(255),
  description: optionalText(10000),
  activity_at: z.string().datetime({ offset: true }).optional(),
  contact_id: optionalUuid,
  outcome: optionalText(5000),

  // These fields update prospects.next_follow_up_at and
  // prospects.reminder_enabled. They are not activity-table columns.
  next_follow_up_at: optionalDate,
  reminder_enabled: z.boolean().default(false),
});

export const ProspectPayloadSchema = z
  .object({
    prospect: ProspectInputSchema,
    contacts: z.array(ProspectContactSchema).default([]),
    addresses: z.array(ProspectAddressSchema).default([]),
    // notes: z.array(ProspectNoteSchema).default([]),
  })
  .superRefine((payload, context) => {
    const primaryContacts = payload.contacts.filter(
      (contact) => contact.is_primary,
    );

    if (primaryContacts.length > 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contacts"],
        message: "Only one primary contact is allowed.",
      });
    }

    const primaryAddresses = payload.addresses.filter(
      (address) => address.is_primary,
    );

    if (primaryAddresses.length > 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["addresses"],
        message: "Only one primary address is allowed.",
      });
    }

    const contactIds = payload.contacts
      .map((contact) => contact.id)
      .filter((id): id is string => Boolean(id));

    if (new Set(contactIds).size !== contactIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contacts"],
        message: "Duplicate contact records were submitted.",
      });
    }

    const addressIds = payload.addresses
      .map((address) => address.id)
      .filter((id): id is string => Boolean(id));

    if (new Set(addressIds).size !== addressIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["addresses"],
        message: "Duplicate address records were submitted.",
      });
    }

    if (
      payload.prospect.status === "Lost" &&
      !payload.prospect.lost_reason?.trim()
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prospect", "lost_reason"],
        message: "Please provide a reason for marking this prospect as lost.",
      });
    }

    if (payload.prospect.status === "Converted") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prospect", "status"],
        message: "Use the Convert to Customer action to convert a prospect.",
      });
    }
  });

export const ProspectStatusChangeSchema = z
  .object({
    status: z
      .enum(PROSPECT_STATUSES)
      .refine(
        (status) => status !== "Converted",
        "Use the Convert to Customer action to convert a prospect.",
      ),
    remarks: optionalText(2000),
    lost_reason: optionalText(5000),
  })
  .superRefine((payload, context) => {
    if (payload.status === "Lost" && !payload.lost_reason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lost_reason"],
        message: "Please provide a reason for marking this prospect as lost.",
      });
    }
  });

export const ProspectConversionSchema = z.object({
  customerName: z.string().trim().min(1).max(255).optional(),
  customerStatus: z.enum(["active", "inactive"]).default("active"),
});

export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];
export type ProspectSource = (typeof PROSPECT_SOURCES)[number];
export type ProspectPriority = (typeof PROSPECT_PRIORITIES)[number];
export type ProspectActivityType = (typeof PROSPECT_ACTIVITY_TYPES)[number];

export type ProspectInput = z.infer<typeof ProspectInputSchema>;
export type ProspectContactInput = z.infer<typeof ProspectContactSchema>;
export type ProspectAddressInput = z.infer<typeof ProspectAddressSchema>;
export type ProspectNoteInput = z.infer<typeof ProspectNoteSchema>;
export type ProspectActivityInput = z.infer<typeof ProspectActivitySchema>;
export type ProspectPayload = z.infer<typeof ProspectPayloadSchema>;
export type ProspectStatusChangeInput = z.infer<
  typeof ProspectStatusChangeSchema
>;
export type ProspectConversionInput = z.infer<typeof ProspectConversionSchema>;
