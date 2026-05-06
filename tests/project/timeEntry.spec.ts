import { PROJECT_DATA, PROJECT_TASK_DATA } from '../constants/projectData';
import { TIME_ENTRY_DATA } from '../constants/timeEntryData';
import { ROLES } from '../constants/roles';
import { test } from '../fixtures/baseFixture';
import { ProjectRecord } from '../pages/ProjectRecord';
import { ProjectTaskRecord } from '../pages/ProjectTaskRecord';
import { TimeEntryRecord } from '../pages/TimeEntryRecord';
import { generateProjectName, generateTaskName } from '../utils/nameGenerators';

test.describe
  .serial('project manager creates and approves a time entry for a Customer Project task', () => {
  let projectId: string;
  let projectName: string;
  let taskId: string;
  let taskName: string;
  let timeEntryId: string;

  test('creates the parent Customer Project with Allow Time Entry enabled', async ({
    page,
    userId,
  }) => {
    // Arrange
    const projectRecord = new ProjectRecord(page);
    const p = PROJECT_DATA.customerProject;
    projectName = generateProjectName(userId);

    await projectRecord.switchRole(ROLES.egProjectManager);
    await projectRecord.navigateToProject();

    // Act
    await projectRecord.setCustomForm(p.form);
    await projectRecord.setProjectCategory(p.projectCategory);
    await projectRecord.setBillToCustomer(p.customer);
    await projectRecord.setJobType(p.jobType);
    await projectRecord.setCompanyName(projectName);
    await projectRecord.setProjectManager(p.projectManager);
    await projectRecord.setDefaultItemAutoAss(p.defaultItem);
    await projectRecord.setServiceItemForTimeBased(p.serviceItemTimeBased);
    await projectRecord.setDepartment(p.department);
    await projectRecord.setProjectedEndDate(p.projectedEndDate);
    await projectRecord.setProjectStatus(p.projectStatus);
    await projectRecord.setBillToAddress(p.billToAddress);
    await projectRecord.enableAllowTimeEntry();
    await projectRecord.switchToTab('ServiceNow');
    await projectRecord.setContactPerson(p.contactPerson);
    await projectRecord.setCustomerContractPortalAcce(p.customerContractPortalAccess);
    await projectRecord.save();

    // Assert
    await projectRecord.verifyRecordCreated();
    projectId = new URL(page.url()).searchParams.get('id')!;
  });

  test('creates a Project Task on the project with a resource assignee', async ({
    page,
  }) => {
    // Arrange
    const projectTask = new ProjectTaskRecord(page);
    const t = PROJECT_TASK_DATA.customerProjectTask;
    taskName = generateTaskName(projectId);

    await projectTask.switchRole(ROLES.egProjectManager);
    await projectTask.navigateToNewTask(projectId);

    // Act
    await projectTask.setTitle(taskName);
    await projectTask.setActivityCode(t.activityCode);
    await projectTask.setMainProduct(t.mainProduct);
    await projectTask.setSubProduct(t.subProduct);
    await projectTask.setProductItem(t.productItem);
    await projectTask.setProjectCategory(t.projectCategory);
    await projectTask.setStartDate(t.startDate);
    await projectTask.setEndDate(t.endDate);
    await projectTask.setPlannedWork(t.plannedWork);
    await projectTask.setAssigneeResource(t.assignee.resource);
    await projectTask.setAssigneePlannedWork(t.assignee.plannedWork);
    await projectTask.setAssigneeBillingClass(t.assignee.billingClass);
    await projectTask.addAssignee();
    await projectTask.save();

    // Assert
    await projectTask.verifyRecordCreated();
    taskId = new URL(page.url()).searchParams.get('id')!;
    await projectTask.verifyTitle(taskName);
    await projectTask.verifyStatus(t.statusDisplayName);
    await projectTask.verifyProjectName(projectName);
    await projectTask.verifyNonBillableTask(t.nonBillableTask);
  });

  test('creates a Time Entry against the project task via API and verifies Open status', async ({
    page,
  }) => {
    // Arrange
    const timeEntry = new TimeEntryRecord(page);
    const e = TIME_ENTRY_DATA.forProjectTask;

    await timeEntry.switchRole(ROLES.egBillingResponsible);

    // Act
    timeEntryId = await timeEntry.createViaApi({
      employeeId: e.employee.id,
      projectId,
      taskId,
      date: e.date,
      hours: e.hours,
      itemId: e.item,
    });

    // Assert
    await timeEntry.verifyRecordCreated();
    await timeEntry.verifyApprovalStatus(e.openStatus.displayName);
  });

  test('approves the Time Entry and verifies Approved status', async ({ page }) => {
    // Arrange
    const timeEntry = new TimeEntryRecord(page);
    const e = TIME_ENTRY_DATA.forProjectTask;

    await timeEntry.switchRole(ROLES.egProjectManager);
    await timeEntry.navigateTo(`/app/accounting/transactions/timebill.nl?id=${timeEntryId}`);

    // Act
    await timeEntry.approve();

    // Assert
    await timeEntry.verifyApprovalStatus(e.approvedStatus.displayName);
  });
});
