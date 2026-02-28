import React from 'react';
import { format, getDaysInMonth, isWeekend, isToday } from 'date-fns';
import { th } from 'date-fns/locale';
import { Staff, Shift, ShiftType, User } from '../types';
import clsx from 'clsx';

interface GridProps {
  currentMonth: Date;
  staffList: Staff[];
  shifts: Shift[];
  isAdmin: boolean;
  user: User | null;
  onCellClick: (staffId: string, date: string, currentShift: ShiftType | undefined) => void;
  onShiftSwapRequest: (staff: Staff, shift: Shift) => void;
}

const shiftColors: Record<ShiftType, string> = {
  M: 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm shadow-blue-100',
  A: 'bg-orange-50 text-orange-700 border-orange-200 shadow-sm shadow-orange-100',
  N: 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm shadow-purple-100',
  O: 'bg-slate-50 text-slate-500 border-slate-200',
};

const shiftLabels: Record<ShiftType, string> = {
  M: 'ช',
  A: 'บ',
  N: 'ด',
  O: 'หยุด',
};

export function Grid({ currentMonth, staffList, shifts, isAdmin, user, onCellClick, onShiftSwapRequest }: GridProps) {
  const daysInMonth = getDaysInMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1);
    return date;
  });

  const getShiftForStaffAndDate = (staffId: string, dateStr: string): ShiftType | undefined => {
    const shift = shifts.find(s => s.staff_id === staffId && s.date === dateStr);
    return shift?.shift_type;
  };

  return (
    <div className="overflow-x-auto bg-white shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200" id="roster-table">
        <thead className="bg-slate-50 sticky top-0 z-10">
          <tr>
            <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50 z-20 border-r border-slate-200 w-56">
              ชื่อพนักงาน
            </th>
            {days.map((day) => {
              const isWknd = isWeekend(day);
              const isTdy = isToday(day);
              return (
                <th
                  key={day.toISOString()}
                  scope="col"
                  className={clsx(
                    "px-2 py-3 text-center text-[10px] font-bold uppercase tracking-widest min-w-[48px] border-r border-slate-200 transition-colors",
                    isWknd ? "bg-rose-50/50 text-rose-600" : "text-slate-400",
                    isTdy && "bg-indigo-50/50 text-indigo-600"
                  )}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="opacity-60">{format(day, 'E', { locale: th })}</span>
                    <span className={clsx(
                      "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all",
                      isTdy ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : ""
                    )}>{format(day, 'd')}</span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {staffList.map((staff) => (
            <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors group">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200 group-hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all">
                    {staff.name.charAt(0)}
                  </div>
                  <span className="tracking-tight">{staff.name}</span>
                </div>
              </td>
              {days.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const shiftType = getShiftForStaffAndDate(staff.id, dateStr);
                const isTdy = isToday(day);
                const isWknd = isWeekend(day);

                return (
                  <td
                    key={dateStr}
                    onClick={() => {
                      const staffObj = staffList.find(s => s.id === staff.id);
                      const shiftObj = shifts.find(s => s.staff_id === staff.id && s.date === dateStr);
                      if (isAdmin) {
                        onCellClick(staff.id, dateStr, shiftType);
                      } else if (user && staffObj && shiftObj && user.id === staffObj.id) {
                        onShiftSwapRequest(staffObj, shiftObj);
                      }
                    }}
                    className={clsx(
                      "px-1.5 py-3 whitespace-nowrap text-center text-sm border-r border-slate-100 cursor-pointer transition-all",
                      isAdmin && "hover:bg-slate-100/50",
                      isTdy && !shiftType && "bg-indigo-50/20",
                      isWknd && !shiftType && "bg-rose-50/20"
                    )}
                  >
                    {shiftType ? (
                      <div className={clsx(
                        "w-full h-8 flex items-center justify-center rounded-lg border text-xs font-bold transition-transform hover:scale-105 active:scale-95",
                        shiftColors[shiftType]
                      )}>
                        {shiftLabels[shiftType]}
                      </div>
                    ) : (
                      <div className="w-full h-8 flex items-center justify-center text-slate-200 hover:text-slate-300 transition-colors">
                        <div className="w-1 h-1 rounded-full bg-current"></div>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          {staffList.length === 0 && (
            <tr>
              <td colSpan={daysInMonth + 1} className="px-6 py-12 text-center text-slate-400 italic">
                ไม่พบพนักงานในระบบ
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
