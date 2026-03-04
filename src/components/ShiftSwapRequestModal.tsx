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
    const targetShift = allShifts.find(s => s.id === targetShiftId);

    if (!requesterShift || !targetShift) {
      setError('ไม่พบข้อมูลกะที่เลือก');
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
        target_shift_id: targetShift.id,
        target_date: targetShift.date,
        target_shift_type: targetShift.shift_type,
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
  const selectedTargetShift = allShifts.find(s => s.id === targetShiftId);
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
          {/* Requester Shift Selection */}
          <div>
            <label htmlFor="requesterShift" className="block text-sm font-medium text-gray-700 mb-2">กะของคุณที่ต้องการสลับออก</label>
            <select
              id="requesterShift"
              value={requesterShiftId}
              onChange={(e) => setRequesterShiftId(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
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
            <label htmlFor="targetStaff" className="block text-sm font-medium text-gray-700 mb-2">เลือกพนักงานที่ต้องการสลับด้วย</label>
            <select
              id="targetStaff"
              value={targetStaffId}
              onChange={(e) => {
                setTargetStaffId(e.target.value);
                setTargetShiftId(''); 
              }}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
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
              <label htmlFor="targetShift" className="block text-sm font-medium text-gray-700 mb-2">เลือกกะของเขาที่ต้องการ</label>
              <select
                id="targetShift"
                value={targetShiftId}
                onChange={(e) => setTargetShiftId(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
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

          {/* Summary */}
          {selectedRequesterShift && selectedTargetShift && selectedTargetStaff && (
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-indigo-600">
                <span>สรุปการสลับเวร</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 text-center">
                  <p className="text-[10px] text-gray-500 uppercase mb-1">กะของคุณ</p>
                  <p className="font-bold text-gray-900">{shiftLabels[selectedRequesterShift.shift_type]}</p>
                  <p className="text-[10px] text-gray-500">{format(new Date(selectedRequesterShift.date), 'dd/MM')}</p>
                </div>
                <div className="flex-shrink-0">
                  <RefreshCw className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex-1 text-center">
                  <p className="text-[10px] text-gray-500 uppercase mb-1">กะของ {selectedTargetStaff.name.split(' ')[0]}</p>
                  <p className="font-bold text-gray-900">{shiftLabels[selectedTargetShift.shift_type]}</p>
                  <p className="text-[10px] text-gray-500">{format(new Date(selectedTargetShift.date), 'dd/MM')}</p>
                </div>
              </div>
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
