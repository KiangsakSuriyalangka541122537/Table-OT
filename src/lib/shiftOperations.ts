import { supabase } from './supabase';
import { format, addDays } from 'date-fns';
import { ShiftType } from '../types';

export interface ShiftOperation {
  staffId: string;
  date: string;
  type: ShiftType;
  action: 'add' | 'remove';
}

import { SHIFT_ORDER } from '../utils/shiftUtils';

/**
 * Safely parses a date string in YYYY-MM-DD format to a Date object at 00:00:00 local time.
 */
const parseDateSafe = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const applyShiftOperations = async (operations: ShiftOperation[]) => {
  if (operations.length === 0) return;

  // Group operations by staffId and date to handle them atomically per cell
  const groups: Record<string, ShiftOperation[]> = {};
  for (const op of operations) {
    const key = `${op.staffId}_${op.date}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(op);
  }

  for (const key in groups) {
    const [staffId, date] = key.split('_');
    const cellOps = groups[key];

    // 1. Fetch ALL existing shifts for this staff and date to handle potential duplicates
    const { data: existingShifts, error: fetchError } = await supabase
      .from('shifts')
      .select('*')
      .eq('staff_id', staffId)
      .eq('date', date);
    
    if (fetchError) {
      console.error('Error fetching shifts:', fetchError);
      continue;
    }

    // 2. Combine all types from all existing rows
    let currentTypes: string[] = [];
    if (existingShifts && existingShifts.length > 0) {
      existingShifts.forEach(s => {
        if (s.shift_type) {
          const types = s.shift_type.split(',');
          types.forEach(t => {
            const trimmed = t.trim();
            if (trimmed && !currentTypes.includes(trimmed)) {
              currentTypes.push(trimmed);
            }
          });
        }
      });
    }
    
    // 3. Apply all operations for this cell
    let newTypes = [...currentTypes];
    for (const op of cellOps) {
      if (op.action === 'add') {
        if (!newTypes.includes(op.type)) {
          newTypes.push(op.type);
        }
      } else {
        newTypes = newTypes.filter(t => t !== op.type);
      }
    }

    // 4. Sort the types
    newTypes.sort((a, b) => (SHIFT_ORDER[a] || 99) - (SHIFT_ORDER[b] || 99));
    const newShiftTypeStr = newTypes.join(',');

    // 5. Clean up: Delete all existing rows for this staff/date
    if (existingShifts && existingShifts.length > 0) {
      const ids = existingShifts.map(s => s.id);
      const { error: deleteError } = await supabase.from('shifts').delete().in('id', ids);
      if (deleteError) {
        console.error('Error deleting shifts:', deleteError);
      }
    }

    // 6. Insert the single merged row (if not empty)
    if (newTypes.length > 0) {
      const { error: insertError } = await supabase.from('shifts').insert({
        staff_id: staffId,
        date: date,
        shift_type: newShiftTypeStr
      });
      if (insertError) {
        console.error('Error inserting shift:', insertError);
      }
    }
  }
};

export const generateMoveOperations = (
  sourceStaffId: string,
  sourceDateStr: string,
  targetStaffId: string,
  targetDateStr: string,
  typeToMove: ShiftType
): ShiftOperation[] => {
  const operations: ShiftOperation[] = [];

  // Remove from source
  operations.push({ staffId: sourceStaffId, date: sourceDateStr, type: typeToMove, action: 'remove' });
  
  // Add to target
  operations.push({ staffId: targetStaffId, date: targetDateStr, type: typeToMove, action: 'add' });

  // Handle A/N pairing
  if (typeToMove === 'A') {
    const sourceNextDay = format(addDays(parseDateSafe(sourceDateStr), 1), 'yyyy-MM-dd');
    const targetNextDay = format(addDays(parseDateSafe(targetDateStr), 1), 'yyyy-MM-dd');
    
    operations.push({ staffId: sourceStaffId, date: sourceNextDay, type: 'N', action: 'remove' });
    operations.push({ staffId: targetStaffId, date: targetNextDay, type: 'N', action: 'add' });
  } else if (typeToMove === 'N') {
    const sourcePrevDay = format(addDays(parseDateSafe(sourceDateStr), -1), 'yyyy-MM-dd');
    const targetPrevDay = format(addDays(parseDateSafe(targetDateStr), -1), 'yyyy-MM-dd');
    
    operations.push({ staffId: sourceStaffId, date: sourcePrevDay, type: 'A', action: 'remove' });
    operations.push({ staffId: targetStaffId, date: targetPrevDay, type: 'A', action: 'add' });
  }

  return operations;
};
