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

  // Act
  await requisition.verifyRequestorPrepopulated();
  await requisition.verifyDateIsToday();
  await requisition.verifySubsidiaryPrepopulated();
  await requisition.verifyCurrencyPrepopulated();
  await requisition.checkForElectronicBankPayment();
  await requisition.verifyForElectronicBankPaymentChecked();
  await requisition.addLineItem(REQUISITION_DATA.lineItemText);
  await requisition.verifyQuantityDefaulted();
  await requisition.setLineItemExternalDescription(externalDescription);
  await requisition.verifyExternalDescriptionFilled(externalDescription);
  await requisition.setLineItemEstimatedRate(REQUISITION_DATA.lineItemRate);
  await requisition.verifyEstimatedRateFilled(REQUISITION_DATA.lineItemRate);
  await requisition.verifyEstimatedAmountCalculated('3000');
  await requisition.verifyDepartmentPrepopulated();
  await requisition.addItem();
  await requisition.switchToTab('Custom');
  await requisition.verifyTransactionCreatedBy();
  await requisition.save();

  // Assert
  await requisition.verifyRecordCreated();
  await requisition.verifyRequisitionNumberGenerated();
  await requisition.verifyApprovalStatusPendingApproval();
  await requisition.verifyNextApproverSet();
});
