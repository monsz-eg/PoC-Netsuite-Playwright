import { INVOICE_DATA } from '../constants/invoiceData';
import { PDF_FOOTER_TEXT } from '../constants/pdf';
import { ROLES } from '../constants/roles';
import { test } from '../fixtures/baseFixture';
import { formatPdfAmount, validatePdfPage } from '../pages/InvoicePdf';
import { InvoiceRecord } from '../pages/InvoiceRecord';
import { today } from '../utils/dateUtils';
import { generateMemo, generatePoNumber } from '../utils/nameGenerators';

test('billing responsible can print invoice as PDF in customer locale @smoke', async ({
  isolatedPage,
}) => {
  // Arrange
  const invoiceRecord = new InvoiceRecord(isolatedPage);
  let invoiceNumber = '';
  const memo = generateMemo();
  const poNumber = generatePoNumber();

  await invoiceRecord.switchRole(ROLES.egBillingResponsible);
  await invoiceRecord.navigateToInvoice();
  await invoiceRecord.setCustomer(INVOICE_DATA.customerText);
  await invoiceRecord.verifySubsidiaryPrepopulated(INVOICE_DATA.subsidiaryId);
  await invoiceRecord.setAccount(INVOICE_DATA.accountId);
  await invoiceRecord.setMemo(memo);
  await invoiceRecord.setPONumber(poNumber);
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
  invoiceNumber = await invoiceRecord.getInvoiceNumber();

  // Act
  const pdfUrl = await invoiceRecord.printInCustomerLocale();

  // Assert
  await validatePdfPage(isolatedPage.context(), pdfUrl, {
    expectedText: [
      'Faktura',
      invoiceNumber,
      poNumber,
      INVOICE_DATA.currencyText,
      INVOICE_DATA.lineItemDescription,
      `Consultancy services - Training ${INVOICE_DATA.lineItemDescription}`,
      `${INVOICE_DATA.lineItemQuantity} Time(r) ${formatPdfAmount(INVOICE_DATA.lineItemRate)} 25 % ${formatPdfAmount(INVOICE_DATA.lineItemRate)}`,
      ...PDF_FOOTER_TEXT,
    ],
  });
});
