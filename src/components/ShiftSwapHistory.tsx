import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShiftSwapRequest, ShiftSwapStatus, Staff } from '../types';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { ArrowRightLeft, Calendar, User, Clock } from 'lucide-react';
import clsx from 'clsx';

interface ShiftSwapHistoryProps {
  staffList: Staff[];
  currentMonth: Date;
  lastUpdated: number; // Prop to trigger refetch
}

export function ShiftSwapHistory({ staffList, currentMonth, lastUpdated }: ShiftSwapHistoryProps) {
  const [history, setHistory] = useState<ShiftSwapRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [currentMonth, lastUpdated]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // Get start and end of the current month to filter history?
      // Or just show latest 10-20 swaps regardless of month?
      // User said "below the roster calendar", implying it might be relevant to the displayed month.
      // However, swaps are actions. Usually we want to see recent actions.
      // Let's filter by the month of the *requester_date* or *target_date* matching the current month.
      
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString();
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString();

      // Supabase doesn't support complex OR filtering easily across different columns with dates in one go without raw SQL or multiple queries.
      // Let's just fetch recent approved swaps and filter client side or just fetch last 50.
      // "History of shift swaps" usually implies recent activity.
      
      const { data, error } = await supabase
        .from('shift_swap_requests')
        .select('*')
        .eq('status', ShiftSwapStatus.APPROVED)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Filter to show only swaps relevant to the current month view?
      // Or just show all recent history?
      // "History of shift swaps" usually means "What happened recently".
      // But if it's "below the roster", maybe it should show swaps *for this month*.
      // Let's filter client side for relevance to current month if possible, or just show all recent.
      // Showing all recent is safer to ensure visibility of actions.
      // But user said "flexible according to screen like the roster".
      
      // Let's try to show swaps that involve dates in the current month.
      const currentMonthStr = format(currentMonth, 'yyyy-MM');
      const filtered = (data || []).filter(item => 
        item.requester_date.startsWith(currentMonthStr) || 
        item.target_date.startsWith(currentMonthStr)
      );

      setHistory(filtered);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStaffName = (id: string) => {
    const staff = staffList.find(s => s.id === id);
    return staff ? staff.name : 'Unknown';
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'd MMM', { locale: th });
  };

  if (loading) {
    return (
      <div className="mt-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-pulse">
        <div className="h-6 bg-slate-100 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-12 bg-slate-50 rounded-xl"></div>
          <div className="h-12 bg-slate-50 rounded-xl"></div>
          <div className="h-12 bg-slate-50 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return null; // Don't show if empty? Or show "No history"?
    // User requested "History ... below the calendar". Better to show the container even if empty or just hide it.
    // Let's show a placeholder if empty.
  }

  return (
    <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
          <ArrowRightLeft className="w-4 h-4" />
        </div>
        <h3 className="font-bold text-slate-800">ประวัติการแลกเวร (เดือน{format(currentMonth, 'MMMM', { locale: th })})</h3>
      </div>
      
      <div className="divide-y divide-slate-100">
        {history.length === 0 ? (
           <div className="p-8 text-center text-slate-400 text-sm">
             ยังไม่มีประวัติการแลกเวรในเดือนนี้
           </div>
        ) : (
          history.map((item) => (
            <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                  {/* Requester Side */}
                  <div className="flex items-center gap-2 bg-slate-100/50 px-3 py-1.5 rounded-lg border border-slate-200/50">
                    <span className="font-bold text-slate-700">{getStaffName(item.requester_staff_id)}</span>
                    <span className={clsx(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded",
                      item.requester_shift_type === 'M' ? "bg-blue-100 text-blue-700" :
                      item.requester_shift_type === 'A' ? "bg-orange-100 text-orange-700" :
                      item.requester_shift_type === 'N' ? "bg-purple-100 text-purple-700" : "bg-slate-200 text-slate-600"
                    )}>
                      {item.requester_shift_type}
                    </span>
                    <span className="text-slate-500 text-xs">{formatDate(item.requester_date)}</span>
                  </div>

                  <ArrowRightLeft className="w-4 h-4 text-slate-400 hidden sm:block" />
                  <div className="w-px h-4 bg-slate-300 sm:hidden mx-auto"></div>

                  {/* Target Side */}
                  <div className="flex items-center gap-2 bg-slate-100/50 px-3 py-1.5 rounded-lg border border-slate-200/50">
                    <span className="font-bold text-slate-700">{getStaffName(item.target_staff_id)}</span>
                    <span className={clsx(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded",
                      item.target_shift_type === 'M' ? "bg-blue-100 text-blue-700" :
                      item.target_shift_type === 'A' ? "bg-orange-100 text-orange-700" :
                      item.target_shift_type === 'N' ? "bg-purple-100 text-purple-700" : "bg-slate-200 text-slate-600"
                    )}>
                      {item.target_shift_type}
                    </span>
                    <span className="text-slate-500 text-xs">{formatDate(item.target_date)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap ml-auto">
                <Clock className="w-3 h-3" />
                <span>{format(new Date(item.updated_at), 'd MMM HH:mm', { locale: th })}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
