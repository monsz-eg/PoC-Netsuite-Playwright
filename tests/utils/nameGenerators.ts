export function generatePoNumber(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const suffix = Array.from({ length: 10 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join('');
  return `AUTO_PO_${suffix}`;
}

export function generateMemo(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const suffix = Array.from({ length: 10 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join('');
  return `AUTO_memo_${suffix}`;
}

export function generateProjectName(userId: string): string {
  return `AUTO_project_${Date.now()}-${userId}`;
}

export function generateTaskName(userId: string): string {
  return `AUTO_project_task_${Date.now()}-${userId}`;
}

export function generateChargeRuleName(userId: string): string {
  return `AUTO_charge_rule_${Date.now()}-${userId}`;
}
