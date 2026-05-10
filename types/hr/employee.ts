// types/hr/employee.ts

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

// FULL PAYLOAD

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
