
// types/prospect.ts

import type {
  ProspectActivityType,
  ProspectPriority,
  ProspectSource,
  ProspectStatus,
  ProspectPayload as ValidatedProspectPayload,
  ProspectActivityInput,
} from "@/lib/validations/prospect.schema";

export type ProspectContact = {
  id?: string;
  company_id?: string;
  prospect_id?: string;
  name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ProspectAddress = {
  id?: string;
  company_id?: string;
  prospect_id?: string;
  label: string;
  address_1: string | null;
  address_2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postcode: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  is_billing: boolean;
  is_shipping: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Prospect = {
  id: string;
  company_id: string;
  prospect_no: string;
  company_name: string;
  website: string | null;
  status: ProspectStatus;
  source: ProspectSource | null;
  priority: ProspectPriority;
  assigned_to: string | null;
  assigned_to_name: string | null;
  estimated_deal_value: number | string;
  currency_id: string | null;
  currency_code?: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  reminder_enabled: boolean;
  converted_party_id: string | null;
  converted_at: string | null;
  converted_by: string | null;
  lost_reason: string | null;
  description: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProspectNote = {
  id: string;
  company_id: string;
  prospect_id: string;
  author_id: string | null;
  author: string;
  title: string;
  content: string;
  created_at: string;
};

export type ProspectActivity = {
  id: string;
  company_id: string;
  prospect_id: string;
  activity_type: ProspectActivityType;
  subject: string;
  description: string | null;
  activity_at: string;
  outcome: string | null;
  contact_id: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
};

export type ProspectStatusHistory = {
  id: string;
  company_id: string;
  prospect_id: string;
  previous_status: ProspectStatus | null;
  new_status: ProspectStatus;
  changed_by: string | null;
  changed_at: string;
  remarks: string | null;
};

export type ProspectListRecord = {
  id: string;
  prospect_no: string;
  company_name: string;
  website: string | null;
  status: ProspectStatus;
  source: ProspectSource | null;
  priority: ProspectPriority;
  estimated_deal_value: number | string;
  currency_id: string | null;
  currency_code: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  reminder_enabled: boolean;
  created_at: string;

  primary_contact_name: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  primary_city: string | null;
  activities_count: number;
};

export type ProspectDetails = {
  prospect: Prospect;
  contacts: ProspectContact[];
  addresses: ProspectAddress[];
  activities: ProspectActivity[];
  notes: ProspectNote[];
  statusHistory: ProspectStatusHistory[];
};

export type ProspectTab =
  | "general"
  | "contacts"
  | "addresses"
  | "activity"
  | "notes"
  | "attachments";

export type ProspectPayload = ValidatedProspectPayload;

export type ProspectActivityPayload = ProspectActivityInput;

export type ProspectStatusChangeOptions = {
  remarks?: string | null;
  lostReason?: string | null;
};

export type ProspectConversionPayload = {
  customerName?: string;
  customerStatus?: "active" | "inactive";
};
