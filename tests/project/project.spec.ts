import { test } from '../fixtures/baseFixture';
import { ROLES } from '../constants/roles';
import { PROJECT_DATA } from '../constants/projectData';
import { generateProjectName } from '../utils/nameGenerators';
import { ProjectRecord } from '../pages/ProjectRecord';
import JobFields from '../../docs/ns-object/job.json';

test('project manager can create a new Customer Project @smoke', async ({
  isolatedPage,
  isolatedUserId,
}) => {
  // Arrange
  const projectRecord = new ProjectRecord(isolatedPage);
  const d = PROJECT_DATA.customerProject;
  const projectName = generateProjectName(isolatedUserId);

  await projectRecord.switchRole(ROLES.egProjectManager);
  await projectRecord.navigateToProject();

  // Act
  await projectRecord.setCustomForm(d.form);
  await projectRecord.setFields([[JobFields.projectCategory, d.projectCategory]]);
  await projectRecord.setBillToCustomer(d.customer);
  await projectRecord.verifyNsField(JobFields.subsidiary, d.subsidiary);
  await projectRecord.setFields([
    [JobFields.jobType,               d.jobType],
    [JobFields.companyName,           projectName],
    [JobFields.projectManager,        d.projectManager],
    [JobFields.defaultItemAutoAss,    d.defaultItem],
    [JobFields.serviceItemForTimeBased, d.serviceItemTimeBased],
    [JobFields.department,            d.department],
  ]);
  await projectRecord.verifyNsField(JobFields.schedulingMethod, d.schedulingMethod);
  await projectRecord.setFields([
    [JobFields.projectedEndDate, d.projectedEndDate],
    [JobFields.projectStatus,   d.projectStatus],
    [JobFields.billToAddress,   d.billToAddress],
  ]);
  await projectRecord.switchToTab('ServiceNow');
  await projectRecord.setFields([
    [JobFields.contactPerson,                d.contactPerson],
    [JobFields.customerContractPortalAccess, d.customerContractPortalAccess],
  ]);
  await projectRecord.save();

  // Assert
  await projectRecord.verifyRecordCreated();
  await projectRecord.verifyDisplayField(JobFields.companyName,    projectName);
  await projectRecord.verifyDisplayField(JobFields.billToCustomer, d.customerDisplayName);
  await projectRecord.verifyDisplayField(JobFields.projectManager, d.projectManagerDisplayName);
});
