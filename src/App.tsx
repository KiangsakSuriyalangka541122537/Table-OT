import React, { useState, useEffect } from 'react';
import { format, addDays, getDaysInMonth } from 'date-fns';
import { th } from 'date-fns/locale';
import { supabase } from './lib/supabase';
import { User, Staff, Shift, ShiftType, RosterStatus, ShiftSwapRequest, ShiftSwapStatus } from './types';
import { exportToExcel } from './utils/exportToExcel';
import { Header } from './components/Header';
import { Grid } from './components/Grid';
import { LoginModal } from './components/LoginModal';
import { ShiftEditModal } from './components/ShiftEditModal';
import { StatsModal } from './components/StatsModal';
import { AdminManager } from './components/AdminManager';
import { ShiftSwapRequestModal } from './components/ShiftSwapRequestModal';
import { ShiftSwapHistory } from './components/ShiftSwapHistory';
import { ExportPDFTemplate } from './components/ExportPDFTemplate';
import { RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';
import { formatShiftDisplay, SHIFT_ORDER } from './utils/shiftUtils';
import { applyShiftOperations, generateMoveOperations, ShiftOperation } from './lib/shiftOperations';

export default function App() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [user, setUser] = useState<User | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [rosterStatus, setRosterStatus] = useState<RosterStatus | null>(null);
  const [pendingSwaps, setPendingSwaps] = useState<ShiftSwapRequest[]>([]);
  const [approvedSwaps, setApprovedSwaps] = useState<ShiftSwapRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  
  // Shift Swap Request Modal state
  const [isShiftSwapRequestModalOpen, setIsShiftSwapRequestModalOpen] = useState(false);
  const [shiftToSwap, setShiftToSwap] = useState<Shift | null>(null);
  const [targetShiftToSwap, setTargetShiftToSwap] = useState<Shift | null>(null);
  const [requesterStaff, setRequesterStaff] = useState<Staff | null>(null);
  
  // Shift Edit Modal state
  const [isShiftEditOpen, setIsShiftEditOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{ staffId: string; dateStr: string; currentShifts: ShiftType[] } | null>(null);

  // Shift Move/Swap state (Admin)
  const [selectedShiftForMove, setSelectedShiftForMove] = useState<{ staffId: string; dateStr: string; shiftType: ShiftType | undefined } | null>(null);

  const monthKey = format(currentMonth, 'yyyy-MM');
  const isAdmin = user?.role === 'admin';
  const pdfRef = React.useRef<HTMLDivElement>(null);
  const [lastActionTimestamp, setLastActionTimestamp] = useState<number>(Date.now());

  useEffect(() => {
    const cleanupDuplicates = async () => {
      try {
        // 1. Migration: Update น.ส. to นางสาว and remove spaces after prefixes
        const { data: staffToUpdate } = await supabase.from('staff').select('id, name');
        if (staffToUpdate) {
          for (const s of staffToUpdate) {
            let newName = s.name;
            // Replace น.ส. with นางสาว
            if (newName.includes('น.ส.')) {
              newName = newName.replace(/น\.ส\./g, 'นางสาว');
            }
            // Remove spaces after prefixes (นาย, นางสาว, นาง)
            newName = newName.replace(/^(นาย|นางสาว|นาง)\s+/g, '$1');
            
            if (newName !== s.name) {
              await supabase.from('staff').update({ name: newName }).eq('id', s.id);
              // Also update users table if exists
              await supabase.from('users').update({ name: newName }).eq('name', s.name);
            }
          }
        }

        // 2. Cleanup duplicates
        const { data: staffData } = await supabase.from('staff').select('*');
        if (staffData) {
          const seen = new Set();
          const duplicates: string[] = [];
          
          staffData.forEach(s => {
            const name = s.name.trim();
            if (seen.has(name)) {
              duplicates.push(s.id);
            } else {
              seen.add(name);
            }
          });

          if (duplicates.length > 0) {
            await supabase.from('staff').delete().in('id', duplicates);
            fetchData();
          }
        }
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    };
    cleanupDuplicates();
    fetchData();
  }, [currentMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Staff
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .order('created_at');
      if (staffError) throw staffError;
      
      // Deduplicate staff by name (keeping the first occurrence)
      const uniqueStaff = (staffData || []).reduce((acc: Staff[], current) => {
        const isDuplicate = acc.some(item => item.name.trim() === current.name.trim());
        if (!isDuplicate) {
          return [...acc, current];
        }
        return acc;
      }, []);
      
      setStaffList(uniqueStaff);

      // Fetch Shifts for current month
      const startDate = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1), 'yyyy-MM-dd');
      const endDate = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0), 'yyyy-MM-dd');
      
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);
      if (shiftsError) throw shiftsError;
      setShifts(shiftsData || []);

      // Fetch Roster Status
      const { data: statusData, error: statusError } = await supabase
        .from('roster_status')
        .select('*')
        .eq('month_key', monthKey)
        .single();
      
      if (statusError && statusError.code !== 'PGRST116') {
        throw statusError;
      }
      setRosterStatus(statusData || { month_key: monthKey, is_published: false, original_assignments: null });

      // Fetch Pending Swaps
      const { data: pendingSwapsData, error: pendingSwapsError } = await supabase
        .from('shift_swap_requests')
        .select('*')
        .in('status', [ShiftSwapStatus.PENDING, ShiftSwapStatus.WAITING_TARGET]);
      
      if (pendingSwapsError) throw pendingSwapsError;
      setPendingSwaps(pendingSwapsData || []);

      // Fetch Approved Swaps
      const { data: approvedSwapsData, error: approvedSwapsError } = await supabase
        .from('shift_swap_requests')
        .select('*')
        .eq('status', ShiftSwapStatus.APPROVED);
      
      if (approvedSwapsError) throw approvedSwapsError;
      setApprovedSwaps(approvedSwapsData || []);
      
      setLastActionTimestamp(Date.now());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = async (staffId: string, dateStr: string, currentShifts: ShiftType[]) => {
    if (!isAdmin) return;

    if (selectedShiftForMove) {
      if (selectedShiftForMove.staffId === staffId && selectedShiftForMove.dateStr === dateStr) {
        // Clicked the same cell again -> Open Edit Modal
        setSelectedShiftForMove(null);
        setEditingCell({ staffId, dateStr, currentShifts });
        setIsShiftEditOpen(true);
        return;
      }

      // Perform Move
      setLoading(true);
      try {
        const sourceStaffId = selectedShiftForMove.staffId;
        const sourceDateStr = selectedShiftForMove.dateStr;
        const typeToMove = selectedShiftForMove.shiftType;
        
        const targetStaffId = staffId;
        const targetDateStr = dateStr;

        if (!typeToMove) throw new Error("No shift type selected");

        const operations = generateMoveOperations(
          sourceStaffId,
          sourceDateStr,
          targetStaffId,
          targetDateStr,
          typeToMove
        );

        await applyShiftOperations(operations);
        
        await supabase.from('logs').insert({
          message: `Admin moved shift ${typeToMove} from ${sourceStaffId} on ${sourceDateStr} to ${targetStaffId} on ${targetDateStr}`,
          action_type: 'SHIFT_MOVE'
        });

        await fetchData(); // Refresh shifts
      } catch (error) {
        console.error("Error moving shift:", error);
        alert("เกิดข้อผิดพลาดในการย้ายเวร");
      } finally {
        setLoading(false);
        setSelectedShiftForMove(null);
      }
    } else {
      if (currentShifts.length === 1) {
        // Select for move
        setSelectedShiftForMove({ staffId, dateStr, shiftType: currentShifts[0] });
      } else if (currentShifts.length > 1) {
        // If multiple shifts, open edit modal directly
        setEditingCell({ staffId, dateStr, currentShifts });
        setIsShiftEditOpen(true);
      } else {
        // Open edit modal to add new shift
        setEditingCell({ staffId, dateStr, currentShifts: [] });
        setIsShiftEditOpen(true);
      }
    }
  };

  const handleRequestShiftMove = (staff: Staff, dateStr: string, shift: Shift | null) => {
    if (isAdmin && !rosterStatus?.is_published) return; 
    
    const currentUserStaff = staffList.find(s => s.name === user?.name);
    if (!currentUserStaff) {
      alert('ไม่พบข้อมูลพนักงานของคุณในระบบ กรุณาติดต่อผู้ดูแลระบบ');
      return;
    }

    setRequesterStaff(currentUserStaff);

    if (staff.id === currentUserStaff.id) {
      // Clicking own row
      if (!shift) return; // Can't move an empty slot
      
      if (shiftToSwap?.id === shift.id) {
        setShiftToSwap(null);
      } else {
        setShiftToSwap(shift);
      }
    } else {
      // Clicking someone else's row
      if (!shiftToSwap) {
        alert('กรุณาเลือกเวรของคุณที่ต้องการย้ายก่อน');
        return;
      }

      const targetShift = shift || {
        id: `empty-${staff.id}-${dateStr}`,
        staff_id: staff.id,
        date: dateStr,
        shift_type: 'O'
      };
      
      setTargetShiftToSwap(targetShift);
      setIsShiftSwapRequestModalOpen(true); // Open modal immediately when target is selected
    }
  };

  const handleSendSwapRequest = async (request: Omit<ShiftSwapRequest, 'id' | 'status' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Sending move request:', request);
      const isSelfMove = request.target_staff_id === request.requester_staff_id;
      const initialStatus = isSelfMove ? ShiftSwapStatus.APPROVED : ShiftSwapStatus.WAITING_TARGET;
      
      if (isSelfMove) {
        // Apply shifts immediately if moving to self (e.g. admin moving their own shift)
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
      }

      const { error } = await supabase.from('shift_swap_requests').insert({
        ...request,
        target_shift_id: request.target_shift_id && !request.target_shift_id.startsWith('empty-') 
          ? request.target_shift_id 
          : null,
        status: initialStatus
      });

      if (error) {
        console.error('Supabase error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      await supabase.from('logs').insert({
        message: `Staff ${request.requester_staff_id} moved shift ${request.requester_shift_type} to ${request.target_staff_id} on ${request.target_date}. Status: ${initialStatus}`,
        action_type: isSelfMove ? 'SHIFT_MOVE_COMPLETED' : 'SHIFT_MOVE_REQUEST_SENT'
      });

      alert(isSelfMove 
        ? 'ย้ายเวรเรียบร้อยแล้ว' 
        : 'ส่งคำขอย้ายเวรแล้ว กรุณารอเพื่อนร่วมงานยืนยัน');
      
      setShiftToSwap(null);
      setTargetShiftToSwap(null);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error sending move request:', error);
      alert('เกิดข้อผิดพลาดในการส่งคำขอย้ายเวร');
    }
  };

  const handleSaveShift = async (newShiftType: ShiftType | null) => {
    if (!editingCell) return;
    const { staffId, dateStr } = editingCell;

    try {
      const currentShift = shifts.find(s => s.staff_id === staffId && s.date === dateStr);
      const currentTypes = currentShift && currentShift.shift_type ? currentShift.shift_type.split(',') : [];

      const operations: { staffId: string, date: string, type: ShiftType, action: 'add' | 'remove' }[] = [];

      if (newShiftType === null) {
        for (const type of currentTypes) {
          operations.push({ staffId, date: dateStr, type, action: 'remove' });
          if (type === 'A') {
            operations.push({ staffId, date: format(addDays(new Date(dateStr), 1), 'yyyy-MM-dd'), type: 'N', action: 'remove' });
          } else if (type === 'N') {
            operations.push({ staffId, date: format(addDays(new Date(dateStr), -1), 'yyyy-MM-dd'), type: 'A', action: 'remove' });
          }
        }
      } else {
        const isAdding = !currentTypes.includes(newShiftType);
        operations.push({ staffId, date: dateStr, type: newShiftType, action: isAdding ? 'add' : 'remove' });
        
        if (newShiftType === 'A') {
          operations.push({ staffId, date: format(addDays(new Date(dateStr), 1), 'yyyy-MM-dd'), type: 'N', action: isAdding ? 'add' : 'remove' });
        } else if (newShiftType === 'N') {
          operations.push({ staffId, date: format(addDays(new Date(dateStr), -1), 'yyyy-MM-dd'), type: 'A', action: isAdding ? 'add' : 'remove' });
        }
      }

      await applyShiftOperations(operations);

      await supabase.from('logs').insert({
        message: `Admin updated shifts for staff ${staffId} on ${dateStr}. Action: ${newShiftType}`,
        action_type: 'SHIFT_UPDATE'
      });

      fetchData();
    } catch (error) {
      console.error('Error saving shift:', error);
      alert('Failed to save shift. Please try again.');
    }
  };

  const handlePublishToggle = async () => {
    if (!isAdmin) return;
    
    // If already published, prevent un-publishing (Draft mode)
    if (rosterStatus?.is_published) {
      alert('ไม่สามารถเปลี่ยนกลับเป็นโหมดร่างได้เมื่อเผยแพร่แล้ว');
      return;
    }

    const newStatus = !rosterStatus?.is_published;
    
    try {
      await supabase.from('roster_status').upsert({
        month_key: monthKey,
        is_published: newStatus,
        original_assignments: newStatus ? shifts : rosterStatus?.original_assignments
      });
      
      setRosterStatus(prev => prev ? { ...prev, is_published: newStatus } : null);
      
      await supabase.from('logs').insert({
        message: `Admin ${newStatus ? 'published' : 'unpublished'} roster for ${monthKey}`,
        action_type: 'ROSTER_STATUS_UPDATE'
      });
    } catch (error) {
      console.error('Error updating publish status:', error);
    }
  };

  const handleResetMonth = async () => {
    if (!isAdmin) return;
    
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลตารางเวรทั้งหมดในเดือน ${format(currentMonth, 'MMMM yyyy', { locale: th })}?\n\nการกระทำนี้จะลบเวรทั้งหมดในเดือนนี้และเปลี่ยนสถานะกลับเป็นโหมดร่าง (Draft Mode) และไม่สามารถกู้คืนได้`)) {
      return;
    }

    setLoading(true);
    try {
      const startDate = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1), 'yyyy-MM-dd');
      const endDate = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0), 'yyyy-MM-dd');
      
      // 1. Delete all swap requests for the current month FIRST
      // Delete where requester_date is in the current month
      const { error: swapDeleteError1 } = await supabase
        .from('shift_swap_requests')
        .delete()
        .gte('requester_date', startDate)
        .lte('requester_date', endDate);

      if (swapDeleteError1) {
        console.error('Error deleting swap requests (requester):', swapDeleteError1);
        throw swapDeleteError1;
      }

      // Delete where target_date is in the current month
      const { error: swapDeleteError2 } = await supabase
        .from('shift_swap_requests')
        .delete()
        .gte('target_date', startDate)
        .lte('target_date', endDate);

      if (swapDeleteError2) {
        console.error('Error deleting swap requests (target):', swapDeleteError2);
        throw swapDeleteError2;
      }

      // 2. Delete all shifts for the current month
      const { error: deleteError } = await supabase
        .from('shifts')
        .delete()
        .gte('date', startDate)
        .lte('date', endDate);
        
      if (deleteError) throw deleteError;

      // Clear local states immediately for better UX
      setShifts([]);
      setPendingSwaps([]);
      setApprovedSwaps([]);
      setLastActionTimestamp(Date.now());

      // 2. Set roster status to Draft (is_published: false)
      const { error: statusError } = await supabase.from('roster_status').upsert({
        month_key: monthKey,
        is_published: false,
        original_assignments: null
      });

      if (statusError) throw statusError;

      // 3. Log action
      await supabase.from('logs').insert({
        message: `Admin reset all shifts for ${monthKey}`,
        action_type: 'ROSTER_RESET'
      });

      alert('ล้างข้อมูลตารางเวรเรียบร้อยแล้ว');
      await fetchData();
    } catch (error) {
      console.error('Error resetting month:', error);
      alert('เกิดข้อผิดพลาดในการล้างข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!pdfRef.current) {
      alert('ไม่พบข้อมูลสำหรับสร้าง PDF');
      return;
    }

    try {
      const container = pdfRef.current;
      const pages = container.querySelectorAll('.pdf-page');
      
      if (pages.length === 0) {
        alert('ไม่พบหน้าเอกสารสำหรับสร้าง PDF');
        return;
      }

      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        
        const dataUrl = await toPng(page, { 
          quality: 1.0,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
        });

        if (i > 0) {
          pdf.addPage('a4', 'l');
        }

        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }
      
      pdf.save(`Roster_${monthKey}.pdf`);
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      alert(`เกิดข้อผิดพลาดในการสร้างไฟล์ PDF: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportToExcel(currentMonth, staffList, shifts);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('เกิดข้อผิดพลาดในการส่งออก Excel');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header
        currentMonth={currentMonth}
        setCurrentMonth={setCurrentMonth}
        user={user}
        onLoginClick={() => setIsLoginOpen(true)}
        onLogout={() => setUser(null)}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onAdminClick={() => setIsAdminOpen(true)}
        onStatsClick={() => setIsStatsOpen(true)}
        isPublished={rosterStatus?.is_published || false}
        onPublishToggle={handlePublishToggle}
        onResetMonth={handleResetMonth}
        allStaff={staffList}
        allShifts={shifts}
        onUpdate={fetchData}
      />

      <main className="flex-1 max-w-full mx-auto w-full px-2 sm:px-4 py-8">
        {!isAdmin && !rosterStatus?.is_published ? (
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 p-16 text-center max-w-2xl mx-auto mt-12">
            <div className="mx-auto w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 border border-amber-100 shadow-inner">
              <span className="text-3xl">🚧</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">ตารางเวรอยู่ในโหมดร่าง</h2>
            <p className="text-slate-500 leading-relaxed">
              ตารางเวรสำหรับเดือน {format(currentMonth, 'MMMM yyyy', { locale: th })} กำลังถูกจัดเตรียมโดยผู้ดูแลระบบ <br/>กรุณาตรวจสอบอีกครั้งเมื่อมีการเผยแพร่แล้ว
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                  ตารางเวร
                </h2>
                <p className="text-slate-500 mt-1">ตารางเวรประจำเดือน</p>
              </div>
              <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-1.5 px-2">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-sm shadow-blue-200"></div>
                  <span className="text-xs font-semibold text-slate-600">เช้า (M)</span>
                </div>
                <div className="w-px h-3 bg-slate-200"></div>
                <div className="flex items-center gap-1.5 px-2">
                  <div className="w-2.5 h-2.5 bg-orange-500 rounded-full shadow-sm shadow-orange-200"></div>
                  <span className="text-xs font-semibold text-slate-600">บ่าย (A)</span>
                </div>
                <div className="w-px h-3 bg-slate-200"></div>
                <div className="flex items-center gap-1.5 px-2">
                  <div className="w-2.5 h-2.5 bg-purple-500 rounded-full shadow-sm shadow-purple-200"></div>
                  <span className="text-xs font-semibold text-slate-600">ดึก (N)</span>
                </div>
              </div>
            </div>

            {selectedShiftForMove && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-indigo-600 font-bold text-xs">{selectedShiftForMove.shiftType}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-indigo-900">
                      กำลังเลือกเวรของ <span className="font-bold">{staffList.find(s => s.id === selectedShiftForMove.staffId)?.name}</span> วันที่ {format(new Date(selectedShiftForMove.dateStr), 'dd/MM/yyyy')}
                    </p>
                    <p className="text-xs text-indigo-700">คลิกช่องอื่นเพื่อย้าย หรือคลิกที่เดิมเพื่อแก้ไข</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedShiftForMove(null)}
                  className="px-3 py-1.5 bg-white text-indigo-600 text-xs font-medium rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors"
                >
                  ยกเลิก
                </button>
              </div>
            )}

            {(shiftToSwap || targetShiftToSwap) && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase text-emerald-600">กะของคุณ:</span>
                      {shiftToSwap ? (
                        <span className="text-sm font-bold text-emerald-900">{format(new Date(shiftToSwap.date), 'dd/MM')} ({shiftToSwap.shift_type})</span>
                      ) : (
                        <span className="text-xs italic text-emerald-600/60">ยังไม่ได้เลือก</span>
                      )}
                    </div>
                    <div className="hidden sm:block w-px h-3 bg-emerald-200"></div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase text-emerald-600">กะที่ต้องการ:</span>
                      {targetShiftToSwap ? (
                        <span className="text-sm font-bold text-emerald-900">
                          {staffList.find(s => s.id === targetShiftToSwap.staff_id)?.name?.split(' ')[0] || 'ไม่พบพนักงาน'} - {format(new Date(targetShiftToSwap.date), 'dd/MM')} 
                          {targetShiftToSwap.id.startsWith('empty-') ? ' (ช่องว่าง)' : ` (${targetShiftToSwap.shift_type})`}
                        </span>
                      ) : (
                        <span className="text-xs italic text-emerald-600/60">ยังไม่ได้เลือก</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setShiftToSwap(null); setTargetShiftToSwap(null); }}
                    className="px-3 py-1.5 bg-white text-slate-600 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    onClick={() => setIsShiftSwapRequestModalOpen(true)}
                    disabled={!shiftToSwap || !targetShiftToSwap}
                    className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    ยืนยันการย้าย
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col justify-center items-center h-96 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-slate-400 text-sm font-medium animate-pulse">กำลังโหลดข้อมูล...</p>
              </div>
            ) : (
              <>
                <Grid
                  currentMonth={currentMonth}
                  staffList={staffList}
                  shifts={shifts}
                  isAdmin={isAdmin}
                  isPublished={rosterStatus?.is_published ?? false}
                  user={user}
                  onCellClick={handleCellClick}
                  onShiftSwapRequest={handleRequestShiftMove}
                  selectedShiftForMove={selectedShiftForMove}
                  shiftToSwap={shiftToSwap}
                  targetShiftToSwap={targetShiftToSwap}
                  pendingSwaps={pendingSwaps}
                  approvedSwaps={approvedSwaps}
                />
                
                <ShiftSwapHistory 
                  staffList={staffList}
                  currentMonth={currentMonth}
                  lastUpdated={lastActionTimestamp}
                />
              </>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(u) => setUser(u)}
      />

      <ShiftEditModal
        isOpen={isShiftEditOpen}
        onClose={() => setIsShiftEditOpen(false)}
        onSave={handleSaveShift}
        currentShifts={editingCell?.currentShifts || []}
        staffName={staffList.find(s => s.id === editingCell?.staffId)?.name || ''}
        dateStr={editingCell?.dateStr || ''}
      />

      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        staffList={staffList}
        shifts={shifts}
      />

      <AdminManager
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        staffList={staffList}
        onStaffUpdate={fetchData}
      />

      {/* Shift Swap Request Modal */}
      <ShiftSwapRequestModal
        isOpen={isShiftSwapRequestModalOpen}
        onClose={() => setIsShiftSwapRequestModalOpen(false)}
        onSendRequest={handleSendSwapRequest}
        currentStaff={requesterStaff}
        initialRequesterShift={shiftToSwap}
        initialTargetShift={targetShiftToSwap}
        allStaff={staffList}
        allShifts={shifts}
      />

      {/* Hidden PDF Template */}
      <div className="absolute top-[-10000px] left-[-10000px] pointer-events-none">
        <ExportPDFTemplate 
          ref={pdfRef}
          currentMonth={currentMonth}
          staffList={staffList}
          shifts={shifts}
        />
      </div>
    </div>
  );
}
