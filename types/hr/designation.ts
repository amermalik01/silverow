// types/hr/designation.ts

export interface Designation {
  id?: string;

  company_id?: string;

  code?: string;

  department_id?: string;

  department_name?: string;

  name: string;

  description?: string;

  status?: "active" | "inactive";

  created_at?: string;
}

// export interface Designation {
//   id?: string;
//   company_id?: string;
//   code?: string;
//   name: string;
//   description?: string;
//   status?: "active" | "inactive";
// }