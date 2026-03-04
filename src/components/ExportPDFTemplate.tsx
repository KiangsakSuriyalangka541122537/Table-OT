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
      <div ref={ref} className="bg-white">
        <style>{`
          .pdf-page {
            padding: 30px 40px;
            width: 297mm;
            min-height: 210mm;
            box-sizing: border-box;
            background-color: #ffffff;
            color: #000000;
            font-family: 'Sarabun', 'Kanit', sans-serif;
          }
          .pdf-table { width: 100%; border-collapse: collapse; text-align: center; font-size: 11px; margin-bottom: 4px; table-layout: fixed; }
          .pdf-table th, .pdf-table td { border: 1px solid #000000; padding: 2px; font-weight: normal; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .pdf-table th { padding: 4px 2px; font-weight: bold; }
          .pdf-bg-gray { background-color: #d1d5db !important; }
          .pdf-text-red { color: #000000 !important; } /* Changed to black as per image */
        `}</style>

        {/* Page 1: Payment Evidence (Only Page) */}
        <div className="pdf-page">
          <div className="text-center mb-6 space-y-1">
            <h1 className="text-base font-bold">หลักฐานการจ่ายค่าตอบแทนการปฏิบัติงานนอกเวลาราชการ</h1>
            <p className="text-sm font-bold">
              ส่วนราชการโรงพยาบาลสมเด็จพระเจ้าตากสินมหาราช ประจำเดือน {monthName} พ.ศ. {year} กลุ่มงานเทคโนโลยีสารสนเทศ และ กลุ่มงานสุขภาพดิจิทัล
            </p>
          </div>

          <table className="pdf-table">
            <thead>
              <tr>
                <th className="w-8" rowSpan={2}>ลำดับ<br/>ที่</th>
                <th className="w-40" rowSpan={2}>ชื่อ -สกุล</th>
                <th className="w-32" rowSpan={2}>ตำแหน่ง</th>
                <th className="w-12" rowSpan={2}>อัตราเงิน<br/>ตอบแทน</th>
                <th colSpan={31}>วันที่ขึ้นปฏิบัติงาน</th>
                <th className="w-12" rowSpan={2}>จำนวน<br/>เวร</th>
                <th className="w-16" rowSpan={2}>จำนวนเงิน</th>
                <th className="w-24" rowSpan={2}>ลายมือชื่อ</th>
              </tr>
              <tr>
                {days.map((day) => (
                  <th key={day} className="w-5 p-0 text-[9px]">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td>{row.no}</td>
                  <td className="text-left px-2">{row.name}</td>
                  <td className="text-left px-2">{row.position}</td>
                  <td>{row.rate}</td>
                  {days.map((day, idx) => {
                    const isWeekendDay = day <= daysInMonth && isWeekend(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
                    return (
                      <td key={idx} className={isWeekendDay ? 'pdf-bg-gray' : ''}>
                        {/* Empty cells for payment evidence as per image */}
                      </td>
                    );
                  })}
                  <td>{row.totalShifts}</td>
                  <td>{row.totalPay}</td>
                  <td></td>
                </tr>
              ))}
              <tr>
                <td colSpan={35} className="text-left font-bold px-2 text-[10px]">หมายเหตุ : เวรบ่ายและดึก รวมกัน 750 บาท</td>
                <td className="font-bold">{grandTotalShifts}</td>
                <td className="font-bold">{grandTotalPay}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <div className="w-full text-center mt-4 mb-6">
            <p className="text-sm">รวมการจ่ายเงินทั้งสิ้น (ตัวอักษร) &nbsp;&nbsp;&nbsp; ( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {getThaiBaht(grandTotalPay)} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</p>
          </div>

          <p className="text-sm mb-12">ขอรับรองว่าผู้มีรายชื่อข้างต้นได้ขึ้นปฏิบัติงาน นอกเวลาราชการจริง</p>

          <div className="grid grid-cols-4 gap-4 text-[11px] mt-8">
            {/* Column 1 */}
            <div className="flex flex-col items-center space-y-8">
              <div className="text-center">
                <p className="mb-4">ลงชื่อ...........................................................</p>
                <p>(นายกิตติพงษ์ ชัยศรี)</p>
                <p>นักวิชาการคอมพิวเตอร์ชำนาญการ</p>
                <p>หัวหน้ากลุ่มงานเทคโนโลยีสารสนเทศ</p>
              </div>
            </div>

            {/* Column 2 */}
            <div className="flex flex-col items-center space-y-2">
              <p className="font-bold mb-4">ตรวจสอบแล้วถูกต้องเห็นควรอนุมัติ</p>
              <div className="text-center">
                <p className="mb-4">ลงชื่อ...........................................................</p>
                <p>(นายสมิทธ์ เกิดสินธุ์)</p>
                <p>นายแพทย์เชี่ยวชาญ</p>
                <p>หัวหน้ากลุ่มภารกิจสุขภาพดิจิทัล</p>
              </div>
            </div>

            {/* Column 3 */}
            <div className="flex flex-col items-center space-y-2">
              <p className="font-bold mb-4">ได้ตรวจสอบแล้วถูกต้องเห็นควรพิจารณา อนุมัติ</p>
              <div className="text-center">
                <p className="mb-4">ลงชื่อ...........................................................</p>
                <p>(นางสาว ทิวารินทร์ ทองจรูญ)</p>
                <p>นักวิชาการการเงินและบัญชี</p>
              </div>
            </div>

            {/* Column 4 */}
            <div className="flex flex-col items-center space-y-2">
              <p className="font-bold mb-4">คำสั่งผู้อำนวยการอนุมัติ</p>
              <div className="text-center">
                <p className="mb-4">ลงชื่อ...........................................................</p>
                <p>(นายมงคล ลือชูวงศ์)</p>
                <p>ผู้อำนวยการโรงพยาบาลสมเด็จพระเจ้าตากสินมหาราช</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
