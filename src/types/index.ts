export type ShiftType = 'M' | 'A' | 'N' | 'O';

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'user';
}

export interface Staff {
  id: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
}

export interface Shift {
  id: string;
  staff_id: string;
  date: string; // YYYY-MM-DD
  shift_type: ShiftType;
}

export interface RosterStatus {
  month_key: string; // YYYY-MM
  is_published: boolean;
  original_assignments: any;
}

export interface Log {
  id: string;
  timestamp: string;
  message: string;
  action_type: string;
}
