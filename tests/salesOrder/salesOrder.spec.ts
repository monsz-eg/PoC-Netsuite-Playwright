import { ROLES } from '../constants/roles';
import { SALES_ORDER_DATA } from '../constants/salesOrderData';
import { test } from '../fixtures/baseFixture';
import { SalesOrderRecord } from '../pages/SalesOrderRecord';
import { today } from '../utils/dateUtils';

test('billing responsible can create and approve a pre-paid pool sales order', async ({
  isolatedPage,
}) => {
  // Arrange
  const salesOrderRecord = new SalesOrderRecord(isolatedPage);

  await salesOrderRecord.switchRole(ROLES.egBillingResponsible);
  await salesOrderRecord.navigateToSalesOrder();

  // Act
  await salesOrderRecord.setPoolProvisionSalesOrder();
  await salesOrderRecord.setCustomer(SALES_ORDER_DATA.customerText);
  await salesOrderRecord.verifySubsidiaryPrepopulated(SALES_ORDER_DATA.subsidiaryId);
  await salesOrderRecord.addLineItem(SALES_ORDER_DATA.lineItemText);
  await salesOrderRecord.setLineItemRate(SALES_ORDER_DATA.lineItemRate);
  await salesOrderRecord.setLineItemMainProduct(SALES_ORDER_DATA.lineItemMainProductId);
  await salesOrderRecord.setLineItemSubProduct(SALES_ORDER_DATA.lineItemSubProductId);
  await salesOrderRecord.setLineItemProductItem(SALES_ORDER_DATA.lineItemProductItemId);
  await salesOrderRecord.setLineItemRevenueCategory(SALES_ORDER_DATA.lineItemRevenueCategoryId);
  await salesOrderRecord.setLineItemDepartment(SALES_ORDER_DATA.lineItemDepartmentId);
  await salesOrderRecord.setLineItemRevStartDate(today());
  await salesOrderRecord.setLineItemRevEndDate(today());
  await salesOrderRecord.addItem();
  await salesOrderRecord.save();
  await salesOrderRecord.approveSalesOrder();

  // Assert
  await salesOrderRecord.verifyRecordCreated();
  await salesOrderRecord.verifyCustomer(SALES_ORDER_DATA.customerText);
  await salesOrderRecord.verifySubsidiary(SALES_ORDER_DATA.subsidiaryText);
  await salesOrderRecord.verifyStatus(SALES_ORDER_DATA.expectedStatusAfterApproval.statusRef);
});
