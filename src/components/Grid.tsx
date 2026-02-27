import React from 'react';
import { format, getDaysInMonth, isWeekend, isToday } from 'date-fns';
import { Staff, Shift, ShiftType } from '../types';
import clsx from 'clsx';

interface GridProps {
  currentMonth: Date;
  staffList: Staff[];
  shifts: Shift[];
  isAdmin: boolean;
  onCellClick: (staffId: string, date: string, currentShift: ShiftType | undefined) => void;
}

const shiftColors: Record<ShiftType, string> = {
  M: 'bg-blue-100 text-blue-800 border-blue-200',
  A: 'bg-orange-100 text-orange-800 border-orange-200',
  N: 'bg-purple-100 text-purple-800 border-purple-200',
  O: 'bg-gray-100 text-gray-500 border-gray-200',
};

const shiftLabels: Record<ShiftType, string> = {
  M: 'ช',
  A: 'บ',
  N: 'ด',
  O: 'หยุด',
};

export function Grid({ currentMonth, staffList, shifts, isAdmin, onCellClick }: GridProps) {
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
    <div className="overflow-x-auto bg-white shadow-sm rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200" id="roster-table">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 border-r border-gray-200 w-48">
              Staff Name
            </th>
            {days.map((day) => {
              const isWknd = isWeekend(day);
              const isTdy = isToday(day);
              return (
                <th
                  key={day.toISOString()}
                  scope="col"
                  className={clsx(
                    "px-2 py-3 text-center text-xs font-medium uppercase tracking-wider min-w-[40px] border-r border-gray-200",
                    isWknd ? "bg-red-50 text-red-700" : "text-gray-500",
                    isTdy && "bg-indigo-50 border-b-2 border-b-indigo-500 text-indigo-700"
                  )}
                >
                  <div className="flex flex-col items-center">
                    <span>{format(day, 'E')}</span>
                    <span className="text-lg font-semibold">{format(day, 'd')}</span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {staffList.map((staff) => (
            <tr key={staff.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200 group-hover:bg-gray-50">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold mr-3">
                    {staff.name.charAt(0)}
                  </div>
                  {staff.name}
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
                    onClick={() => isAdmin && onCellClick(staff.id, dateStr, shiftType)}
                    className={clsx(
                      "px-1 py-2 whitespace-nowrap text-center text-sm border-r border-gray-200 cursor-pointer transition-all",
                      isAdmin && "hover:bg-gray-100",
                      isTdy && !shiftType && "bg-indigo-50/30",
                      isWknd && !shiftType && "bg-red-50/30"
                    )}
                  >
                    {shiftType ? (
                      <div className={clsx(
                        "w-full h-full min-h-[32px] flex items-center justify-center rounded border font-medium",
                        shiftColors[shiftType]
                      )}>
                        {shiftLabels[shiftType]}
                      </div>
                    ) : (
                      <div className="w-full h-full min-h-[32px] flex items-center justify-center text-gray-300 hover:text-gray-400">
                        -
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          {staffList.length === 0 && (
            <tr>
              <td colSpan={daysInMonth + 1} className="px-6 py-8 text-center text-gray-500">
                No staff members found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
