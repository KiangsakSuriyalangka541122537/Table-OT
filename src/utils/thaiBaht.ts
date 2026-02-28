export function getThaiBaht(amount: number): string {
  const numberStr = Math.round(amount).toString();
  if (numberStr === '0') return 'ศูนย์บาทถ้วน';
  
  const numbers = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
  
  let text = '';
  const length = numberStr.length;
  
  for (let i = 0; i < length; i++) {
    const n = parseInt(numberStr.charAt(i));
    const pos = length - i - 1;
    
    if (n !== 0) {
      if (pos === 0 && n === 1 && length > 1 && numberStr.charAt(length - 2) !== '0') {
        text += 'เอ็ด';
      } else if (pos === 1 && n === 2) {
        text += 'ยี่';
        text += positions[pos];
      } else if (pos === 1 && n === 1) {
        text += positions[pos];
      } else {
        text += numbers[n] + positions[pos];
      }
    }
  }
  return text + 'บาทถ้วน';
}
