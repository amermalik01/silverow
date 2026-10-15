// types/hr/employee.ts

export interface Employee {
  id?: string;
  company_id?: string;

  // General
  employee_code?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  display_name?: string;
  job_title?: string;

  department_id?: string;
  // department_ids?: string;
  department_name?: string;
  designation_id?: string;
  // designation_ids?: string;
  designation_name?: string;
  manager_id?: string;
  manager_name?: string;
  employment_type_id?: string;
  job_status?: string;
  start_date?: string;
  hours_per_week?: number;
  status?: "active" | "inactive" | "terminated";

  // Login / access
  user_id?: string;
  login_email?: string;
  email?: string;
  login_role?: string;
  allow_login?: boolean;

  // Contact
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;

  work_telephone?: string;
  home_telephone?: string;
  phone?: string;

  mobile?: string;
  personal_email?: string;
  work_email?: string;
  skype?: string;
  linkedin?: string;

  // Personal
  date_of_birth?: string;
  gender?: "male" | "female" | "other";
  national_insurance_no?: string;
  marital_status?: string;
  number_of_children?: number;
  ethnic_origin?: string;
  passport_id_no?: string;
  driving_licence_no?: string;
  driving_licence_points?: number;

  // Bank account
  bank_account_name?: string;
  bank_sort_code?: string;
  bank_account_no?: string;
  bank_swift_bic?: string;
  bank_iban?: string;
  bank_name?: string;
  bank_address?: string;

  // Next of kin / emergency contact
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_mobile?: string;
  emergency_contact_phone?: string;
  emergency_contact_email?: string;
  emergency_contact_telephone?: string;

  // Payroll
  basic_salary?: number;
  salary_currency?: string;
  salary_frequency?: string;
  commission_rate?: number;
  commission_effective_date?: string;
  overtime_rate?: number;
  company_bonus?: number;
  entitled_holidays?: number;

  salary_effective_date?: string;
  salary_review_date?: string;

  employee_pension_percentage?: number;
  employee_pension_start_date?: string;
  employee_pension_change_date?: string;
  employee_pension_end_date?: string;

  employer_pension_percentage?: number;
  employer_pension_start_date?: string;
  employer_pension_change_date?: string;
  employer_pension_end_date?: string;

  has_company_car?: boolean;
  car_make?: string;
  car_model?: string;
  car_vin_reg?: string;
  car_co2?: string;

  car_market_value?: string;
  car_fuel_type?: string;
  car_engine_size?: string;
  car_date_from?: string;
  car_date_to?: string;

  has_fuel_card?: boolean;
  fuel_card_number?: string;
  fuel_cost_deductions?: boolean;

  has_company_laptop?: boolean;
  laptop_make?: string;
  laptop_model?: string;
  laptop_serial?: string;
  laptop_date_from?: string;
  laptop_date_to?: string;

  has_company_tablet?: boolean;
  tablet_make?: string;
  tablet_model?: string;
  tablet_serial?: string;
  tablet_date_from?: string;
  tablet_date_to?: string;
  
  has_company_mobile?: boolean;
  mobile_make?: string;
  mobile_model?: string;
  mobile_imei?: string;
  mobile_date_from?: string;
  mobile_date_to?: string;

  p11d_value?: string;

  created_at?: string;
  updated_at?: string;
}


export interface EmployeePayload {
  employee: Employee;
  contacts: EmployeeContact[];
  addresses: EmployeeAddress[];
  access?: {
    enable_login: boolean;
    email?: string;
    password?: string;
    role?: string;
  };
}

export interface EmployeeContact {
  id?: string;
  employee_id?: string;
  name: string;
  relation?: string;
  phone?: string;
  email?: string;
  is_emergency?: boolean;
}

export interface EmployeeAddress {
  id?: string;
  employee_id?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country_id?: string;
  is_primary?: boolean;
}
 /* 
export interface Employee {
  id?: string;

  company_id?: string;
  employee_code?: string;

  first_name: string;
  middle_name?: string;
  last_name: string;
  display_name?: string;

  gender?: "male" | "female" | "other";
  date_of_birth?: string;

  email?: string;
  phone?: string;
  mobile?: string;

  hire_date?: string;
  department_id?: string;
  designation_id?: string;
  department_name?: string;
  designation_name?: string;

  employment_type_id?: string;
  manager_id?: string;
  manager_name?: string;
  basic_salary?: number;

  user_id?: string;
  login_email?: string;
  login_role?: string;
  status?: "active" | "inactive" | "terminated";

  created_at?: string;
  updated_at?: string;
}

// ACCESS PAYLOAD

export interface EmployeeAccessPayload {
  enable_login: boolean;
  email?: string;
  password?: string;
  role?: string;
  force_password_change?: boolean;
}
*/
// FULL PAYLOAD