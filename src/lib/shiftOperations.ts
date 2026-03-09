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

export const applyShiftOperations = async (operations: ShiftOperation[]) => {
  for (const op of operations) {
    // 1. Fetch ALL existing shifts for this staff and date to handle potential duplicates
    const { data: existingShifts } = await supabase
      .from('shifts')
      .select('*')
      .eq('staff_id', op.staffId)
      .eq('date', op.date);
      
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
    
    // 3. Apply the operation
    let newTypes = [...currentTypes];
    if (op.action === 'add') {
      if (!newTypes.includes(op.type)) {
        newTypes.push(op.type);
      }
    } else {
      newTypes = newTypes.filter(t => t !== op.type);
    }

    // 4. Sort the types
    newTypes.sort((a, b) => (SHIFT_ORDER[a] || 99) - (SHIFT_ORDER[b] || 99));
    const newShiftTypeStr = newTypes.join(',');

    // 5. Clean up: Delete all existing rows for this staff/date
    if (existingShifts && existingShifts.length > 0) {
      const ids = existingShifts.map(s => s.id);
      await supabase.from('shifts').delete().in('id', ids);
    }

    // 6. Insert the single merged row (if not empty)
    if (newTypes.length > 0) {
      await supabase.from('shifts').insert({
        staff_id: op.staffId,
        date: op.date,
        shift_type: newShiftTypeStr
      });
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
    const sourceNextDay = format(addDays(new Date(sourceDateStr), 1), 'yyyy-MM-dd');
    const targetNextDay = format(addDays(new Date(targetDateStr), 1), 'yyyy-MM-dd');
    
    operations.push({ staffId: sourceStaffId, date: sourceNextDay, type: 'N', action: 'remove' });
    operations.push({ staffId: targetStaffId, date: targetNextDay, type: 'N', action: 'add' });
  } else if (typeToMove === 'N') {
    const sourcePrevDay = format(addDays(new Date(sourceDateStr), -1), 'yyyy-MM-dd');
    const targetPrevDay = format(addDays(new Date(targetDateStr), -1), 'yyyy-MM-dd');
    
    operations.push({ staffId: sourceStaffId, date: sourcePrevDay, type: 'A', action: 'remove' });
    operations.push({ staffId: targetStaffId, date: targetPrevDay, type: 'A', action: 'add' });
  }

  return operations;
};
