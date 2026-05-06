import { test } from '../fixtures/baseFixture';
import { RequisitionRecord } from '../pages/RequisitionRecord';
import { ROLES } from '../constants/roles';
import { REQUISITION_DATA } from '../constants/requisitionData';
import { generateMemo } from '../utils/nameGenerators';

test('employee can create a MWD purchase requisition', async ({ isolatedPage }) => {
  // Arrange
  const requisition = new RequisitionRecord(isolatedPage);
  const externalDescription = generateMemo();
  await requisition.switchRole(ROLES.egEmployeeCenter);
  await requisition.navigateToNewRequisition();
  await requisition.verifyRequestorPrepopulated();
  await requisition.verifyDateIsToday();
  await requisition.verifySubsidiaryPrepopulated();
  await requisition.verifyCurrencyPrepopulated();

  // Act
  await requisition.checkForElectronicBankPayment();
  await requisition.verifyForElectronicBankPaymentChecked(); // edit-mode only — checkbox removed from DOM in view mode
  await requisition.addLineItem(REQUISITION_DATA.lineItemText);
  await requisition.verifyQuantityDefaulted(); // edit-mode only — nlapiGetCurrentLineItemValue not available post-save
  await requisition.verifyDepartmentPrepopulated(); // edit-mode only
  await requisition.setLineItemExternalDescription(externalDescription);
  await requisition.verifyExternalDescriptionFilled(externalDescription); // edit-mode only
  await requisition.setLineItemEstimatedRate(REQUISITION_DATA.lineItemRate);
  await requisition.verifyEstimatedRateFilled(REQUISITION_DATA.lineItemRate); // edit-mode only
  await requisition.verifyEstimatedAmountCalculated(REQUISITION_DATA.lineItemRate); // edit-mode only
  await requisition.addItem();
  await requisition.switchToTab('Custom');
  await requisition.verifyTransactionCreatedBy(); // edit-mode field — must be checked before save
  await requisition.save();

  // Assert
  await requisition.verifyRecordCreated();
  await requisition.verifyRequisitionNumberGenerated();
  await requisition.verifyApprovalStatusPendingApproval();
  await requisition.verifyNextApproverSet();
});
