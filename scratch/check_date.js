const date = '2026-05-15';
const [year, month, day] = date.split('-').map(Number);
const selectedDay = new Date(year, month - 1, day).getDay();
console.log('Date:', date);
console.log('Day of week:', selectedDay);
// 0: Sunday, 1: Monday, 2: Tuesday, 3: Wednesday, 4: Thursday, 5: Friday, 6: Saturday
