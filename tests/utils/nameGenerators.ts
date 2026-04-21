export function generatePoNumber(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const suffix = Array.from({ length: 5 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join("");
  return `POtest${suffix}`;
}

export function generateProjectName(userId: string): string {
  return `prj-test-automation-${Date.now()}-${userId}`;
}

export function generateTaskName(userId: string): string {
  return `task-test-automation-${Date.now()}-${userId}`;
}
