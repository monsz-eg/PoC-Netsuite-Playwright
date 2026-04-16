export function generateProjectName(userId: string): string {
  return `prj-test-automation-${Date.now()}-${userId}`;
}

export function generateTaskName(userId: string): string {
  return `task-test-automation-${Date.now()}-${userId}`;
}
