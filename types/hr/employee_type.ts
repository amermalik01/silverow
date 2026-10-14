// types/hr/employee_type.ts

export interface EmployeeType {
  id?: string;
  company_id?: string;
  name: string;
  status?: "active" | "inactive";
  created_at?: string;
}