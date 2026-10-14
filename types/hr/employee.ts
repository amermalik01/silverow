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
  designation_id?: string;
  manager_id?: string;
  employment_type_id?: string;
  job_status?: string;
  start_date?: string;
  hours_per_week?: number;
  status?: "active" | "inactive" | "terminated";

  // Login / access
  user_id?: string;
  login_email?: string;
  login_role?: string;
  allow_login?: boolean;

  // Contact
  address_1?: string;
  address_2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country_id?: string;
  phone?: string;
  mobile?: string;
  personal_email?: string;
  email?: string;
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

  // Payroll
  basic_salary?: number;

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