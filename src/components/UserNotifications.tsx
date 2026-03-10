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
  const notificationRef = React.useRef<HTMLDivElement>(null);

  const currentUserStaff = allStaff.find(s => s.name === user.name);
  // If admin, they might want to see all requests? 
  // But the requirement says "swap shifts like others", so they act as a user.
  // So we only show requests targeting them.

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

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
      // Helper to find current shift ID for staff and date
      const findShiftId = async (staffId: string, date: string, shiftType?: string) => {
        let query = supabase.from('shifts').select('id, shift_type').eq('staff_id', staffId).eq('date', date);
        if (shiftType) {
          query = query.ilike('shift_type', `%${shiftType}%`);
        }
        const { data } = await query;
        return data?.[0]?.id || null;
      };

      // 1. Execute Swap Logic Immediately
      // We use staff_id and date to find the current shift records to be swapped,
      // as the IDs in the request might have become stale due to cleanup logic.
      
      const currentRequesterShiftId = await findShiftId(request.requester_staff_id, request.requester_date, request.requester_shift_type);
      const currentTargetShiftId = request.target_shift_id ? await findShiftId(request.target_staff_id, request.target_date, request.target_shift_type) : null;

      if (currentRequesterShiftId && currentTargetShiftId) {
        // Case A: Swapping two existing shifts
        
        // Helper to find paired shift ID
        const getPairedShiftId = async (shiftId: string) => {
          const { data: shift } = await supabase.from('shifts').select('*').eq('id', shiftId).single();
          if (!shift) return null;
          
          let pairedDate = '';
          let pairedType = '';
          
          if (shift.shift_type?.includes('A')) {
            const d = new Date(shift.date);
            d.setDate(d.getDate() + 1);
            pairedDate = d.toISOString().split('T')[0];
            pairedType = 'N';
          } else if (shift.shift_type?.includes('N')) {
            const d = new Date(shift.date);
            d.setDate(d.getDate() - 1);
            pairedDate = d.toISOString().split('T')[0];
            pairedType = 'A';
          } else {
            return null;
          }

          const { data: pairedShifts } = await supabase
            .from('shifts')
            .select('id, shift_type')
            .eq('staff_id', shift.staff_id)
            .eq('date', pairedDate);
            
          const pairedShift = pairedShifts?.find(s => s.shift_type?.includes(pairedType));
          return pairedShift?.id || null;
        };

        const requesterPairedId = await getPairedShiftId(currentRequesterShiftId);
        const targetPairedId = await getPairedShiftId(currentTargetShiftId);

        // Use a temporary date to avoid unique constraint violations during swap
        const TEMP_DATE = '2000-01-01';

        // 1. Move requester's shift to temp date
        const { error: errTemp1 } = await supabase.from('shifts').update({
          date: TEMP_DATE
        }).eq('id', currentRequesterShiftId);
        if (errTemp1) throw new Error(`Failed to move requester shift to temp: ${errTemp1.message}`);

        // 2. Update Target's Shift -> Assign to Requester Staff
        const { error: error2 } = await supabase.from('shifts').update({
          staff_id: request.requester_staff_id
        }).eq('id', currentTargetShiftId);
        if (error2) {
          // Rollback
          await supabase.from('shifts').update({ date: request.requester_date }).eq('id', currentRequesterShiftId);
          throw new Error(`Failed to update target shift: ${error2.message}`);
        }

        // 3. Update Requester's Shift (now at temp date) -> Assign to Target Staff and restore original date
        const { error: error1 } = await supabase.from('shifts').update({
          staff_id: request.target_staff_id,
          date: request.requester_date
        }).eq('id', currentRequesterShiftId);
        
        if (error1) {
           // Rollback is complex here, but we try our best
           await supabase.from('shifts').update({ staff_id: request.target_staff_id }).eq('id', currentTargetShiftId);
           await supabase.from('shifts').update({ date: request.requester_date }).eq('id', currentRequesterShiftId);
           throw new Error(`Failed to update requester shift: ${error1.message}`);
        }

        // Handle paired shifts
        if (requesterPairedId) {
           await supabase.from('shifts').update({
            staff_id: request.target_staff_id
          }).eq('id', requesterPairedId);
        }

        if (targetPairedId) {
          await supabase.from('shifts').update({
           staff_id: request.requester_staff_id
         }).eq('id', targetPairedId);
       }

      } else if (currentRequesterShiftId && !currentTargetShiftId) {
        // Case B: Moving Requester's Shift to an Empty Slot (Target)
        
        const { error: error3 } = await supabase.from('shifts').update({
          staff_id: request.target_staff_id,
          date: request.target_date
        }).eq('id', currentRequesterShiftId);

        if (error3) throw new Error(`Failed to move shift: ${error3.message}`);

        // Handle Paired Shift for Case B
        const { data: shift } = await supabase.from('shifts').select('*').eq('id', currentRequesterShiftId).single();
        if (shift) {
          let pairedDate = '';
          let pairedType = '';
          let targetPairedDate = ''; // Where the paired shift should move to

          if (shift.shift_type?.includes('A')) {
            const d = new Date(shift.date);
            d.setDate(d.getDate() + 1);
            pairedDate = d.toISOString().split('T')[0];
            pairedType = 'N';

            const td = new Date(request.target_date);
            td.setDate(td.getDate() + 1);
            targetPairedDate = td.toISOString().split('T')[0];
          } else if (shift.shift_type?.includes('N')) {
            const d = new Date(shift.date);
            d.setDate(d.getDate() - 1);
            pairedDate = d.toISOString().split('T')[0];
            pairedType = 'A';

            const td = new Date(request.target_date);
            td.setDate(td.getDate() - 1);
            targetPairedDate = td.toISOString().split('T')[0];
          }

          if (pairedDate) {
             const { data: pairedShifts } = await supabase
              .from('shifts')
              .select('id, shift_type')
              .eq('staff_id', request.requester_staff_id)
              .eq('date', pairedDate);
            
            const pairedShift = pairedShifts?.find(s => s.shift_type?.includes(pairedType));
            
            if (pairedShift) {
              await supabase.from('shifts').update({
                staff_id: request.target_staff_id,
                date: targetPairedDate
              }).eq('id', pairedShift.id);
            }
          }
        }
      } else {
        console.warn('Could not find requester shift for swap. It might have been deleted or modified.', {
          staff_id: request.requester_staff_id,
          date: request.requester_date,
          type: request.requester_shift_type
        });
      }

      // 2. Update request status to APPROVED directly
      const { error } = await supabase
        .from('shift_swap_requests')
        .update({ 
          status: ShiftSwapStatus.APPROVED, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', request.id);

      if (error) throw error;

      await supabase.from('logs').insert({
        message: `Staff ${user.name} accepted swap request ${request.id}. Swap executed immediately.`,
        action_type: 'SHIFT_SWAP_APPROVED_BY_TARGET'
      });

      alert('ยืนยันการสลับเวรเรียบร้อยแล้ว ข้อมูลในตารางเวรถูกอัปเดตทันที');
      fetchUserRequests();
      onUpdate(); // Refresh the main grid
      setIsOpen(false);
    } catch (err: any) {
      console.error('Error accepting swap request:', err);
      alert(`เกิดข้อผิดพลาด: ${err.message}`);
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
      setIsOpen(false);
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

  const getShiftLabel = (type: string) => {
    if (!type) return shiftLabels['O'];
    return type.split(',').map(t => shiftLabels[t as ShiftType] || t).join(' + ');
  };

  const getShiftColor = (type: string) => {
    if (!type) return shiftColors['O'];
    const types = type.split(',');
    return shiftColors[types[0] as ShiftType] || shiftColors['O'];
  };

  if (!currentUserStaff) return null;

  return (
    <div className="relative" ref={notificationRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
        title="การแจ้งเตือน"
      >
        <Bell className={clsx("w-4 h-4", requests.length > 0 && "animate-bell-swing origin-top")} />
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
                          {formatDateSafe(request.requester_date)} ({getShiftLabel(request.requester_shift_type)})
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 uppercase font-bold">เวรของคุณ:</span>
                        <span className={clsx("px-1.5 py-0.5 rounded font-bold", getShiftColor(request.target_shift_type))}>
                          {request.target_shift_id ? formatDateSafe(request.target_date) : 'ช่องว่าง'} ({getShiftLabel(request.target_shift_type)})
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
