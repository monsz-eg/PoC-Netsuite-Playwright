import { test } from "../fixtures/baseFixture";
import { ROLES } from "../constants/roles";
import { PROJECT_DATA } from "../constants/projectData";
import { generateProjectName } from "../utils/nameGenerators";
import { ProjectRecord } from "../pages/ProjectRecord";

test.use({ isolatedStorageState: "auth/nstest1.json" });

test("project manager can create a new Customer Project @smoke", async ({ isolatedPage, isolatedUserId }) => {
  // Arrange
  const projectRecord = new ProjectRecord(isolatedPage);
  const d = PROJECT_DATA.customerProject;
  const projectName = generateProjectName(isolatedUserId);

  await projectRecord.switchRole(ROLES.egProjectManager);
  await projectRecord.navigateToProject();

  // Act
  await projectRecord.setCustomForm(d.form);
  await projectRecord.setProjectCategory(d.projectCategory);
  await projectRecord.setBillToCustomer(d.customer);
  await projectRecord.verifySubsidiaryPrepopulated(d.subsidiary);
  await projectRecord.setJobType(d.jobType);
  await projectRecord.setCompanyName(projectName);
  await projectRecord.setProjectManager(d.projectManager);
  await projectRecord.setDefaultItemAutoAss(d.defaultItem);
  await projectRecord.setServiceItemForTimeBased(d.serviceItemTimeBased);
  await projectRecord.setDepartment(d.department);
  await projectRecord.verifySchedulingMethodPrepopulated(d.schedulingMethod);
  await projectRecord.setProjectedEndDate(d.projectedEndDate);
  await projectRecord.setProjectStatus(d.projectStatus);
  await projectRecord.setBillToAddress(d.billToAddress);
  await projectRecord.switchToTab("ServiceNow");
  await projectRecord.setContactPerson(d.contactPerson);
  await projectRecord.setCustomerContractPortalAcce(d.customerContractPortalAccess);
  await projectRecord.save();

  // Assert
  await projectRecord.verifyRecordCreated();
  await projectRecord.verifyCompanyName(projectName);
  await projectRecord.verifyBillToCustomer(d.customerDisplayName);
  await projectRecord.verifyProjectManager(d.projectManagerDisplayName);
});
