// types/hr/department.ts

export interface Department {
  id?: string;

  company_id?: string;

  code?: string;

  name: string;

  description?: string;

  manager_employee_id?: string;

  manager_name?: string;

  status?: "active" | "inactive";

  created_at?: string;
}

/* export interface Department {
  id?: string;
  company_id?: string;
  code?: string;
  name: string;
  description?: string;
  status?: "active" | "inactive";
  created_at?: string;
}
 */