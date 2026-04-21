import { CHARGE_RULE_DATA, PROJECT_DATA, PROJECT_TASK_DATA } from '../constants/projectData';
import { ROLES } from '../constants/roles';
import { test } from '../fixtures/baseFixture';
import { ChargeRuleRecord } from '../pages/ChargeRuleRecord';
import { ProjectRecord } from '../pages/ProjectRecord';
import { ProjectTaskRecord } from '../pages/ProjectTaskRecord';
import {
  generateChargeRuleName,
  generateProjectName,
  generateTaskName,
} from '../utils/nameGenerators';

test.describe
  .serial('project manager creates a time-based charge rule for a Customer Project task', () => {
  let projectId: string;
  let projectName: string;

  test('creates the parent Customer Project', async ({ isolatedPage, isolatedUserId }) => {
    // Arrange
    const projectRecord = new ProjectRecord(isolatedPage);
    const p = PROJECT_DATA.customerProject;
    projectName = generateProjectName(isolatedUserId);

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
    await projectRecord.switchToTab('ServiceNow');
    await projectRecord.setContactPerson(p.contactPerson);
    await projectRecord.setCustomerContractPortalAcce(p.customerContractPortalAccess);
    await projectRecord.save();

    // Assert
    await projectRecord.verifyRecordCreated();
    projectId = new URL(isolatedPage.url()).searchParams.get('id')!;
  });

  test('creates a Project Task on the project', async ({ isolatedPage, isolatedUserId }) => {
    // Arrange
    const projectTask = new ProjectTaskRecord(isolatedPage);
    const p = PROJECT_DATA.customerProject;
    const t = PROJECT_TASK_DATA.customerProjectTask;
    const taskName = generateTaskName(projectId);

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
    await projectTask.verifyTitle(taskName);
    await projectTask.verifyStatus(t.statusDisplayName);
    await projectTask.verifyProjectName(projectName);
    await projectTask.verifyProjectCategory(t.projectCategoryDisplayName);
    await projectTask.verifyDefaultItem(t.defaultItemDisplayName);
    await projectTask.verifyCustomerCopy(p.customerDisplayName);
  });

  test('creates a time-based charge rule linked to the project task', async ({
    isolatedPage,
    isolatedUserId,
  }) => {
    // Arrange
    const chargeRule = new ChargeRuleRecord(isolatedPage);
    const c = CHARGE_RULE_DATA.timeBasedForCustomerProjectTask;
    const ruleName = generateChargeRuleName(isolatedUserId);

    await chargeRule.navigateToNewTimeBased(projectId);

    // Act
    await chargeRule.setName(ruleName);
    await chargeRule.setDescription(c.description);
    await chargeRule.setRateSourceType(c.rateSourceType);
    await chargeRule.setBillingRateCard(c.billingRateCard);
    await chargeRule.addItemFilter(c.itemFilter, c.itemFilterDescription);
    await chargeRule.save();

    // Assert
    await chargeRule.navigateTo(`/app/accounting/project/project.nl?id=${projectId}`);
    const ruleId = await chargeRule.findByProjectAndName(projectId, ruleName);
    await chargeRule.navigateTo(`/app/accounting/transactions/billing/chargerule.nl?id=${ruleId}`);
    await chargeRule.verifyName(ruleName);
    await chargeRule.verifyChargeRuleType(c.chargeRuleTypeDisplayName);
    await chargeRule.verifyProject(projectName);
    await chargeRule.verifyStage(c.stageDisplayName);
  });
});
