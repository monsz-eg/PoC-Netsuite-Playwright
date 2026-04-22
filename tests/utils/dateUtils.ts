/** Returns a date N months from now in MM.DD.YYYY format (NetSuite date input format). */
export function dateMonthsFromNow(months: number): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  const targetMonthIndex = currentMonth + months;
  const targetYear = currentYear + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(currentDay, lastDayOfTargetMonth);

  const d = new Date(targetYear, targetMonth, targetDay);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}.${dd}.${yyyy}`;
}
