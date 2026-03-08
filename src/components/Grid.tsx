import React from 'react';
import { format, getDaysInMonth, isWeekend, isToday } from 'date-fns';
import { th } from 'date-fns/locale';
import { User as UserIcon } from 'lucide-react';
import { Staff, Shift, ShiftType, User } from '../types';
import clsx from 'clsx';

interface GridProps {
  currentMonth: Date;
  staffList: Staff[];
  shifts: Shift[];
  isAdmin: boolean;
  isPublished: boolean;
  user: User | null;
  onCellClick: (staffId: string, date: string, currentShifts: ShiftType[]) => void;
  onShiftSwapRequest: (staff: Staff, dateStr: string, shift: Shift | null) => void;
  selectedShiftForMove?: { staffId: string; dateStr: string; shiftType: ShiftType | undefined } | null;
  shiftToSwap?: Shift | null;
  targetShiftToSwap?: Shift | null;
  pendingSwaps?: ShiftSwapRequest[];
  approvedSwaps?: ShiftSwapRequest[];
}

const shiftColors: Record<ShiftType, string> = {
  M: 'bg-blue-50 text-blue-700 border-blue-200',
  A: 'bg-orange-50 text-orange-700 border-orange-200',
  N: 'bg-purple-50 text-purple-700 border-purple-200',
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
  isPublished,
  user, 
  onCellClick, 
  onShiftSwapRequest, 
  selectedShiftForMove,
  shiftToSwap,
  targetShiftToSwap,
  pendingSwaps = [],
  approvedSwaps = []
}: GridProps) {
  const [hoveredSwapIds, setHoveredSwapIds] = React.useState<string[]>([]);
  const daysInMonth = getDaysInMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1);
    return date;
  });

  const getShiftsForStaffAndDate = (staffId: string, dateStr: string): ShiftType[] => {
    const shift = shifts.find(s => s.staff_id === staffId && s.date === dateStr);
    if (!shift || !shift.shift_type) return [];
    return shift.shift_type.split(',') as ShiftType[];
  };

  return (
    <div className="overflow-x-auto bg-white shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200">
      <table className="w-full table-fixed divide-y divide-slate-200" id="roster-table">
        <thead className="bg-slate-50 sticky top-0 z-10">
          <tr>
            <th scope="col" className="px-3 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50 z-20 border-r border-slate-200 w-40">
              รายชื่อบุคลากร
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
            <th scope="col" className="px-1 py-4 text-center text-[11px] font-bold text-indigo-600 uppercase tracking-tighter bg-indigo-50/30 border-l border-slate-200 w-16">
              รวมเวร
            </th>
            <th scope="col" className="px-1 py-4 text-center text-[11px] font-bold text-emerald-600 uppercase tracking-tighter bg-emerald-50/30 border-l border-slate-200 w-20">
              รวมเงิน
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {staffList.map((staff) => {
            const staffShifts = shifts.filter(s => s.staff_id === staff.id);
            let mCount = 0;
            let aCount = 0;
            let nCount = 0;
            
            staffShifts.forEach(s => {
              if (s.shift_type) {
                const types = s.shift_type.split(',');
                if (types.includes('M')) mCount++;
                if (types.includes('A')) aCount++;
                if (types.includes('N')) nCount++;
              }
            });
            
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
                  const currentShifts = getShiftsForStaffAndDate(staff.id, dateStr);
                  const isTdy = isToday(day);
                  const isWknd = isWeekend(day);
                  const isSelectedForMove = selectedShiftForMove?.staffId === staff.id && selectedShiftForMove?.dateStr === dateStr;
                  const isSelectedRequester = shiftToSwap?.staff_id === staff.id && shiftToSwap?.date === dateStr;
                  const isSelectedTarget = targetShiftToSwap?.staff_id === staff.id && targetShiftToSwap?.date === dateStr;

                  // Check for pending swaps
                  const pendingSwap = pendingSwaps.find(s => 
                    (s.requester_staff_id === staff.id && s.requester_date === dateStr) ||
                    (s.target_staff_id === staff.id && s.target_date === dateStr)
                  );
                  const isPendingSwap = !!pendingSwap;

                  // Check for approved swaps
                  const approvedSwap = approvedSwaps.find(s => 
                    (s.requester_staff_id === staff.id && s.requester_date === dateStr) ||
                    (s.target_staff_id === staff.id && s.target_date === dateStr)
                  );
                  
                  // Check if this cell is part of any currently hovered swap
                  const isHoveredSwap = approvedSwaps.some(s => 
                    hoveredSwapIds.includes(s.id) && (
                      (s.requester_staff_id === staff.id && s.requester_date === dateStr) ||
                      (s.target_staff_id === staff.id && s.target_date === dateStr)
                    )
                  );

                  return (
                    <td
                      key={dateStr}
                      onMouseEnter={() => {
                        // Find all swaps involving THIS cell
                        const cellSwaps = approvedSwaps.filter(s => 
                          (s.requester_staff_id === staff.id && s.requester_date === dateStr) ||
                          (s.target_staff_id === staff.id && s.target_date === dateStr)
                        );
                        if (cellSwaps.length > 0) {
                          setHoveredSwapIds(cellSwaps.map(s => s.id));
                        }
                      }}
                      onMouseLeave={() => setHoveredSwapIds([])}
                      onClick={() => {
                        const staffObj = staffList.find(s => s.id === staff.id);
                        const shiftObj = shifts.find(s => s.staff_id === staff.id && s.date === dateStr) || null;
                        
                        // If admin and NOT published, allow direct editing
                        if (isAdmin && !isPublished) {
                          onCellClick(staff.id, dateStr, currentShifts);
                        } 
                        // If logged in (admin or user) and published (or not admin), allow swap request
                        else if (user && staffObj) {
                          onShiftSwapRequest(staffObj, dateStr, shiftObj);
                        }
                      }}
                      className={clsx(
                        "shift-cell px-0.5 py-2 text-center text-xs border-r border-slate-100 cursor-pointer transition-all relative",
                        (isAdmin && !isPublished) && "hover:bg-slate-100/50",
                        isTdy && currentShifts.length === 0 && "bg-indigo-50/20",
                        isWknd && currentShifts.length === 0 && "bg-rose-50/20",
                        isSelectedForMove && "ring-2 ring-indigo-500 ring-inset bg-indigo-50",
                        isSelectedRequester && "ring-2 ring-emerald-500 ring-inset bg-emerald-50",
                        isSelectedTarget && "ring-2 ring-amber-500 ring-inset bg-amber-50",
                        isPendingSwap && "bg-yellow-200 ring-2 ring-yellow-500 ring-inset z-10 shadow-lg shadow-yellow-100",
                        isHoveredSwap && "bg-blue-100 ring-2 ring-blue-500 ring-inset z-20 shadow-lg shadow-blue-200"
                      )}
                    >
                      {currentShifts.length > 0 ? (
                        currentShifts.map((shiftType, idx) => (
                          <div key={`${dateStr}-${idx}`} className={clsx(
                            "shift w-full flex items-center justify-center text-[11px] font-bold transition-all py-1.5 rounded-md border shadow-sm",
                            shiftColors[shiftType],
                            isSelectedForMove && selectedShiftForMove?.shiftType === shiftType && "ring-2 ring-indigo-500 ring-inset z-10 relative",
                            isSelectedRequester && "ring-2 ring-emerald-500 ring-inset z-10 relative",
                            isSelectedTarget && "ring-2 ring-amber-500 ring-inset z-10 relative",
                            isPendingSwap && "opacity-100 ring-2 ring-yellow-600 ring-inset z-10 relative font-extrabold",
                            isHoveredSwap && "opacity-100 ring-2 ring-blue-600 ring-inset z-10 relative font-extrabold"
                          )}>
                            {shiftLabels[shiftType]}
                          </div>
                        ))
                      ) : (
                        <div className={clsx(
                          "w-full h-7 flex items-center justify-center text-slate-200 hover:text-slate-300 transition-colors",
                          isPendingSwap && "text-yellow-600 font-bold bg-yellow-50/50 rounded-md ring-1 ring-yellow-300",
                          isHoveredSwap && "text-blue-600 font-bold bg-blue-50/50 rounded-md ring-1 ring-blue-300"
                        )}>
                          {isPendingSwap ? (
                            <span className="text-[8px] text-yellow-700">รอแลก</span>
                          ) : isHoveredSwap ? (
                            <span className="text-[8px] text-blue-700">แลกแล้ว</span>
                          ) : (
                            <div className="w-1 h-1 rounded-full bg-current"></div>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="px-1 py-3 whitespace-nowrap text-center bg-indigo-50/10 border-l border-slate-100">
                  <span className="text-sm font-bold text-indigo-600">{totalShifts}</span>
                </td>
                <td className="px-1 py-3 whitespace-nowrap text-center bg-emerald-50/10 border-l border-slate-100">
                  <span className="text-sm font-bold text-emerald-600">{totalPay.toLocaleString()}</span>
                </td>
              </tr>
            );
          })}
          {staffList.length > 0 && (
            <tr className="bg-slate-50/80 font-bold">
              <td className="px-3 py-3 whitespace-nowrap text-xs text-slate-900 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
              </td>
              <td colSpan={days.length} className="px-4 py-3 text-right text-xs text-slate-900 border-r border-slate-100">
                รวมทั้งหมด
              </td>
              <td className="px-1 py-3 whitespace-nowrap text-center bg-indigo-100/30 border-l border-slate-200">
                <span className="text-sm font-black text-indigo-700">
                  {staffList.reduce((acc, staff) => {
                    const staffShifts = shifts.filter(s => s.staff_id === staff.id);
                    let m = 0, a = 0, n = 0;
                    staffShifts.forEach(s => {
                      if (s.shift_type) {
                        const types = s.shift_type.split(',');
                        if (types.includes('M')) m++;
                        if (types.includes('A')) a++;
                        if (types.includes('N')) n++;
                      }
                    });
                    return acc + m + ((a + n) / 2);
                  }, 0)}
                </span>
              </td>
              <td className="px-1 py-3 whitespace-nowrap text-center bg-emerald-100/30 border-l border-slate-200">
                <span className="text-sm font-black text-emerald-700">
                  ฿{staffList.reduce((acc, staff) => {
                    const staffShifts = shifts.filter(s => s.staff_id === staff.id);
                    let m = 0, a = 0, n = 0;
                    staffShifts.forEach(s => {
                      if (s.shift_type) {
                        const types = s.shift_type.split(',');
                        if (types.includes('M')) m++;
                        if (types.includes('A')) a++;
                        if (types.includes('N')) n++;
                      }
                    });
                    return acc + (m + ((a + n) / 2)) * 750;
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
  );
}
