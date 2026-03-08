import { ShiftType } from '../types';

export const SHIFT_ORDER: Record<string, number> = {
  'M': 1,
  'A': 2,
  'N': 3,
  'O': 4,
  'OT': 5
};

export const SHIFT_LABELS: Record<string, string> = {
  'M': 'ช',
  'A': 'บ',
  'N': 'ด',
  'O': 'หยุด',
  'OT': 'OT'
};

export const SHIFT_COLORS: Record<string, string> = {
  'M': 'bg-blue-50 text-blue-700',
  'A': 'bg-orange-50 text-orange-700',
  'N': 'bg-purple-50 text-purple-700',
  'O': 'bg-slate-50 text-slate-500',
  'OT': 'bg-pink-50 text-pink-700' // New color for OT
};

/**
 * Merges a new shift type into an existing list of shift types.
 * Enforces uniqueness and max 3 shifts.
 * Returns the new list of shift types.
 */
export function mergeShifts(currentTypes: string[], newType: string): string[] {
  // 1. Combine
  let merged = [...currentTypes];
  if (!merged.includes(newType)) {
    merged.push(newType);
  }

  // 2. Sort
  merged.sort((a, b) => (SHIFT_ORDER[a] || 99) - (SHIFT_ORDER[b] || 99));

  // 3. Limit to 3 (handled by caller usually, but good to have check)
  // We won't slice here, we'll let the caller decide if it's valid.
  
  return merged;
}

/**
 * Formats a list of shift types for display (e.g., "ช/บ/OT").
 */
export function formatShiftDisplay(types: string[]): string {
  if (!types || types.length === 0) return '';
  return types.map(t => SHIFT_LABELS[t] || t).join('/');
}

/**
 * Calculates the total shift count.
 * M, A, N, OT count as 1.
 * O (Off) counts as 0? Or 1?
 * Usually "Off" doesn't count towards "work shifts".
 * But "OT" definitely counts.
 */
export function calculateShiftCount(types: string[]): number {
  let count = 0;
  types.forEach(t => {
    if (t !== 'O') { // Assuming 'O' is Off/Rest and doesn't count as a work shift
      count += 1;
    }
  });
  return count;
}
