import React, { useState, useEffect } from 'react';
import { X, Calendar, User as UserIcon, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Staff, Shift, ShiftType, ShiftSwapRequest, ShiftSwapStatus } from '../types';
import { format } from 'date-fns';
import clsx from 'clsx';

interface ShiftSwapRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendRequest: (request: Omit<ShiftSwapRequest, 'id' | 'status' | 'created_at' | 'updated_at'>) => void;
  currentStaff: Staff | null; // The staff initiating the request
  currentShift: Shift | null; // The shift the currentStaff wants to swap out of
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
  currentShift,
  allStaff,
  allShifts,
}: ShiftSwapRequestModalProps) {
  const [targetStaffId, setTargetStaffId] = useState<string>('');
  const [targetShiftId, setTargetShiftId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setTargetStaffId('');
      setTargetShiftId('');
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen || !currentStaff || !currentShift) return null;

  const availableTargetShifts = allShifts.filter(shift => 
    shift.staff_id !== currentStaff.id && // Cannot swap with own shift
    shift.date === currentShift.date // Must be on the same day
  );

  const handleSendRequest = async () => {
    setError(null);
    if (!targetStaffId || !targetShiftId) {
      setError('กรุณาเลือกพนักงานและกะที่ต้องการสลับด้วย');
      return;
    }

    const targetShift = allShifts.find(s => s.id === targetShiftId);
    if (!targetShift) {
      setError('ไม่พบกะเป้าหมาย');
      return;
    }

    setLoading(true);
    try {
      await onSendRequest({
        requester_staff_id: currentStaff.id,
        requester_shift_id: currentShift.id,
        requester_date: currentShift.date,
        requester_shift_type: currentShift.shift_type,
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
          {/* Your Shift */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">กะของคุณ</h3>
            <div className="flex items-center text-gray-700 text-sm mb-1">
              <UserIcon className="w-4 h-4 mr-2 text-gray-500" />
              <span>{currentStaff.name}</span>
            </div>
            <div className="flex items-center text-gray-700 text-sm mb-1">
              <Calendar className="w-4 h-4 mr-2 text-gray-500" />
              <span>{format(new Date(currentShift.date), 'dd MMMM yyyy')}</span>
            </div>
            <div className="flex items-center text-gray-700 text-sm">
              <Clock className="w-4 h-4 mr-2 text-gray-500" />
              <span className={clsx("px-2 py-0.5 rounded-md text-xs font-medium", shiftColors[currentShift.shift_type])}>
                {shiftLabels[currentShift.shift_type]} ({currentShift.shift_type})
              </span>
            </div>
          </div>

          {/* Target Staff Selection */}
          <div>
            <label htmlFor="targetStaff" className="block text-sm font-medium text-gray-700 mb-2">เลือกพนักงานที่ต้องการสลับด้วย</label>
            <select
              id="targetStaff"
              value={targetStaffId}
              onChange={(e) => {
                setTargetStaffId(e.target.value);
                setTargetShiftId(''); // Reset target shift when staff changes
              }}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">-- เลือกพนักงาน --</option>
              {allStaff.filter(s => s.id !== currentStaff.id).map(staff => (
                <option key={staff.id} value={staff.id}>{staff.name}</option>
              ))}
            </select>
          </div>

          {/* Target Shift Selection (filtered by selected staff) */}
          {targetStaffId && (
            <div>
              <label htmlFor="targetShift" className="block text-sm font-medium text-gray-700 mb-2">เลือกกะที่ต้องการสลับ</label>
              <select
                id="targetShift"
                value={targetShiftId}
                onChange={(e) => setTargetShiftId(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">-- เลือกกะ --</option>
                {availableTargetShifts
                  .filter(shift => shift.staff_id === targetStaffId)
                  .map(shift => (
                    <option key={shift.id} value={shift.id}>
                      {shiftLabels[shift.shift_type]} ({shift.shift_type}) - {format(new Date(shift.date), 'dd/MM/yyyy')}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Summary of Target Shift */}
          {selectedTargetShift && selectedTargetStaff && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">กะที่ต้องการสลับด้วย</h3>
              <div className="flex items-center text-gray-700 text-sm mb-1">
                <UserIcon className="w-4 h-4 mr-2 text-gray-500" />
                <span>{selectedTargetStaff.name}</span>
              </div>
              <div className="flex items-center text-gray-700 text-sm mb-1">
                <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                <span>{format(new Date(selectedTargetShift.date), 'dd MMMM yyyy')}</span>
              </div>
              <div className="flex items-center text-gray-700 text-sm">
                <Clock className="w-4 h-4 mr-2 text-gray-500" />
                <span className={clsx("px-2 py-0.5 rounded-md text-xs font-medium", shiftColors[selectedTargetShift.shift_type])}>
                  {shiftLabels[selectedTargetShift.shift_type]} ({selectedTargetShift.shift_type})
                </span>
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
            disabled={loading || !targetStaffId || !targetShiftId}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'กำลังส่งคำขอ...' : 'ส่งคำขอสลับเวร'}
          </button>
        </div>
      </div>
    </div>
  );
}
