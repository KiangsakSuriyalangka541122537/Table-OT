export type ShiftType = 'ช' | 'บ' | 'ด' | 'O' | 'OT';

// โครงสร้างข้อมูล (Data Structure) ที่เหมาะสม
// ใช้ Object (หรือ Record) โดยมี Key เป็น userId และ Value เป็น Object ของวันที่
export interface ScheduleData {
  [userId: string]: {
    [day: string]: string; // เก็บเวรในรูปแบบ string คั่นด้วย '/' เช่น 'ช/บ', 'ด', หรือ '' (ค่าว่าง)
  };
}

// ลำดับของเวรสำหรับการจัดเรียง
const SHIFT_ORDER: Record<string, number> = {
  'ช': 1,
  'บ': 2,
  'ด': 3,
  'O': 4,
  'OT': 5
};

/**
 * ฟังก์ชันสำหรับย้ายเวร (Move Shift)
 * @param prevData ข้อมูลตารางเวรเดิม
 * @param sourceUserId ID ของพนักงานต้นทาง
 * @param targetUserId ID ของพนักงานปลายทาง
 * @param day วันที่ที่ต้องการย้ายเวร (เช่น '2023-10-01' หรือ '1')
 * @param shiftToMove เวรที่ต้องการย้าย (เช่น 'ช')
 * @returns ข้อมูลตารางเวรใหม่ที่อัปเดตแล้ว
 */
export const moveShiftState = (
  prevData: ScheduleData,
  sourceUserId: string,
  targetUserId: string,
  day: string,
  shiftToMove: string
): ScheduleData => {
  // Deep copy เพื่อไม่ให้กระทบกับ State เดิมโดยตรง (Immutability)
  const newData: ScheduleData = JSON.parse(JSON.stringify(prevData));

  // 1. จัดการต้นทาง (ลบเวรออก)
  if (newData[sourceUserId] && newData[sourceUserId][day]) {
    const sourceShifts = newData[sourceUserId][day];
    
    // แยก string เป็น array, กรองเวรที่ต้องการย้ายออก, แล้วประกอบกลับเป็น string
    const updatedSourceShifts = sourceShifts
      .split('/')
      .filter(s => s !== shiftToMove)
      .join('/');
      
    newData[sourceUserId][day] = updatedSourceShifts;
    
    // (Optional) ถ้าลบแล้วว่างเปล่า อาจจะลบ key วันที่นั้นทิ้งไปเลยก็ได้
    // if (newData[sourceUserId][day] === '') {
    //   delete newData[sourceUserId][day];
    // }
  }

  // 2. จัดการปลายทาง (เพิ่มเวรเข้าไป)
  // ถ้าปลายทางยังไม่มีข้อมูล user นี้ ให้สร้าง object เปล่าเตรียมไว้
  if (!newData[targetUserId]) {
    newData[targetUserId] = {};
  }

  const targetShifts = newData[targetUserId][day] || '';
  const targetShiftsArray = targetShifts ? targetShifts.split('/') : [];
  
  // ถ้าปลายทางยังไม่มีเวรนี้ ให้เพิ่มเข้าไป
  if (!targetShiftsArray.includes(shiftToMove)) {
    targetShiftsArray.push(shiftToMove);
  }

  // 3. จัดเรียงลำดับเวร (ช -> บ -> ด)
  targetShiftsArray.sort((a, b) => {
    const orderA = SHIFT_ORDER[a] || 99;
    const orderB = SHIFT_ORDER[b] || 99;
    return orderA - orderB;
  });

  // แปลงกลับเป็น String เช่น 'ช/บ' แล้วอัปเดตกลับไปที่ปลายทาง
  newData[targetUserId][day] = targetShiftsArray.join('/');

  return newData;
};
