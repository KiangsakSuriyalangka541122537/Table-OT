import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Staff, Shift, ShiftType, ShiftSwapRequest, ShiftSwapStatus } from '../types';
import { format, isValid } from 'date-fns';
import { CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import clsx from 'clsx';
import { applyShiftOperations, generateMoveOperations, ShiftOperation } from '../lib/shiftOperations';

interface ShiftSwapRequestsManagerProps {
  allStaff: Staff[];
  allShifts: Shift[];
  onUpdate: () => void; // Callback to refresh data in App.tsx
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

export function ShiftSwapRequestsManager({ allStaff, allShifts, onUpdate }: ShiftSwapRequestsManagerProps) {
  const [pendingRequests, setPendingRequests] = useState<ShiftSwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('shift_swap_requests')
        .select('*')
        .in('status', [ShiftSwapStatus.PENDING, ShiftSwapStatus.WAITING_TARGET])
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPendingRequests(data || []);
    } catch (err) {
      console.error('Error fetching pending swap requests:', err);
      setError('ไม่สามารถดึงคำขอย้ายเวรได้');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: ShiftSwapRequest) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Apply shift changes
      const types = request.requester_shift_type.split(',');
      const allOperations: ShiftOperation[] = [];
      for (const type of types) {
        const operations = generateMoveOperations(
          request.requester_staff_id,
          request.requester_date,
          request.target_staff_id,
          request.target_date,
          type.trim() as ShiftType
        );
        allOperations.push(...operations);
      }
      await applyShiftOperations(allOperations);

      // 2. Update request status
      const { error: updateError } = await supabase.from('shift_swap_requests').update({ 
        status: ShiftSwapStatus.APPROVED, 
        updated_at: new Date().toISOString() 
      }).eq('id', request.id);

      if (updateError) throw updateError;

      // 4. Log action
      await supabase.from('logs').insert({
        message: `Admin approved move request ${request.id} from ${request.requester_staff_id} to ${request.target_staff_id}`,
        action_type: 'SHIFT_MOVE_APPROVED'
      });

      alert('อนุมัติคำขอย้ายเวรเรียบร้อยแล้ว');
      fetchPendingRequests();
      onUpdate(); // Refresh main roster grid
    } catch (err) {
      console.error('Error approving move request:', err);
      setError('เกิดข้อผิดพลาดในการอนุมัติคำขอ');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (request: ShiftSwapRequest) => {
    setLoading(true);
    setError(null);
    try {
      await supabase.from('shift_swap_requests').update({ status: ShiftSwapStatus.REJECTED, updated_at: new Date().toISOString() }).eq('id', request.id);

      await supabase.from('logs').insert({
        message: `Admin rejected swap request ${request.id} between ${request.requester_staff_id} and ${request.target_staff_id}`,
        action_type: 'SHIFT_SWAP_REJECTED'
      });

      alert('ปฏิเสธคำขอย้ายเวรเรียบร้อยแล้ว');
      fetchPendingRequests();
      onUpdate(); // Refresh main roster grid
    } catch (err) {
      console.error('Error rejecting swap request:', err);
      setError('เกิดข้อผิดพลาดในการปฏิเสธคำขอ');
    } finally {
      setLoading(false);
    }
  };

  const getStaffName = (id: string) => allStaff.find(s => s.id === id)?.name || 'ไม่พบพนักงาน';

  const formatDateSafe = (dateStr: string) => {
    if (!dateStr) return 'ไม่ระบุวันที่';
    const date = new Date(dateStr);
    if (!isValid(date)) return 'วันที่ไม่ถูกต้อง';
    return format(date, 'dd MMMM yyyy');
  };

  const getShiftLabel = (type: string) => {
    if (!type) return shiftLabels['O'];
    return type.split(',').map(t => shiftLabels[t as ShiftType] || t).join(' + ');
  };
  const getShiftColor = (type: string) => {
    if (!type) return shiftColors['O'];
    const types = type.split(',');
    return shiftColors[types[0] as ShiftType] || shiftColors['O'];
  };

  return (
    <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
      <div className="flex items-center mb-6">
        <Users className="w-5 h-5 text-indigo-600 mr-3" />
        <h2 className="text-xl font-bold text-gray-900">คำขอย้ายเวรที่รอดำเนินการ</h2>
      </div>

      {loading && (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-4">
          {error}
        </div>
      )}

      {!loading && pendingRequests.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          ไม่พบคำขอย้ายเวรที่รอดำเนินการ
        </div>
      )}

      {!loading && pendingRequests.length > 0 && (
        <div className="space-y-6">
          {pendingRequests.map(request => (
            <div key={request.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">
                  <Clock className="w-4 h-4 inline-block mr-1 text-gray-500" />
                  ส่งเมื่อ: {format(new Date(request.created_at), 'dd MMMM yyyy HH:mm')}
                </p>
                <span className={clsx(
                  "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  request.status === ShiftSwapStatus.WAITING_TARGET ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"
                )}>
                  {request.status === ShiftSwapStatus.WAITING_TARGET ? 'รอเพื่อนยืนยัน' : 'รออนุมัติ'}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Requester's Shift */}
                <div className="border border-gray-300 rounded-lg p-3 bg-white">
                  <h3 className="text-md font-semibold text-gray-800 mb-2">ผู้ขอย้ายเวร</h3>
                  <p className="text-sm text-gray-700 mb-1">ชื่อ: {getStaffName(request.requester_staff_id)}</p>
                  <p className="text-sm text-gray-700 mb-1">วันที่: {formatDateSafe(request.requester_date)}</p>
                  <p className="text-sm text-gray-700">กะ: 
                    <span className={clsx("px-2 py-0.5 rounded-md text-xs font-medium ml-1", getShiftColor(request.requester_shift_type))}>
                      {getShiftLabel(request.requester_shift_type)} ({request.requester_shift_type})
                    </span>
                  </p>
                </div>

                {/* Target's Shift */}
                <div className="border border-gray-300 rounded-lg p-3 bg-white">
                  <h3 className="text-md font-semibold text-gray-800 mb-2">ต้องการย้ายไปให้</h3>
                  <p className="text-sm text-gray-700 mb-1">ชื่อ: {getStaffName(request.target_staff_id)}</p>
                  <p className="text-sm text-gray-700 mb-1">วันที่: {formatDateSafe(request.target_date)}</p>
                  <p className="text-sm text-gray-700">กะเดิม: 
                    <span className={clsx("px-2 py-0.5 rounded-md text-xs font-medium ml-1", getShiftColor(request.target_shift_type))}>
                      {getShiftLabel(request.target_shift_type)} ({request.target_shift_type})
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => handleReject(request)}
                  disabled={loading}
                  className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-4 h-4 inline-block mr-2" /> ปฏิเสธ
                </button>
                <button
                  onClick={() => handleApprove(request)}
                  disabled={loading || request.status === ShiftSwapStatus.WAITING_TARGET}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4 inline-block mr-2" /> อนุมัติ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
