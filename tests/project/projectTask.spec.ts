import { test } from '../fixtures/baseFixture';
import { ROLES } from '../constants/roles';
import { PROJECT_DATA, PROJECT_TASK_DATA } from '../constants/projectData';
import { generateProjectName, generateTaskName } from '../utils/nameGenerators';
import { ProjectRecord } from '../pages/ProjectRecord';
import { ProjectTaskRecord } from '../pages/ProjectTaskRecord';

test('project manager can create a Project Task on a Customer Project @smoke', async ({
  isolatedPage,
  isolatedUserId,
}) => {
  // Arrange — create prerequisite project, then navigate to new task form
  const projectRecord = new ProjectRecord(isolatedPage);
  const projectTask = new ProjectTaskRecord(isolatedPage);
  const p = PROJECT_DATA.customerProject;
  const t = PROJECT_TASK_DATA.customerProjectTask;
  const projectName = generateProjectName(isolatedUserId);
  const taskName = generateTaskName(isolatedUserId);

  await projectRecord.switchRole(ROLES.egProjectManager);
  await projectRecord.navigateToProject();
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
  await projectRecord.switchToTab('ServiceNow');
  await projectRecord.setContactPerson(p.contactPerson);
  await projectRecord.setCustomerContractPortalAcce(p.customerContractPortalAccess);
  await projectRecord.save();
  await projectRecord.verifyRecordCreated();

  const projectId = new URL(isolatedPage.url()).searchParams.get('id')!;
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
  await projectTask.verifyAssigneeUnitsPrepopulated(t.assignee.units);
  await projectTask.verifyAssigneeServiceItemPrepopulated(t.assignee.serviceItem);
  await projectTask.verifyAssigneeBillingClassPrepopulated(t.assignee.billingClassPrepopulated);
  await projectTask.setAssigneeBillingClass(t.assignee.billingClass);
  await projectTask.addAssignee();
  await projectTask.verifyDefaultItemPrepopulated(t.defaultItem);
  await projectTask.verifyProjectCategoryPrepopulated(t.projectCategory);
  await projectTask.verifyCustomerCopyPrepopulated(p.customer);
  await projectTask.save();

  // Assert
  await projectTask.verifyRecordCreated();
  await projectTask.verifyTitle(taskName);
  await projectTask.verifyStatus(t.statusDisplayName);
  await projectTask.verifyProjectName(projectName);
  await projectTask.verifyProjectCategory(t.projectCategoryDisplayName);
  await projectTask.verifyDefaultItem(t.defaultItemDisplayName);
  await projectTask.verifyCustomerCopy(p.customerDisplayName);
});
