export function generateProjectName(userId: string): string {
  return `prj-test-automation-${Date.now()}-${userId}`;
}
