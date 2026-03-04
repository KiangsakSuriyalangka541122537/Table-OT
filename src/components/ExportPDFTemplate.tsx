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
      
      const mCount = staffShifts.filter(s => s.shift_type === 'M').length;
      const aCount = staffShifts.filter(s => s.shift_type === 'A').length;
      const nCount = staffShifts.filter(s => s.shift_type === 'N').length;

      const totalShifts = mCount + ((aCount + nCount) / 2);
      const totalPay = totalShifts * 750;

      const shiftData = days.map(day => {
        if (day > daysInMonth) return '';
        const dateStr = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day), 'yyyy-MM-dd');
        const shift = staffShifts.find(s => s.date === dateStr);
        if (shift) {
          if (shift.shift_type === 'M') return 'ช';
          if (shift.shift_type === 'A') return 'บ';
          if (shift.shift_type === 'N') return 'ด';
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
            font-family: 'Sarabun', sans-serif;
          }
          .pdf-page * { font-family: 'Sarabun', sans-serif; }
          .pdf-table { width: 100%; border-collapse: collapse; text-align: center; font-size: 11px; margin-bottom: 8px; table-layout: fixed; }
          .pdf-table th, .pdf-table td { border: 1px solid #000000; padding: 4px 1px; font-weight: normal; overflow: hidden; height: 24px; }
          .pdf-table th { padding: 6px 1px; font-weight: bold; }
          .pdf-day-col { width: 18px; font-size: 11px; padding: 0 !important; font-weight: bold; }
          .pdf-day-header { font-size: 8px; font-weight: bold; height: 18px; }
          .pdf-bg-gray { background-color: #d1d5db !important; }
          .pdf-text-red { color: #000000 !important; }
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
                <th className="w-6" rowSpan={2}>ลำดับ<br/>ที่</th>
                <th className="w-36" rowSpan={2}>ชื่อ -สกุล</th>
                <th className="w-28" rowSpan={2}>ตำแหน่ง</th>
                <th className="w-10" rowSpan={2}>อัตราเงิน<br/>ตอบแทน</th>
                <th colSpan={31}>วันที่ขึ้นปฏิบัติงาน</th>
                <th className="w-10" rowSpan={2}>จำนวน<br/>เวร</th>
                <th className="w-14" rowSpan={2}>จำนวนเงิน</th>
                <th className="w-20" rowSpan={2}>ลายมือชื่อ</th>
              </tr>
              <tr>
                {days.map((day) => (
                  <th key={day} className="pdf-day-col pdf-day-header">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td>{row.no}</td>
                  <td className="text-left px-1">{row.name}</td>
                  <td className="text-left px-1">{row.position}</td>
                  <td>{row.rate.toLocaleString()}</td>
                  {days.map((day, idx) => {
                    const isWeekendDay = day <= daysInMonth && isWeekend(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
                    return (
                      <td key={idx} className={`${isWeekendDay ? 'pdf-bg-gray' : ''} pdf-day-col`}>
                        {row.shifts[idx]}
                      </td>
                    );
                  })}
                  <td>{row.totalShifts}</td>
                  <td>{row.totalPay.toLocaleString()}</td>
                  <td></td>
                </tr>
              ))}
              <tr>
                <td colSpan={35} style={{ border: 'none' }}></td>
                <td className="font-bold">{grandTotalShifts}</td>
                <td className="font-bold">{grandTotalPay.toLocaleString()}</td>
                <td style={{ border: 'none' }}></td>
              </tr>
            </tbody>
          </table>

          <div className="text-left font-bold text-[10px] mt-1">หมายเหตุ : เวรบ่ายและดึก รวมกัน 750 บาท</div>

          <div className="w-full text-center mt-4 mb-6">
            <p className="text-sm">รวมการจ่ายเงินทั้งสิ้น (ตัวอักษร) &nbsp;&nbsp;&nbsp; ( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {getThaiBaht(grandTotalPay)} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</p>
          </div>

          <p className="text-sm mb-12">ขอรับรองว่าผู้มีรายชื่อข้างต้นได้ขึ้นปฏิบัติงาน นอกเวลาราชการจริง</p>

          <div className="grid grid-cols-4 gap-4 text-[11px] mt-8">
            {/* Column 1 */}
            <div className="flex flex-col items-center space-y-2">
              <p className="mb-10 invisible">ช่องว่างเพื่อความสวยงาม</p>
              <div className="text-center">
                <p className="mb-1">ลงชื่อ...........................................................</p>
                <p>(นายกิตติพงษ์ ชัยศรี)</p>
                <p>นักวิชาการคอมพิวเตอร์ชำนาญการ</p>
                <p>หัวหน้ากลุ่มงานเทคโนโลยีสารสนเทศ</p>
              </div>
            </div>

            {/* Column 2 */}
            <div className="flex flex-col items-center space-y-2">
              <p className="font-bold mb-10">ตรวจสอบแล้วถูกต้องเห็นควรอนุมัติ</p>
              <div className="text-center">
                <p className="mb-1">ลงชื่อ...........................................................</p>
                <p>(นายสมิทธ์ เกิดสินธุ์)</p>
                <p>นายแพทย์เชี่ยวชาญ</p>
                <p>หัวหน้ากลุ่มภารกิจสุขภาพดิจิทัล</p>
              </div>
            </div>

            {/* Column 3 */}
            <div className="flex flex-col items-center space-y-2">
              <p className="font-bold mb-10">ได้ตรวจสอบแล้วถูกต้องเห็นควรพิจารณา อนุมัติ</p>
              <div className="text-center">
                <p className="mb-1">ลงชื่อ...........................................................</p>
                <p>(นางสาวทิวารินทร์ ทองจรูญ)</p>
                <p>นักวิชาการการเงินและบัญชี</p>
              </div>
            </div>

            {/* Column 4 */}
            <div className="flex flex-col items-center space-y-2">
              <p className="font-bold mb-10">คำสั่งผู้อำนวยการอนุมัติ</p>
              <div className="text-center">
                <p className="mb-1">ลงชื่อ...........................................................</p>
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
