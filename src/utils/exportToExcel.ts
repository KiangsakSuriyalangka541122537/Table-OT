import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format, getDaysInMonth, isWeekend } from 'date-fns';
import { th } from 'date-fns/locale';
import { Staff, Shift } from '../types';
import { getThaiBaht } from './thaiBaht';

export const exportToExcel = async (currentMonth: Date, staffList: Staff[], shifts: Shift[]) => {
  const workbook = new ExcelJS.Workbook();
  const monthName = format(currentMonth, 'MMMM', { locale: th });
  const year = currentMonth.getFullYear() + 543;
  const daysInMonth = getDaysInMonth(currentMonth);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  // Common styles
  const fontRegular = { name: 'Sarabun', size: 11 };
  const fontBold = { name: 'Sarabun', size: 11, bold: true };
  const borderStyle: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
  const alignCenter: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'center' };
  const alignLeft: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'left' };

  const createSheet = (sheetName: string, title: string, subtitle: string, signatures: any[], isPaymentSheet: boolean) => {
    const sheet = workbook.addWorksheet(sheetName, {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true } // A4 Landscape
    });

    // Set Column Widths
    // A: No, B: Name, C: Position, D: Rate, E-AI: Days, AJ: Total Shifts, AK: Total Pay, AL: Signature
    const cols = [
      { width: 5 },  // A: No
      { width: 25 }, // B: Name
      { width: 20 }, // C: Position
      { width: 10 }, // D: Rate
      ...days.map(() => ({ width: 3.5 })), // E-AI: Days 1-31
      { width: 8 },  // AJ: Total Shifts
      { width: 12 }, // AK: Total Pay
    ];
    if (isPaymentSheet) {
      cols.push({ width: 15 }); // AL: Signature
    }
    sheet.columns = cols;

    // Title Rows
    const lastColLetter = isPaymentSheet ? 'AL' : 'AK';
    
    sheet.mergeCells(`A1:${lastColLetter}1`);
    const titleCell = sheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { name: 'Sarabun', size: 14, bold: true };
    titleCell.alignment = alignCenter;

    sheet.mergeCells(`A2:${lastColLetter}2`);
    const subtitleCell = sheet.getCell('A2');
    subtitleCell.value = subtitle;
    subtitleCell.font = { name: 'Sarabun', size: 10, bold: true }; // Smaller font for subtitle
    subtitleCell.alignment = alignCenter;

    let headerRowIdx = 3;
    if (!isPaymentSheet) {
      sheet.mergeCells(`A3:${lastColLetter}3`);
      const infoCell = sheet.getCell('A3');
      infoCell.value = `ส่วนราชการโรงพยาบาลสมเด็จพระเจ้าตากสินมหาราช ประจำเดือน ${monthName} พ.ศ. ${year} กลุ่มงานเทคโนโลยีสารสนเทศ และ กลุ่มงานสุขภาพดิจิทัล`;
      infoCell.font = { name: 'Sarabun', size: 12, bold: true };
      infoCell.alignment = alignCenter;
      headerRowIdx = 4;
    }

    // Table Headers
    const h1 = headerRowIdx;
    const h2 = headerRowIdx + 1;

    // Helper to set border and style
    const setHeaderStyle = (cell: ExcelJS.Cell) => {
      cell.font = fontBold;
      cell.alignment = alignCenter;
      cell.border = borderStyle;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    };

    // Columns A-D
    ['A', 'B', 'C', 'D'].forEach((col, idx) => {
      sheet.mergeCells(`${col}${h1}:${col}${h2}`);
      const cell = sheet.getCell(`${col}${h1}`);
      cell.value = ['ลำดับที่', 'ชื่อ - สกุล', 'ตำแหน่ง', 'อัตราเงิน\nตอบแทน'][idx];
      cell.alignment = { wrapText: true, ...alignCenter };
      setHeaderStyle(cell);
      // Apply style to merged cells
      sheet.getCell(`${col}${h2}`).border = borderStyle;
    });

    // Days Header
    const startDayCol = 5; // E
    const endDayCol = startDayCol + 30; // AI
    const startDayLetter = sheet.getColumn(startDayCol).letter;
    const endDayLetter = sheet.getColumn(endDayCol).letter;
    
    sheet.mergeCells(`${startDayLetter}${h1}:${endDayLetter}${h1}`);
    const daysHeader = sheet.getCell(`${startDayLetter}${h1}`);
    daysHeader.value = 'วันที่ขึ้นปฏิบัติงาน';
    setHeaderStyle(daysHeader);

    // Days Sub-header
    days.forEach((day, idx) => {
      const col = startDayCol + idx;
      const cell = sheet.getCell(h2, col);
      cell.value = day;
      cell.font = { ...fontBold, size: 9 };
      cell.alignment = alignCenter;
      cell.border = borderStyle;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    });

    // Totals
    const totalShiftsCol = endDayCol + 1; // AJ
    const totalPayCol = totalShiftsCol + 1; // AK
    const totalShiftsLetter = sheet.getColumn(totalShiftsCol).letter;
    const totalPayLetter = sheet.getColumn(totalPayCol).letter;

    sheet.mergeCells(`${totalShiftsLetter}${h1}:${totalShiftsLetter}${h2}`);
    const tsCell = sheet.getCell(`${totalShiftsLetter}${h1}`);
    tsCell.value = 'จำนวน\nเวร';
    tsCell.alignment = { wrapText: true, ...alignCenter };
    setHeaderStyle(tsCell);
    sheet.getCell(`${totalShiftsLetter}${h2}`).border = borderStyle;

    sheet.mergeCells(`${totalPayLetter}${h1}:${totalPayLetter}${h2}`);
    const tpCell = sheet.getCell(`${totalPayLetter}${h1}`);
    tpCell.value = 'จำนวนเงิน';
    setHeaderStyle(tpCell);
    sheet.getCell(`${totalPayLetter}${h2}`).border = borderStyle;

    if (isPaymentSheet) {
      const sigCol = totalPayCol + 1; // AL
      const sigLetter = sheet.getColumn(sigCol).letter;
      sheet.mergeCells(`${sigLetter}${h1}:${sigLetter}${h2}`);
      const sigCell = sheet.getCell(`${sigLetter}${h1}`);
      sigCell.value = 'ลายมือชื่อ';
      setHeaderStyle(sigCell);
      sheet.getCell(`${sigLetter}${h2}`).border = borderStyle;
    }

    // Data Rows
    let currentRowIdx = h2 + 1;
    let grandTotalShifts = 0;
    let grandTotalPay = 0;

    staffList.forEach((staff, index) => {
      const row = sheet.getRow(currentRowIdx);
      const staffShifts = shifts.filter(s => s.staff_id === staff.id);
      
      const mCount = staffShifts.filter(s => s.shift_type === 'M').length;
      const aCount = staffShifts.filter(s => s.shift_type === 'A').length;
      const nCount = staffShifts.filter(s => s.shift_type === 'N').length;
      const totalShifts = mCount + ((aCount + nCount) / 2);
      const totalPay = totalShifts * 750;

      grandTotalShifts += totalShifts;
      grandTotalPay += totalPay;

      row.getCell(1).value = index + 1;
      row.getCell(2).value = staff.name;
      row.getCell(3).value = 'นักวิชาการคอมพิวเตอร์';
      row.getCell(4).value = 750;

      days.forEach((day, idx) => {
        const col = startDayCol + idx;
        const cell = row.getCell(col);
        
        // Weekend highlighting
        if (day <= daysInMonth) {
          const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
          if (isWeekend(date)) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1D5DB' } };
          }
        }

        if (day > daysInMonth) {
          cell.value = '';
        } else {
          const dateStr = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day), 'yyyy-MM-dd');
          const shift = staffShifts.find(s => s.date === dateStr);
          if (shift) {
            if (shift.shift_type === 'M') cell.value = 'ช';
            else if (shift.shift_type === 'A') cell.value = 'บ';
            else if (shift.shift_type === 'N') cell.value = 'ด';
          }
        }
      });

      row.getCell(totalShiftsCol).value = totalShifts;
      row.getCell(totalPayCol).value = totalPay;

      // Apply styles to row
      for (let c = 1; c <= (isPaymentSheet ? totalPayCol + 1 : totalPayCol); c++) {
        const cell = row.getCell(c);
        cell.font = fontRegular;
        cell.border = borderStyle;
        if (c === 2 || c === 3) {
          cell.alignment = { ...alignLeft, indent: 1 };
        } else {
          cell.alignment = alignCenter;
        }
      }
      
      row.getCell(4).numFmt = '#,##0';
      row.getCell(totalPayCol).numFmt = '#,##0';

      currentRowIdx++;
    });

    // Grand Total Row
    const totalRow = sheet.getRow(currentRowIdx);
    
    // Merge from A to Day 31 (AI)
    sheet.mergeCells(`A${currentRowIdx}:${endDayLetter}${currentRowIdx}`);
    
    // Apply borders to all cells in the total row
    for (let c = 1; c <= (isPaymentSheet ? totalPayCol + 1 : totalPayCol); c++) {
      const cell = totalRow.getCell(c);
      cell.border = borderStyle;
    }

    totalRow.getCell(totalShiftsCol).value = grandTotalShifts;
    totalRow.getCell(totalShiftsCol).font = fontBold;
    totalRow.getCell(totalShiftsCol).alignment = alignCenter;

    totalRow.getCell(totalPayCol).value = grandTotalPay;
    totalRow.getCell(totalPayCol).font = fontBold;
    totalRow.getCell(totalPayCol).alignment = alignCenter;
    totalRow.getCell(totalPayCol).numFmt = '#,##0';

    currentRowIdx++;

    // Footer Text
    const footerStartRow = currentRowIdx + 1;
    sheet.mergeCells(`A${footerStartRow}:${lastColLetter}${footerStartRow}`);
    const noteCell = sheet.getCell(`A${footerStartRow}`);
    noteCell.value = 'หมายเหตุ : เวรบ่ายและดึก รวมกัน 750 บาท';
    noteCell.font = { ...fontBold, size: 10 };

    const bahtTextRow = footerStartRow + 2;
    sheet.mergeCells(`A${bahtTextRow}:${lastColLetter}${bahtTextRow}`);
    const bahtCell = sheet.getCell(`A${bahtTextRow}`);
    bahtCell.value = `รวมการจ่ายเงินทั้งสิ้น (ตัวอักษร)      (          ${getThaiBaht(grandTotalPay)}          )`;
    bahtCell.font = fontRegular;
    bahtCell.alignment = alignCenter;

    if (isPaymentSheet) {
      const certifyRow = bahtTextRow + 2;
      sheet.mergeCells(`A${certifyRow}:${lastColLetter}${certifyRow}`);
      const certifyCell = sheet.getCell(`A${certifyRow}`);
      certifyCell.value = 'ขอรับรองว่าผู้มีรายชื่อข้างต้นได้ขึ้นปฏิบัติงาน นอกเวลาราชการจริง';
      certifyCell.font = fontRegular;
    }

    // Signatures
    const sigStartRow = bahtTextRow + 5;
    
    // Calculate column spans for signatures
    // Total columns is roughly 38 (A to AL)
    // We want to distribute signatures evenly
    const totalCols = isPaymentSheet ? 38 : 37;
    const sigCount = signatures.length;
    const colSpan = Math.floor(totalCols / sigCount);

    signatures.forEach((sig: any, idx: number) => {
      const startCol = (idx * colSpan) + 1; // 1-based index
      const endCol = idx === sigCount - 1 ? totalCols : startCol + colSpan - 1;
      
      const startLetter = sheet.getColumn(startCol).letter;
      const endLetter = sheet.getColumn(endCol).letter;

      const merge = (rowOffset: number, text: string, isBold = false) => {
        const r = sigStartRow + rowOffset;
        sheet.mergeCells(`${startLetter}${r}:${endLetter}${r}`);
        const cell = sheet.getCell(`${startLetter}${r}`);
        cell.value = text;
        cell.alignment = alignCenter;
        cell.font = isBold ? fontBold : fontRegular;
      };

      if (sig.title) merge(0, sig.title, true);
      merge(3, 'ลงชื่อ...........................................................', false);
      merge(4, `(${sig.name})`, false);
      merge(5, sig.position, false);
      if (sig.position2) merge(6, sig.position2, false);
    });
  };

  // Data for signatures
  const signaturesPage1 = [
    {
      title: '', 
      name: 'นายกิตติพงษ์ ชัยศรี',
      position: 'นักวิชาการคอมพิวเตอร์ชำนาญการ',
      position2: 'หัวหน้ากลุ่มงานเทคโนโลยีสารสนเทศ'
    },
    {
      title: 'ตรวจสอบแล้วถูกต้องเห็นควรอนุมัติ',
      name: 'นายสมิทธ์ เกิดสินธุ์',
      position: 'นายแพทย์เชี่ยวชาญ',
      position2: 'หัวหน้ากลุ่มภารกิจสุขภาพดิจิทัล'
    },
    {
      title: 'ได้ตรวจสอบแล้วถูกต้องเห็นควรพิจารณา อนุมัติ',
      name: 'นางสาวทิวารินทร์ ทองจรูญ',
      position: 'นักวิชาการการเงินและบัญชี'
    },
    {
      title: 'คำสั่งผู้อำนวยการอนุมัติ',
      name: 'นายมงคล ลือชูวงศ์',
      position: 'ผู้อำนวยการโรงพยาบาลสมเด็จพระเจ้าตากสินมหาราช'
    }
  ];

  const signaturesPage2 = [
    {
      title: 'เรียนผู้อำนวยการโรงพยาบาลสมเด็จพระเจ้าตากสินมหาราช',
      name: 'นายกิตติพงษ์ ชัยศรี',
      position: 'นักวิชาการคอมพิวเตอร์ชำนาญการ',
      position2: 'หัวหน้ากลุ่มงานเทคโนโลยีสารสนเทศ'
    },
    {
      title: 'เรียนผู้อำนวยการโรงพยาบาลสมเด็จพระเจ้าตากสินมหาราช',
      name: 'นายสมิทธ์ เกิดสินธุ์',
      position: 'นายแพทย์เชี่ยวชาญ',
      position2: 'หัวหน้ากลุ่มภารกิจสุขภาพดิจิทัล'
    },
    {
      title: 'คำสั่งผู้อำนวยการ',
      name: 'นายสมิทธ์ เกิดสินธุ์',
      position: 'นายแพทย์เชี่ยวชาญ',
      position2: 'หัวหน้ากลุ่มภารกิจสุขภาพดิจิทัล'
    }
  ];

  // Create Sheets
  createSheet(
    'หลักฐานการจ่าย', 
    'หลักฐานการจ่ายค่าตอบแทนการปฏิบัติงานนอกเวลาราชการ', 
    `ส่วนราชการโรงพยาบาลสมเด็จพระเจ้าตากสินมหาราช ประจำเดือน ${monthName} พ.ศ. ${year} กลุ่มงานเทคโนโลยีสารสนเทศ และ กลุ่มงานสุขภาพดิจิทัล`,
    signaturesPage1,
    true
  );

  createSheet(
    'ขออนุมัติ', 
    'หลักฐานการขออนุมัติปฏิบัติงานนอกเวลาราชการ', 
    'เวรเช้า 08.00 - 16.00 น. เวรบ่าย 16.00 - 24.00 น. เวรดึก 24.00 - 08.00 น.',
    signaturesPage2,
    false
  );

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Roster_${format(currentMonth, 'yyyy-MM')}.xlsx`);
};
