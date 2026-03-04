export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'user';
}

export interface Staff {
  id: string;
  name: string;
  phone?: string;
  avatar_url?: string;
}

export type ShiftType = 'M' | 'A' | 'N' | 'O';

export interface Shift {
  id: string;
  staff_id: string;
  date: string; // YYYY-MM-DD
  shift_type: ShiftType;
}

export interface RosterStatus {
  month_key: string; // YYYY-MM
  is_published: boolean;
  original_assignments: any; // JSONB
}

export enum ShiftSwapStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface ShiftSwapRequest {
  id: string;
  requester_staff_id: string;
  requester_shift_id: string | null;
  requester_date: string;
  requester_shift_type: ShiftType;
  target_staff_id: string;
  target_shift_id: string | null;
  target_date: string;
  target_shift_type: ShiftType;
  status: ShiftSwapStatus;
  created_at: string;
  updated_at: string;
  // Optional: reason, admin_notes
}
