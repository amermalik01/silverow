// types/support-ticket.ts

export const SUPPORT_TICKET_STAGES = [
  "Open",
  "In Progress",
  "Waiting Return",
  "Repair",
  "Closed",
] as const;

export type TicketStage = (typeof SUPPORT_TICKET_STAGES)[number];

export const SUPPORT_TICKET_TABS = [
  "general",
  "details",
  "notes",
  "attachments",
] as const;

export type SupportTicketTab = (typeof SUPPORT_TICKET_TABS)[number];

export type WarrantyStatus = "In Warranty" | "Out of Warranty" | "N/A";

export interface SupportTicket {
  id?: string;
  ticket_no: string;

  // Customer and item references
  customer_no: string;
  customer_name: string;
  apply_to_si: string;
  apply_to_item: string;
  ref_no: string;
  batch_frame_no: string;

  // Address
  address_1: string;
  address_2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
  cons_no: string;

  // Contact and assignment
  contact_person: string;
  telephone: string;
  email: string;
  assign_person_id: string;
  assign_person: string;
  cust_order_no: string;
  partner_id: string;
  partner: string;

  // Dates and issue
  open_date: string;
  close_date: string;
  issue_type: string | number;
  warranty_check: WarrantyStatus;

  // Related documents
  link_to_so: string;
  link_to_po: string;
  link_to_cn: string;
  general_description: string;

  status: TicketStage;
}

export interface TicketNote {
  id?: string;
  ticket_no: string;
  author: string;
  title: string;
  content: string;
  timestamp: string;
}

export interface SupportTicketApiResponse {
  ticket: SupportTicket;
  notes: TicketNote[];
}

export interface SupportTicketFormProps {
  slug: string;
  id?: string;
}
