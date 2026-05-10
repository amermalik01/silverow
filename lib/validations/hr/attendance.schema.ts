// lib/validations/hr/attendance.schema.ts

import { z } from "zod";

export const AttendanceSchema = z.object({
  employee_id: z.string().min(1),

  attendance_date: z.string(),

  check_in: z.string().optional(),

  check_out: z.string().optional(),

  break_minutes: z.number().optional(),

  overtime_hours: z.number().optional(),

  attendance_status: z.enum([
    "present",
    "absent",
    "leave",
    "half_day",
    "holiday",
  ]),

  remarks: z.string().optional(),
});
