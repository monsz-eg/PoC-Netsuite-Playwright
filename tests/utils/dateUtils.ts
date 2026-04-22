const TZ = "Europe/Copenhagen";

function getCetDateParts(date: Date): { dd: string; mm: string; yyyy: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  return {
    dd: parts.find((p) => p.type === "day")!.value,
    mm: parts.find((p) => p.type === "month")!.value,
    yyyy: parts.find((p) => p.type === "year")!.value,
  };
}

/** Returns today's date in DD.MM.YYYY format using Copenhagen timezone (matches NetSuite server). */
export function today(): string {
  const { dd, mm, yyyy } = getCetDateParts(new Date());
  return `${dd}.${mm}.${yyyy}`;
}

/** Returns a date N months from now in DD.MM.YYYY format using CET timezone. */
export function dateMonthsFromNow(months: number): string {
  const { dd, mm, yyyy } = getCetDateParts(new Date());
  const currentDay = Number(dd);
  const currentMonth = Number(mm) - 1;
  const currentYear = Number(yyyy);

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
