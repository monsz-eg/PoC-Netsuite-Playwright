export function generateProjectName(userId: string): string {
  return `AUTO_project_${Date.now()}-${userId}`;
}

export function generateTaskName(userId: string): string {
  return `AUTO_project_task_${Date.now()}-${userId}`;
}
