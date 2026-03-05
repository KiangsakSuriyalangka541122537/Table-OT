import React, { useState, useEffect } from 'react';
import { X, Calendar, User as UserIcon, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Staff, Shift, ShiftType, ShiftSwapRequest, ShiftSwapStatus } from '../types';
import { format } from 'date-fns';
import clsx from 'clsx';

interface ShiftSwapRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendRequest: (request: Omit<ShiftSwapRequest, 'id' | 'status' | 'created_at' | 'updated_at'>) => void;
  currentStaff: Staff | null; // The logged-in staff
  initialRequesterShift: Shift | null; // Optional: The shift the user clicked (if it's theirs)
  initialTargetShift: Shift | null; // Optional: The shift the user clicked (if it's someone else's)
  allStaff: Staff[];
  allShifts: Shift[];
}

const shiftLabels: Record<ShiftType, string> = {
  M: 'เช้า', A: 'บ่าย', N: 'ดึก', O: 'หยุด'
};

const shiftColors: Record<ShiftType, string> = {
  M: 'bg-blue-100 text-blue-800 border-blue-200',
  A: 'bg-orange-100 text-orange-800 border-orange-200',
  N: 'bg-purple-100 text-purple-800 border-purple-200',
  O: 'bg-gray-100 text-gray-500 border-gray-200',
};

export function ShiftSwapRequestModal({
  isOpen,
  onClose,
  onSendRequest,
  currentStaff,
  initialRequesterShift,
  initialTargetShift,
  allStaff,
  allShifts,
}: ShiftSwapRequestModalProps) {
  const [requesterShiftId, setRequesterShiftId] = useState<string>('');
  const [targetStaffId, setTargetStaffId] = useState<string>('');
  const [targetShiftId, setTargetShiftId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setRequesterShiftId(initialRequesterShift?.id || '');
      setTargetStaffId(initialTargetShift?.staff_id || '');
      setTargetShiftId(initialTargetShift?.id || '');
      setError(null);
      setLoading(false);
    }
  }, [isOpen, initialRequesterShift, initialTargetShift]);

  if (!isOpen || !currentStaff) return null;

  // Shifts belonging to the logged-in user that they can give away
  const myShifts = allShifts.filter(s => s.staff_id === currentStaff.id);

  const handleSendRequest = async () => {
    setError(null);
    if (!requesterShiftId || !targetStaffId || !targetShiftId) {
      setError('กรุณาเลือกกะของคุณและกะที่ต้องการสลับด้วย');
      return;
    }

    const requesterShift = allShifts.find(s => s.id === requesterShiftId);
    let targetShift = allShifts.find(s => s.id === targetShiftId);

    if (!requesterShift) {
      setError('ไม่พบข้อมูลกะของคุณ');
      return;
    }

    const targetDate = targetShift?.date || (targetShiftId.startsWith('empty-') ? targetShiftId.split('-').slice(2).join('-') : '');

    if (!targetDate) {
      setError('ไม่สามารถระบุวันที่ของกะเป้าหมายได้ กรุณาลองใหม่อีกครั้ง');
      return;
    }

    setLoading(true);
    try {
      await onSendRequest({
        requester_staff_id: currentStaff.id,
        requester_shift_id: requesterShift.id,
        requester_date: requesterShift.date,
        requester_shift_type: requesterShift.shift_type,
        target_staff_id: targetStaffId,
        target_shift_id: targetShiftId.startsWith('empty-') ? null : targetShiftId,
        target_date: targetDate,
        target_shift_type: targetShift?.shift_type || 'O', // Default to 'O' for empty slots
      });
      onClose();
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการส่งคำขอสลับเวร');
      console.error('Error sending swap request:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedRequesterShift = allShifts.find(s => s.id === requesterShiftId);
  let selectedTargetShift = allShifts.find(s => s.id === targetShiftId);
  
  // Handle virtual shift for display
  if (!selectedTargetShift && targetShiftId.startsWith('empty-')) {
    const parts = targetShiftId.split('-');
    selectedTargetShift = {
      id: targetShiftId,
      staff_id: parts[1],
      date: parts.slice(2).join('-'),
      shift_type: 'O'
    };
  }
  const selectedTargetStaff = allStaff.find(s => s.id === targetStaffId);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative bg-white rounded-xl shadow-xl p-8 w-full max-w-md mx-4">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">ขอสลับเวร</h2>
          <p className="text-gray-500 mt-2">กรุณาเลือกกะที่ต้องการสลับด้วย</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-6">
          {/* Summary (Always show if both are selected) */}
          {selectedRequesterShift && selectedTargetShift && selectedTargetStaff && (
            <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
                <span>ยืนยันการสลับเวร</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <div className="flex-1 text-center">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm border border-emerald-100">
                    <span className="text-emerald-600 font-bold text-xs">{selectedRequesterShift.shift_type}</span>
                  </div>
                  <p className="text-[10px] text-emerald-700/60 uppercase font-bold mb-0.5">กะของคุณ</p>
                  <p className="font-bold text-emerald-900 text-sm">{format(new Date(selectedRequesterShift.date), 'dd/MM')}</p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
                    <RefreshCw className="w-4 h-4 text-white animate-spin-slow" />
                  </div>
                </div>
                <div className="flex-1 text-center">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm border border-emerald-100">
                    <span className="text-emerald-600 font-bold text-xs">
                      {selectedTargetShift.id.startsWith('empty-') ? '-' : selectedTargetShift.shift_type}
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-700/60 uppercase font-bold mb-0.5">กะของ {selectedTargetStaff.name.split(' ')[0]}</p>
                  <p className="font-bold text-emerald-900 text-sm">
                    {selectedTargetShift.id.startsWith('empty-') ? 'ช่องว่าง' : format(new Date(selectedTargetShift.date), 'dd/MM')}
                  </p>
                  {selectedTargetShift.id.startsWith('empty-') && (
                    <p className="text-[10px] text-emerald-500 font-medium">{format(new Date(selectedTargetShift.date), 'dd/MM')}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Only show selectors if not fully pre-selected */}
          {(!initialRequesterShift || !initialTargetShift) && (
            <div className="space-y-4 pt-2">
              <div className="h-px bg-slate-100 w-full"></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">หรือเลือกกะอื่น</p>
              
              {/* Requester Shift Selection */}
              <div>
                <label htmlFor="requesterShift" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">กะของคุณ</label>
                <select
                  id="requesterShift"
                  value={requesterShiftId}
                  onChange={(e) => setRequesterShiftId(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2.5 text-sm border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-xl bg-slate-50/50 transition-all font-medium"
                >
                  <option value="">-- เลือกกะของคุณ --</option>
                  {myShifts.map(shift => (
                    <option key={shift.id} value={shift.id}>
                      {shiftLabels[shift.shift_type]} ({shift.shift_type}) - {format(new Date(shift.date), 'dd/MM/yyyy')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Staff Selection */}
              <div>
                <label htmlFor="targetStaff" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">พนักงานที่ต้องการสลับด้วย</label>
                <select
                  id="targetStaff"
                  value={targetStaffId}
                  onChange={(e) => {
                    setTargetStaffId(e.target.value);
                    setTargetShiftId(''); 
                  }}
                  className="block w-full pl-3 pr-10 py-2.5 text-sm border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-xl bg-slate-50/50 transition-all font-medium"
                >
                  <option value="">-- เลือกพนักงาน --</option>
                  {allStaff.filter(s => s.id !== currentStaff.id).map(staff => (
                    <option key={staff.id} value={staff.id}>{staff.name}</option>
                  ))}
                </select>
              </div>

              {/* Target Shift Selection */}
              {targetStaffId && (
                <div>
                  <label htmlFor="targetShift" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">กะของเขาที่ต้องการ</label>
                  <select
                    id="targetShift"
                    value={targetShiftId}
                    onChange={(e) => setTargetShiftId(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2.5 text-sm border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-xl bg-slate-50/50 transition-all font-medium"
                  >
                    <option value="">-- เลือกกะเป้าหมาย --</option>
                    {allShifts
                      .filter(shift => shift.staff_id === targetStaffId)
                      .map(shift => (
                        <option key={shift.id} value={shift.id}>
                          {shiftLabels[shift.shift_type]} ({shift.shift_type}) - {format(new Date(shift.date), 'dd/MM/yyyy')}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSendRequest}
            disabled={loading || !requesterShiftId || !targetStaffId || !targetShiftId}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'กำลังส่งคำขอ...' : 'ส่งคำขอสลับเวร'}
          </button>
        </div>
      </div>
    </div>
  );
}
