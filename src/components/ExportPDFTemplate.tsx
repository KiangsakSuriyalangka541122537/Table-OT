import React, { forwardRef } from 'react';
import { format, getDaysInMonth, isWeekend } from 'date-fns';
import { th } from 'date-fns/locale';
import { Staff, Shift } from '../types';
import { getThaiBaht } from '../utils/thaiBaht';

interface ExportPDFTemplateProps {
  currentMonth: Date;
  staffList: Staff[];
  shifts: Shift[];
}

export const ExportPDFTemplate = forwardRef<HTMLDivElement, ExportPDFTemplateProps>(
  ({ currentMonth, staffList, shifts }, ref) => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const days = Array.from({ length: 31 }, (_, i) => i + 1); // Always show 31 columns
    const monthName = format(currentMonth, 'MMMM', { locale: th });
    const year = currentMonth.getFullYear() + 543; // Thai year

    let grandTotalShifts = 0;
    let grandTotalPay = 0;

    const rows = staffList.map((staff, index) => {
      const staffShifts = shifts.filter(s => s.staff_id === staff.id);
      let totalShifts = 0;
      let totalPay = 0;

      const shiftData = days.map(day => {
        if (day > daysInMonth) return ''; // Empty for days beyond month length
        const dateStr = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day), 'yyyy-MM-dd');
        const shift = staffShifts.find(s => s.date === dateStr);
        if (shift) {
          if (shift.shift_type === 'M') {
            totalShifts += 1;
            totalPay += 750;
            return 'ช';
          } else if (shift.shift_type === 'A') {
            totalShifts += 0.5;
            totalPay += 375;
            return 'บ';
          } else if (shift.shift_type === 'N') {
            totalShifts += 0.5;
            totalPay += 375;
            return 'ด';
          }
        }
        return '';
      });

      grandTotalShifts += totalShifts;
      grandTotalPay += totalPay;

      return {
        no: index + 1,
        name: staff.name,
        position: 'นักวิชาการคอมพิวเตอร์', // Default position as per image
        rate: 750,
        shifts: shiftData,
        totalShifts,
        totalPay
      };
    });

    return (
      <div 
        ref={ref} 
        className="p-8 w-[297mm] min-h-[210mm] box-border" 
        style={{ fontFamily: 'Sarabun, Kanit, sans-serif', backgroundColor: '#ffffff', color: '#000000' }}
      >
        <style>{`
          .pdf-table { width: 100%; border-collapse: collapse; text-align: center; font-size: 14px; margin-bottom: 16px; }
          .pdf-table th, .pdf-table td { border: 1px solid #000000; padding: 4px; font-weight: normal; }
          .pdf-table th { padding: 4px; }
          .pdf-bg-gray { background-color: #e5e7eb !important; }
          .pdf-text-red { color: #dc2626 !important; font-weight: bold; }
        `}</style>

        {/* Header */}
        <div className="text-center mb-6 space-y-2">
          <h1 className="text-xl font-bold">หลักฐานการขออนุมัติปฏิบัติงานนอกเวลาราชการ</h1>
          <p className="text-lg">เวรเช้า 08.00 – 16.00 น. เวรบ่าย 16.00 – 24.00 น. เวรดึก 24.00 – 08.00 น.</p>
          <p className="text-lg">
            ส่วนราชการ โรงพยาบาลสมเด็จพระเจ้าตากสินมหาราช ประจำเดือน <span className="pdf-text-red">{monthName}</span> พ.ศ. {year} งานศูนย์คอมพิวเตอร์
          </p>
        </div>

        {/* Table */}
        <table className="pdf-table">
          <thead>
            <tr>
              <th className="w-10" rowSpan={2}>ลำดับ<br/>ที่</th>
              <th className="w-48" rowSpan={2}>ชื่อ -สกุล</th>
              <th className="w-40" rowSpan={2}>ตำแหน่ง</th>
              <th className="w-16" rowSpan={2}>อัตราเงิน<br/>ตอบแทน</th>
              <th colSpan={31}>วันที่ขึ้นปฏิบัติงาน</th>
              <th className="w-16" rowSpan={2}>จำนวน<br/>เวร</th>
              <th className="w-20" rowSpan={2}>จำนวนเงิน</th>
            </tr>
            <tr>
              {days.map((day) => (
                <th key={day} className="w-6 p-0.5">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td>{row.no}</td>
                <td className="text-left px-2 whitespace-nowrap">{row.name}</td>
                <td className="text-left px-2 whitespace-nowrap">{row.position}</td>
                <td>{row.rate}</td>
                {days.map((day, idx) => {
                  const isWeekendDay = day <= daysInMonth && isWeekend(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
                  return (
                    <td key={idx} className={`p-0.5 ${isWeekendDay ? 'pdf-bg-gray' : ''}`}>
                      {row.shifts[idx]}
                    </td>
                  );
                })}
                <td>{row.totalShifts}</td>
                <td>{row.totalPay.toLocaleString()}</td>
              </tr>
            ))}
            {/* Total Row */}
            <tr>
              <td style={{ borderRight: 'none' }} colSpan={35}></td>
              <td style={{ fontWeight: 'bold' }}>{grandTotalShifts}</td>
              <td style={{ fontWeight: 'bold' }}>{grandTotalPay.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex flex-col items-start mb-8 pl-4">
          <p className="text-sm font-bold mb-4">หมายเหตุ : เวรบ่ายและดึก รวมกัน 750 บาท</p>
          <div className="w-full text-center">
            <p className="text-base font-bold">รวมการจ่ายเงินทั้งสิ้น (ตัวอักษร) ({getThaiBaht(grandTotalPay)})</p>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-8 text-sm text-center mt-12 px-4">
          <div>
            <p className="text-left mb-8">เรียนผู้อำนวยการ โรงพยาบาลสมเด็จพระเจ้าตากสินมหาราช</p>
            <p className="mb-2">ลงชื่อ...........................................................</p>
            <p>(นายกิตติพงษ์ ชัยศรี)</p>
            <p>นักวิชาการคอมพิวเตอร์ชำนาญการ</p>
          </div>
          <div>
            <p className="text-left mb-2">เรียนผู้อำนวยการ โรงพยาบาลสมเด็จพระเจ้าตากสินมหาราช</p>
            <p className="text-left mb-8">เห็นควรอนุมัติ</p>
            <p className="mb-2">ลงชื่อ...........................................................</p>
            <p>(นายสมิทธ์ เกิดสินธุ์)</p>
            <p>นายแพทย์เชี่ยวชาญ</p>
          </div>
          <div>
            <p className="text-left mb-8">คำสั่งผู้อำนวยการ อนุมัติ</p>
            <p className="mb-2">ลงชื่อ...........................................................</p>
            <p>(นายสมิทธ์ เกิดสินธุ์)</p>
            <p>หัวหน้ากลุ่มภารกิจสุขภาพดิจิทัล</p>
          </div>
        </div>
      </div>
    );
  }
);
