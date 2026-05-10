// types/hr/leave.ts

export interface LeaveType {
  id?: string;
  company_id?: string;
  code?: string;
  name: string;
  days_allowed?: number;
  is_paid?: boolean;
  status?: string;
}

export interface LeaveRequest {
  id?: string;
  company_id?: string;
  leave_no?: string;
  employee_id: string;
  employee_name?: string;
  leave_type_id: string;
  leave_type_name?: string;
  start_date: string;
  end_date: string;
  total_days?: number;
  reason?: string;
  status?: "pending" | "approved" | "rejected";
  approved_by?: string;
  approved_at?: string;
  created_at?: string;
}

// export interface LeaveRequest {
//   id?: string;
//   company_id?: string;
//   leave_no?: string;
//   employee_id: string;
//   leave_type_id: string;
//   start_date: string;
//   end_date: string;
//   total_days?: number;
//   reason?: string;
//   status?: string;
// }
