// types/hr/attendance.ts

export type AttendanceStatus =
  | "present"
  | "absent"
  | "leave"
  | "half_day"
  | "holiday";

export interface Attendance {
  id?: string;
  company_id?: string;
  attendance_no?: string;
  employee_id: string;
  employee_name?: string;
  attendance_date: string;
  check_in?: string;
  check_out?: string;
  break_minutes?: number;
  total_hours?: number;
  overtime_hours?: number;
  attendance_status: AttendanceStatus;
  remarks?: string;
  created_at?: string;
}
