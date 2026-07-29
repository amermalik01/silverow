// lib/validations/companyValidation.ts

export interface CompanyPayload {
  name: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  county?: string;
  postal_code?: string;
  country_code?: string;
  phone?: string;
  fax?: string;
  additional_printable_info?: string;
  website?: string;
  base_currency?: string;
  logo_url?: string;

  // Financial fields
  business_type?: string;
  is_wholesaler?: boolean;
  financial_year_start_date?: string;
  financial_year_end_date?: string;
  date_of_incorporation?: string;
  company_reg_no?: string;
  vat_scheme?: string;
  vat_reg_no?: string;
  vat_submission_freq?: string;
}

export function validateCompanySettings(data: CompanyPayload): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  // General Tab Validations
  if (!data.name || !data.name.trim()) {
    errors.name = "Company name is required.";
  }

  // Financial Settings Tab Validations
  if (data.financial_year_start_date && data.financial_year_end_date) {
    const start = new Date(data.financial_year_start_date);
    const end = new Date(data.financial_year_end_date);

    if (end <= start) {
      errors.financial_year_end_date =
        "Financial year end date must be after the start date.";
    }
  }

  if (data.date_of_incorporation) {
    const incDate = new Date(data.date_of_incorporation);
    if (incDate > new Date()) {
      errors.date_of_incorporation =
        "Date of incorporation cannot be in the future.";
    }
  }

  if (
    data.vat_scheme === "standard" &&
    (!data.vat_reg_no || !data.vat_reg_no.trim())
  ) {
    errors.vat_reg_no =
      "VAT Registration Number is required when VAT scheme is Standard.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
