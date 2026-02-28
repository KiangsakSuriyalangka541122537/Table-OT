import React, { useState, useEffect } from 'react';
import { format, addDays, getDaysInMonth } from 'date-fns';
import { th } from 'date-fns/locale';
import { supabase } from './lib/supabase';
import { User, Staff, Shift, ShiftType, RosterStatus, ShiftSwapRequest } from './types';
import { Header } from './components/Header';
import { Grid } from './components/Grid';
import { LoginModal } from './components/LoginModal';
import { ShiftEditModal } from './components/ShiftEditModal';
import { StatsModal } from './components/StatsModal';
import { AdminManager } from './components/AdminManager';
import { ShiftSwapRequestModal } from './components/ShiftSwapRequestModal';
import { ExportPDFTemplate } from './components/ExportPDFTemplate';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';

export default function App() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [user, setUser] = useState<User | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [rosterStatus, setRosterStatus] = useState<RosterStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  
  // Shift Swap Request Modal state
  const [isShiftSwapRequestModalOpen, setIsShiftSwapRequestModalOpen] = useState(false);
  const [shiftToSwap, setShiftToSwap] = useState<Shift | null>(null);
  const [requesterStaff, setRequesterStaff] = useState<Staff | null>(null);
  
  // Shift Edit Modal state
  const [isShiftEditOpen, setIsShiftEditOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{ staffId: string; dateStr: string; currentShift: ShiftType | undefined } | null>(null);

  const monthKey = format(currentMonth, 'yyyy-MM');
  const isAdmin = user?.role === 'admin';
  const pdfRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
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
      setStaffList(staffData || []);

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

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = (staffId: string, dateStr: string, currentShift: ShiftType | undefined) => {
    if (!isAdmin) return;
    setEditingCell({ staffId, dateStr, currentShift });
    setIsShiftEditOpen(true);
  };

  const handleRequestShiftSwap = (staff: Staff, shift: Shift) => {
    if (isAdmin) return; // Admins use edit modal
    setRequesterStaff(staff);
    setShiftToSwap(shift);
    setIsShiftSwapRequestModalOpen(true);
  };

  const handleSendSwapRequest = async (request: Omit<ShiftSwapRequest, 'id' | 'status' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase.from('shift_swap_requests').insert(request);
      if (error) throw error;

      await supabase.from('logs').insert({
        message: `Staff ${request.requester_staff_id} requested to swap shift ${request.requester_shift_id} with ${request.target_staff_id}'s shift ${request.target_shift_id}`,
        action_type: 'SHIFT_SWAP_REQUEST_SENT'
      });

      alert('ส่งคำขอสลับเวรเรียบร้อยแล้ว');
      fetchData(); // Refresh data to reflect any changes or new requests
    } catch (error) {
      console.error('Error sending swap request:', error);
      alert('เกิดข้อผิดพลาดในการส่งคำขอสลับเวร');
    }
  };

  const handleSaveShift = async (newShiftType: ShiftType | null) => {
    if (!editingCell) return;
    const { staffId, dateStr } = editingCell;

    try {
      // 1. Check Single Night Rule
      if (newShiftType === 'N') {
        const existingNightShift = shifts.find(s => s.date === dateStr && s.shift_type === 'N' && s.staff_id !== staffId);
        if (existingNightShift) {
          alert('Only one Night shift is allowed per day across all staff.');
          return;
        }
      }

      // 2. Save current shift
      if (newShiftType === null) {
        // Delete shift
        await supabase.from('shifts').delete().eq('staff_id', staffId).eq('date', dateStr);
      } else {
        // Upsert shift
        await supabase.from('shifts').upsert({
          staff_id: staffId,
          date: dateStr,
          shift_type: newShiftType
        }, { onConflict: 'staff_id,date' });
      }

      // 3. A -> N Rule (Auto-Logic)
      if (newShiftType === 'A') {
        const nextDay = addDays(new Date(dateStr), 1);
        const nextDateStr = format(nextDay, 'yyyy-MM-dd');
        
        // Check if next day already has a night shift by someone else
        const { data: existingNextNight } = await supabase
          .from('shifts')
          .select('*')
          .eq('date', nextDateStr)
          .eq('shift_type', 'N')
          .neq('staff_id', staffId)
          .single();

        if (!existingNextNight) {
          await supabase.from('shifts').upsert({
            staff_id: staffId,
            date: nextDateStr,
            shift_type: 'N'
          }, { onConflict: 'staff_id,date' });
        } else {
          alert(`Warning: Could not auto-assign Night shift on ${nextDateStr} because someone else already has it.`);
        }
      }

      // Log action
      await supabase.from('logs').insert({
        message: `Admin assigned ${newShiftType || 'Off'} to staff ${staffId} on ${dateStr}`,
        action_type: 'SHIFT_UPDATE'
      });

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error saving shift:', error);
      alert('Failed to save shift. Please try again.');
    }
  };

  const handlePublishToggle = async () => {
    if (!isAdmin) return;
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

  const handleExportPDF = async () => {
    if (!pdfRef.current) {
      alert('ไม่พบข้อมูลสำหรับสร้าง PDF');
      return;
    }

    try {
      const element = pdfRef.current;
      
      // Use html-to-image instead of html2canvas to avoid Tailwind v4 oklch parsing errors
      const dataUrl = await toPng(element, { 
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      
      // A4 Landscape size is 297mm x 210mm
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      // Calculate height based on aspect ratio of the generated image
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Roster_${monthKey}.pdf`);
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      alert(`เกิดข้อผิดพลาดในการสร้างไฟล์ PDF: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleExportExcel = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const days = Array.from({ length: daysInMonth }, (_, i) => format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1), 'yyyy-MM-dd'));
    
    const exportData = staffList.map(staff => {
      const rowData: any = { 'Staff Name': staff.name };
      days.forEach(dateStr => {
        const shift = shifts.find(s => s.staff_id === staff.id && s.date === dateStr);
        rowData[format(new Date(dateStr), 'dd/MM')] = shift ? shift.shift_type : '-';
      });
      return rowData;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Roster');
    XLSX.writeFile(wb, `Roster_${monthKey}.xlsx`);
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
      />

      <main className="flex-1 max-w-full mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
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
                  ตารางกะการทำงาน
                </h2>
                <p className="text-slate-500 mt-1">จัดการและตรวจสอบตารางเวรพนักงานประจำเดือน</p>
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

            {loading ? (
              <div className="flex flex-col justify-center items-center h-96 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-slate-400 text-sm font-medium animate-pulse">กำลังโหลดข้อมูล...</p>
              </div>
            ) : (
              <Grid
                currentMonth={currentMonth}
                staffList={staffList}
                shifts={shifts}
                isAdmin={isAdmin}
                user={user}
                onCellClick={handleCellClick}
                onShiftSwapRequest={handleRequestShiftSwap}
              />
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
        currentShift={editingCell?.currentShift}
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
        currentShift={shiftToSwap}
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
