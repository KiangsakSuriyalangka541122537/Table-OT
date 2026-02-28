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
        className="bg-white text-black p-8 w-[297mm] min-h-[210mm] box-border" 
        style={{ fontFamily: 'Sarabun, Kanit, sans-serif' }}
      >
        {/* Header */}
        <div className="text-center mb-6 space-y-2">
          <h1 className="text-xl font-bold">หลักฐานการขออนุมัติปฏิบัติงานนอกเวลาราชการ</h1>
          <p className="text-lg">เวรเช้า 08.00 – 16.00 น. เวรบ่าย 16.00 – 24.00 น. เวรดึก 24.00 – 08.00 น.</p>
          <p className="text-lg">
            ส่วนราชการ โรงพยาบาลสมเด็จพระเจ้าตากสินมหาราช ประจำเดือน <span className="text-red-600 font-bold">{monthName}</span> พ.ศ. {year} งานศูนย์คอมพิวเตอร์
          </p>
        </div>

        {/* Table */}
        <table className="w-full border-collapse border border-black text-sm text-center mb-4">
          <thead>
            <tr>
              <th className="border border-black p-1 w-10 font-normal" rowSpan={2}>ลำดับ<br/>ที่</th>
              <th className="border border-black p-1 w-48 font-normal" rowSpan={2}>ชื่อ -สกุล</th>
              <th className="border border-black p-1 w-40 font-normal" rowSpan={2}>ตำแหน่ง</th>
              <th className="border border-black p-1 w-16 font-normal" rowSpan={2}>อัตราเงิน<br/>ตอบแทน</th>
              <th className="border border-black p-1 font-normal" colSpan={31}>วันที่ขึ้นปฏิบัติงาน</th>
              <th className="border border-black p-1 w-16 font-normal" rowSpan={2}>จำนวน<br/>เวร</th>
              <th className="border border-black p-1 w-20 font-normal" rowSpan={2}>จำนวนเงิน</th>
            </tr>
            <tr>
              {days.map((day) => (
                <th key={day} className="border border-black p-0.5 w-6 font-normal">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="border border-black p-1">{row.no}</td>
                <td className="border border-black p-1 text-left px-2 whitespace-nowrap">{row.name}</td>
                <td className="border border-black p-1 text-left px-2 whitespace-nowrap">{row.position}</td>
                <td className="border border-black p-1">{row.rate}</td>
                {days.map((day, idx) => {
                  const isWeekendDay = day <= daysInMonth && isWeekend(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
                  return (
                    <td key={idx} className={`border border-black p-0.5 ${isWeekendDay ? 'bg-gray-200' : ''}`}>
                      {row.shifts[idx]}
                    </td>
                  );
                })}
                <td className="border border-black p-1">{row.totalShifts}</td>
                <td className="border border-black p-1">{row.totalPay.toLocaleString()}</td>
              </tr>
            ))}
            {/* Total Row */}
            <tr>
              <td className="border border-black p-1 border-r-0" colSpan={35}></td>
              <td className="border border-black p-1 font-bold">{grandTotalShifts}</td>
              <td className="border border-black p-1 font-bold">{grandTotalPay.toLocaleString()}</td>
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
