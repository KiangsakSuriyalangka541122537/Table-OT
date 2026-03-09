import { supabase } from './supabase';
import { format, addDays } from 'date-fns';
import { ShiftType } from '../types';

export interface ShiftOperation {
  staffId: string;
  date: string;
  type: ShiftType;
  action: 'add' | 'remove';
}

export const applyShiftOperations = async (operations: ShiftOperation[]) => {
  for (const op of operations) {
    const { data: existingShifts } = await supabase
      .from('shifts')
      .select('*')
      .eq('staff_id', op.staffId)
      .eq('date', op.date);
      
    const existingShift = existingShifts && existingShifts.length > 0 ? existingShifts[0] : null;
    const types = existingShift && existingShift.shift_type ? existingShift.shift_type.split(',') : [];
    
    let newTypes = [...types];
    if (op.action === 'add') {
      if (!newTypes.includes(op.type)) newTypes.push(op.type);
    } else {
      newTypes = newTypes.filter(t => t !== op.type);
    }

    const order: Record<string, number> = { 'M': 1, 'A': 2, 'N': 3 };
    newTypes.sort((a, b) => (order[a] || 99) - (order[b] || 99));
    const newShiftTypeStr = newTypes.join(',');

    if (newTypes.length === 0) {
      if (existingShift) {
        await supabase.from('shifts').delete().eq('id', existingShift.id);
      }
    } else {
      if (existingShift) {
        await supabase.from('shifts').update({ shift_type: newShiftTypeStr }).eq('id', existingShift.id);
      } else {
        await supabase.from('shifts').insert({
          staff_id: op.staffId,
          date: op.date,
          shift_type: newShiftTypeStr
        });
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
