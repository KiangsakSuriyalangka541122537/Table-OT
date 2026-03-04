import React from 'react';
import { format, getDaysInMonth, isWeekend, isToday } from 'date-fns';
import { th } from 'date-fns/locale';
import { User as UserIcon, X, Info } from 'lucide-react';
import { Staff, Shift, ShiftType, User } from '../types';
import clsx from 'clsx';

interface GridProps {
  currentMonth: Date;
  staffList: Staff[];
  shifts: Shift[];
  isAdmin: boolean;
  user: User | null;
  swapSelection: { staff: Staff; shift: Shift } | null;
  onCancelSwap: () => void;
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

export function Grid({ 
  currentMonth, 
  staffList, 
  shifts, 
  isAdmin, 
  user, 
  swapSelection,
  onCancelSwap,
  onCellClick, 
  onShiftSwapRequest 
}: GridProps) {
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
    <div className="space-y-4">
      {swapSelection && (
        <div className="bg-indigo-600 text-white px-6 py-3 rounded-2xl flex items-center justify-between shadow-lg shadow-indigo-200 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold">กำลังเลือกเวรเพื่อสลับ</p>
              <p className="text-[10px] opacity-80">
                เลือกแล้ว: {swapSelection.staff.name} - {format(new Date(swapSelection.shift.date), 'd MMM')} ({shiftLabels[swapSelection.shift.shift_type]})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium bg-white/20 px-3 py-1 rounded-full animate-pulse">
              คลิกอีกหนึ่งช่องที่ต้องการสลับด้วย
            </span>
            <button 
              onClick={onCancelSwap}
              className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto bg-white shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200">
      <table className="w-full table-fixed divide-y divide-slate-200" id="roster-table">
        <thead className="bg-slate-50 sticky top-0 z-10">
          <tr>
            <th scope="col" className="px-3 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50 z-20 border-r border-slate-200 w-40">
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
                    "px-0.5 py-2 text-center text-[9px] font-bold uppercase tracking-tighter border-r border-slate-200 transition-colors",
                    isWknd ? "bg-rose-50/50 text-rose-600" : "text-slate-400",
                    isTdy && "bg-indigo-50/50 text-indigo-600"
                  )}
                >
                  <div className="flex flex-col items-center gap-0">
                    <span className="opacity-60 text-[8px]">{format(day, 'E', { locale: th })}</span>
                    <span className={clsx(
                      "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all",
                      isTdy ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : ""
                    )}>{format(day, 'd')}</span>
                  </div>
                </th>
              );
            })}
            <th scope="col" className="px-1 py-4 text-center text-[9px] font-bold text-indigo-600 uppercase tracking-tighter bg-indigo-50/30 border-l border-slate-200 w-14">
              รวมเวร
            </th>
            <th scope="col" className="px-1 py-4 text-center text-[9px] font-bold text-emerald-600 uppercase tracking-tighter bg-emerald-50/30 border-l border-slate-200 w-16">
              รวมเงิน
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {staffList.map((staff) => {
            const staffShifts = shifts.filter(s => s.staff_id === staff.id);
            const mCount = staffShifts.filter(s => s.shift_type === 'M').length;
            const aCount = staffShifts.filter(s => s.shift_type === 'A').length;
            const nCount = staffShifts.filter(s => s.shift_type === 'N').length;
            const totalShifts = mCount + ((aCount + nCount) / 2);
            const totalPay = totalShifts * 750;

            return (
              <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-3 py-3 whitespace-nowrap text-xs font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200 group-hover:bg-slate-50 transition-colors overflow-hidden text-ellipsis">
                  <div className="flex items-center gap-2">
                    <div className={`h-7 w-7 shrink-0 rounded-lg flex items-center justify-center border transition-all ${
                      staff.name.startsWith('นาย') 
                        ? 'bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-100' 
                        : staff.name.startsWith('น.ส.') || staff.name.startsWith('นางสาว') || staff.name.startsWith('นาง')
                          ? 'bg-pink-50 text-pink-600 border-pink-100 group-hover:bg-pink-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100'
                    }`}>
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <span className="tracking-tight truncate">{staff.name}</span>
                  </div>
                </td>
                {days.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const shiftType = getShiftForStaffAndDate(staff.id, dateStr);
                  const isTdy = isToday(day);
                  const isWknd = isWeekend(day);
                  const shiftObj = shifts.find(s => s.staff_id === staff.id && s.date === dateStr);
                  const isSelected = swapSelection?.shift.id === shiftObj?.id;

                  return (
                    <td
                      key={dateStr}
                      onClick={() => {
                        const staffObj = staffList.find(s => s.id === staff.id);
                        if (isAdmin) {
                          onCellClick(staff.id, dateStr, shiftType);
                        } else if (user && staffObj && shiftObj) {
                          // Allow swap if logged in and clicking a valid shift
                          onShiftSwapRequest(staffObj, shiftObj);
                        }
                      }}
                      className={clsx(
                        "px-0.5 py-2 whitespace-nowrap text-center text-xs border-r border-slate-100 cursor-pointer transition-all relative",
                        isAdmin && "hover:bg-slate-100/50",
                        isTdy && !shiftType && "bg-indigo-50/20",
                        isWknd && !shiftType && "bg-rose-50/20",
                        isSelected && "bg-indigo-100/50 ring-2 ring-inset ring-indigo-500 z-10"
                      )}
                    >
                      {shiftType ? (
                        <div className={clsx(
                          "w-full h-7 flex items-center justify-center rounded-md border text-[10px] font-bold transition-transform hover:scale-105 active:scale-95",
                          isSelected ? "bg-indigo-600 text-white border-indigo-700 shadow-md" : shiftColors[shiftType]
                        )}>
                          {shiftLabels[shiftType]}
                        </div>
                      ) : (
                        <div className="w-full h-7 flex items-center justify-center text-slate-200 hover:text-slate-300 transition-colors">
                          <div className="w-1 h-1 rounded-full bg-current"></div>
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="px-1 py-3 whitespace-nowrap text-center bg-indigo-50/10 border-l border-slate-100">
                  <span className="text-[11px] font-bold text-indigo-600">{totalShifts}</span>
                </td>
                <td className="px-1 py-3 whitespace-nowrap text-center bg-emerald-50/10 border-l border-slate-100">
                  <span className="text-[10px] font-bold text-emerald-600">{totalPay.toLocaleString()}</span>
                </td>
              </tr>
            );
          })}
          {staffList.length > 0 && (
            <tr className="bg-slate-50/80 font-bold">
              <td className="px-3 py-3 whitespace-nowrap text-xs text-slate-900 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                รวมทั้งหมด
              </td>
              {days.map((day) => (
                <td key={day.toISOString()} className="px-0.5 py-2 border-r border-slate-100"></td>
              ))}
              <td className="px-1 py-3 whitespace-nowrap text-center bg-indigo-100/30 border-l border-slate-200">
                <span className="text-[11px] font-black text-indigo-700">
                  {staffList.reduce((acc, staff) => {
                    const staffShifts = shifts.filter(s => s.staff_id === staff.id);
                    const mCount = staffShifts.filter(s => s.shift_type === 'M').length;
                    const aCount = staffShifts.filter(s => s.shift_type === 'A').length;
                    const nCount = staffShifts.filter(s => s.shift_type === 'N').length;
                    return acc + mCount + ((aCount + nCount) / 2);
                  }, 0)}
                </span>
              </td>
              <td className="px-1 py-3 whitespace-nowrap text-center bg-emerald-100/30 border-l border-slate-200">
                <span className="text-[10px] font-black text-emerald-700">
                  ฿{staffList.reduce((acc, staff) => {
                    const staffShifts = shifts.filter(s => s.staff_id === staff.id);
                    const mCount = staffShifts.filter(s => s.shift_type === 'M').length;
                    const aCount = staffShifts.filter(s => s.shift_type === 'A').length;
                    const nCount = staffShifts.filter(s => s.shift_type === 'N').length;
                    return acc + (mCount + ((aCount + nCount) / 2)) * 750;
                  }, 0).toLocaleString()}
                </span>
              </td>
            </tr>
          )}
          {staffList.length === 0 && (
            <tr>
              <td colSpan={daysInMonth + 3} className="px-6 py-12 text-center text-slate-400 italic">
                ไม่พบพนักงานในระบบ
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);
}
