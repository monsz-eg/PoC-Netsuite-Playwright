import { INVOICE_DATA } from "../constants/invoiceData";
import { ROLES } from "../constants/roles";
import { test } from "../fixtures/baseFixture";
import { InvoiceRecord } from "../pages/InvoiceRecord";
import { today } from "../utils/dateUtils";

test.use({ isolatedStorageState: "auth/nstest2.json" });

test("billing responsible can create a new Invoice @smoke", async ({
  isolatedPage,
}) => {
  // Arrange
  const invoiceRecord = new InvoiceRecord(isolatedPage);

  await invoiceRecord.switchRole(ROLES.egBillingResponsible);
  await invoiceRecord.navigateToInvoice();

  // Act
  await invoiceRecord.setCustomer(INVOICE_DATA.customerId);
  await invoiceRecord.setSubsidiary(INVOICE_DATA.subsidiaryId);
  await invoiceRecord.setAccount(INVOICE_DATA.accountId);
  await invoiceRecord.setMemo(INVOICE_DATA.memo);
  await invoiceRecord.setOrderedBy(INVOICE_DATA.orderedById);
  await invoiceRecord.addLineItem(INVOICE_DATA.lineItemText);
  await invoiceRecord.setLineItemDescription(INVOICE_DATA.lineItemDescription);
  await invoiceRecord.setLineItemQuantity(INVOICE_DATA.lineItemQuantity);
  await invoiceRecord.setLineItemRate(INVOICE_DATA.lineItemRate);
  await invoiceRecord.setLineItemMainProduct(
    INVOICE_DATA.lineItemMainProductId,
  );
  await invoiceRecord.setLineItemSubProduct(INVOICE_DATA.lineItemSubProductId);
  await invoiceRecord.setLineItemProductItem(
    INVOICE_DATA.lineItemProductItemId,
  );
  await invoiceRecord.setLineItemRevenueCategory(
    INVOICE_DATA.lineItemRevenueCategoryId,
  );
  await invoiceRecord.setLineItemDepartment(INVOICE_DATA.lineItemDepartmentId);
  await invoiceRecord.setLineItemRevStartDate(today());
  await invoiceRecord.setLineItemRevEndDate(today());
  await invoiceRecord.addItem();
  await invoiceRecord.save();

  // Assert
  // To be continued with more assertions as needed, currently just verifying that the record was created and some key fields are correct
  await invoiceRecord.verifyRecordCreated();
  await invoiceRecord.verifySubsidiary(INVOICE_DATA.subsidiaryText);
  await invoiceRecord.verifyCurrency(INVOICE_DATA.currencyText);
  await invoiceRecord.verifyTranDate();
});
