// lib/validations/support-ticket.schema.ts

import { z } from "zod";

export const SUPPORT_TICKET_STAGES = [
  "Open",
  "In Progress",
  "Waiting Return",
  "Repair",
  "Closed",
] as const;

export const SUPPORT_TICKET_WARRANTY = [
  "In Warranty",
  "Out of Warranty",
  "N/A",
] as const;

const optionalText = z.string().trim().optional().default("");

const optionalUuid = z
  .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
  .transform((value) => (value ? value : null));

export const SupportTicketSchema = z.object({
  ticket_no: z.string().optional().default(""),

  customer_no: z.string().uuid("Please select a valid customer."),
  customer_name: z.string().trim().max(255).default(""),

  apply_to_si: optionalText,
  apply_to_item: optionalText,
  ref_no: optionalText,
  batch_frame_no: optionalText,

  address_1: optionalText,
  address_2: optionalText,
  city: optionalText,
  county: optionalText,
  postcode: optionalText,
  country: optionalText,
  cons_no: optionalText,

  contact_person: optionalText,
  telephone: optionalText,
  email: z
    .union([z.string().trim().email(), z.literal("")])
    .optional()
    .default(""),

  assign_person_id: optionalUuid,
  assign_person: optionalText,

  cust_order_no: optionalText,

  partner_id: optionalUuid,
  partner: optionalText,

  open_date: z.string().min(1, "Open date is required."),
  close_date: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => (value?.trim() ? value : null)),

  issue_type: z.union([z.string(), z.number()]).optional().default(""),
  warranty_check: z.enum(SUPPORT_TICKET_WARRANTY).default("In Warranty"),

  link_to_so: optionalText,
  link_to_po: optionalText,
  link_to_cn: optionalText,

  general_description: z.string().optional().default(""),

  status: z.enum(SUPPORT_TICKET_STAGES).default("Open"),
});

export const SupportTicketNoteSchema = z.object({
  id: z.string().uuid().optional(),
  ticket_no: z.string().optional().default(""),
  author: z.string().trim().max(255).default(""),
  title: z.string().trim().max(255).default("General Note Entry"),
  content: z.string().trim().min(1, "Note content cannot be empty."),
  timestamp: z.string().optional().default(""),
});

export const SupportTicketPayloadSchema = z.object({
  ticket: SupportTicketSchema,
  notes: z.array(SupportTicketNoteSchema).optional().default([]),
});

export type SupportTicketInput = z.infer<typeof SupportTicketSchema>;
export type SupportTicketNoteInput = z.infer<typeof SupportTicketNoteSchema>;
export type SupportTicketPayload = z.infer<typeof SupportTicketPayloadSchema>;

export type SupportTicketStage = (typeof SUPPORT_TICKET_STAGES)[number];
