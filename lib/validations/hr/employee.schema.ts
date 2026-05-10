// lib/validations/hr/employee.schema.ts
import { z } from "zod";

export const EmployeeSchema = z.object({
  first_name: z.string().min(1),

  last_name: z.string().min(1),

  email: z.string().email().optional().or(z.literal("")),

  mobile: z.string().optional(),

  gender: z.enum(["male", "female", "other"]).optional(),

  hire_date: z.string().optional(),

  department_id: z.string().uuid().optional().or(z.literal("")),

  designation_id: z.string().uuid().optional().or(z.literal("")),

  employment_type_id: z.string().uuid().optional().or(z.literal("")),

  manager_id: z.string().uuid().optional().or(z.literal("")),

  basic_salary: z.number().optional(),

  status: z
    .enum(["active", "inactive", "terminated"])
    .optional(),
});

/* export const EmployeeSchema = z.object({
  first_name: z.string().min(1),

  last_name: z.string().min(1),

  email: z.string().optional(),

  mobile: z.string().optional(),

  hire_date: z.string(),

  department_id: z.string().optional(),

  designation_id: z.string().optional(),

  employment_type_id: z.string().optional(),

  basic_salary: z.number().optional(),
}); */
