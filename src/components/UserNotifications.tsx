import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Staff, Shift, ShiftType, ShiftSwapRequest, ShiftSwapStatus, User } from '../types';
import { format, isValid } from 'date-fns';
import { CheckCircle, XCircle, Clock, Bell, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

interface UserNotificationsProps {
  user: User;
  allStaff: Staff[];
  allShifts: Shift[];
  onUpdate: () => void;
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

export function UserNotifications({ user, allStaff, allShifts, onUpdate }: UserNotificationsProps) {
  const [requests, setRequests] = useState<ShiftSwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const currentUserStaff = allStaff.find(s => s.name === user.name);

  useEffect(() => {
    if (currentUserStaff) {
      console.log('UserNotifications mounted for:', currentUserStaff.name);
      fetchUserRequests();
      
      // Poll for new requests every 10 seconds
      const interval = setInterval(() => {
        fetchUserRequests();
      }, 10000);

      return () => clearInterval(interval);
    } else {
      console.log('UserNotifications: No current staff found for user:', user?.name);
    }
  }, [currentUserStaff]);

  const fetchUserRequests = async () => {
    if (!currentUserStaff) return;
    // Don't set loading to true on background polls to avoid UI flickering
    // Only set loading on initial fetch or manual refresh
    
    try {
      const { data, error } = await supabase
        .from('shift_swap_requests')
        .select('*')
        .eq('target_staff_id', currentUserStaff.id)
        .eq('status', ShiftSwapStatus.WAITING_TARGET)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching user notifications:', err);
      // Don't show error on every poll failure to avoid annoyance
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = () => {
    setLoading(true);
    fetchUserRequests();
  };

  const handleAccept = async (request: ShiftSwapRequest) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('shift_swap_requests')
        .update({ 
          status: ShiftSwapStatus.PENDING, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', request.id);

      if (error) throw error;

      await supabase.from('logs').insert({
        message: `Staff ${user.name} accepted swap request ${request.id} from ${getStaffName(request.requester_staff_id)}. Now pending Admin approval.`,
        action_type: 'SHIFT_SWAP_ACCEPTED_BY_TARGET'
      });

      alert('ยืนยันการสลับเวรแล้ว กรุณารอผู้ดูแลระบบอนุมัติขั้นสุดท้าย');
      fetchUserRequests();
      onUpdate();
    } catch (err) {
      console.error('Error accepting swap request:', err);
      alert('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (request: ShiftSwapRequest) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('shift_swap_requests')
        .update({ 
          status: ShiftSwapStatus.REJECTED, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', request.id);

      if (error) throw error;

      await supabase.from('logs').insert({
        message: `Staff ${user.name} rejected swap request ${request.id} from ${getStaffName(request.requester_staff_id)}`,
        action_type: 'SHIFT_SWAP_REJECTED_BY_TARGET'
      });

      alert('ปฏิเสธคำขอสลับเวรแล้ว');
      fetchUserRequests();
      onUpdate();
    } catch (err) {
      console.error('Error rejecting swap request:', err);
      alert('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  const getStaffName = (id: string) => {
    if (!id) return 'ไม่ระบุ';
    return allStaff.find(s => s.id === id)?.name || 'ไม่พบพนักงาน';
  };

  const formatDateSafe = (dateStr: string) => {
    if (!dateStr) return 'ไม่ระบุวันที่';
    const date = new Date(dateStr);
    if (!isValid(date)) return 'วันที่ไม่ถูกต้อง';
    return format(date, 'dd/MM');
  };

  const getShiftColor = (type: string) => {
    if (!type) return shiftColors['O'];
    return shiftColors[type as ShiftType] || shiftColors['O'];
  };

  if (!currentUserStaff) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
        title="การแจ้งเตือน"
      >
        <Bell className="w-4 h-4" />
        {requests.length > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900">คำขอสลับเวร</h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleManualRefresh}
                className="p-1 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition-colors"
                title="รีเฟรช"
              >
                <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} />
              </button>
              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                {requests.length} รายการ
              </span>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
              </div>
            ) : requests.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                ไม่มีคำขอที่รอดำเนินการ
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {requests.map(request => (
                  <div key={request.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {getStaffName(request.requester_staff_id)}
                        </p>
                        <p className="text-[10px] text-slate-500">ต้องการสลับเวรกับคุณ</p>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-3 mb-3 space-y-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 uppercase font-bold">เวรของเขา:</span>
                        <span className={clsx("px-1.5 py-0.5 rounded font-bold", getShiftColor(request.requester_shift_type))}>
                          {formatDateSafe(request.requester_date)} ({request.requester_shift_type})
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 uppercase font-bold">เวรของคุณ:</span>
                        <span className={clsx("px-1.5 py-0.5 rounded font-bold", getShiftColor(request.target_shift_type))}>
                          {request.target_shift_id ? formatDateSafe(request.target_date) : 'ช่องว่าง'} ({request.target_shift_type})
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(request)}
                        className="flex-1 py-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-100"
                      >
                        ปฏิเสธ
                      </button>
                      <button
                        onClick={() => handleAccept(request)}
                        className="flex-1 py-1.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm shadow-emerald-100"
                      >
                        ยืนยันการสลับ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
