import { INVOICE_DATA } from '../constants/invoiceData';
import { ROLES } from '../constants/roles';
import { test } from '../fixtures/baseFixture';
import { validatePdfPage } from '../pages/InvoicePdf';
import { InvoiceRecord } from '../pages/InvoiceRecord';
import { today } from '../utils/dateUtils';
import { generateMemo, generatePoNumber } from '../utils/nameGenerators';

test('billing responsible can print invoice as PDF in customer locale @smoke', async ({
  isolatedPage,
}) => {
  // Arrange
  const invoiceRecord = new InvoiceRecord(isolatedPage);

  await invoiceRecord.switchRole(ROLES.egBillingResponsible);
  await invoiceRecord.navigateToInvoice();
  await invoiceRecord.setCustomer(INVOICE_DATA.customerText);
  await invoiceRecord.verifySubsidiaryPrepopulated(INVOICE_DATA.subsidiaryId);
  await invoiceRecord.setAccount(INVOICE_DATA.accountId);
  await invoiceRecord.setMemo(generateMemo());
  await invoiceRecord.setPONumber(generatePoNumber());
  await invoiceRecord.setOrderedBy(INVOICE_DATA.orderedById);
  await invoiceRecord.addLineItem(INVOICE_DATA.lineItemText);
  await invoiceRecord.setLineItemDescription(INVOICE_DATA.lineItemDescription);
  await invoiceRecord.setLineItemQuantity(INVOICE_DATA.lineItemQuantity);
  await invoiceRecord.setLineItemRate(INVOICE_DATA.lineItemRate);
  await invoiceRecord.setLineItemMainProduct(INVOICE_DATA.lineItemMainProductId);
  await invoiceRecord.setLineItemSubProduct(INVOICE_DATA.lineItemSubProductId);
  await invoiceRecord.setLineItemProductItem(INVOICE_DATA.lineItemProductItemId);
  await invoiceRecord.setLineItemRevenueCategory(INVOICE_DATA.lineItemRevenueCategoryId);
  await invoiceRecord.setLineItemDepartment(INVOICE_DATA.lineItemDepartmentId);
  await invoiceRecord.setLineItemRevStartDate(today());
  await invoiceRecord.setLineItemRevEndDate(today());
  await invoiceRecord.addItem();
  await invoiceRecord.save();

  // Act
  const pdfUrl = await invoiceRecord.printInCustomerLocale();

  // Assert
  await validatePdfPage(isolatedPage.context(), pdfUrl);
});
