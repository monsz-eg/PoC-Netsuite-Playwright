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
  const memo = generateMemo();
  const poNumber = generatePoNumber();
  const lineDates = today();

  await invoiceRecord.switchRole(ROLES.egBillingResponsible);
  await invoiceRecord.navigateToInvoice();
  await invoiceRecord.setCustomer(INVOICE_DATA.customerText);
  await invoiceRecord.verifySubsidiaryPrepopulated(INVOICE_DATA.subsidiaryId);
  await invoiceRecord.setAccount(INVOICE_DATA.accountId);
  await invoiceRecord.setMemo(memo);
  await invoiceRecord.setPONumber(poNumber);
  await invoiceRecord.setOrderedBy(INVOICE_DATA.orderedById);
  await invoiceRecord.addConfiguredLineItem({
    itemText: INVOICE_DATA.lineItemTextFixedFee,
    description: INVOICE_DATA.lineItemDescription,
    quantity: INVOICE_DATA.lineItemQuantity,
    rate: INVOICE_DATA.lineItemRate,
    mainProductId: INVOICE_DATA.lineItemMainProductId,
    subProductId: INVOICE_DATA.lineItemSubProductId,
    productItemId: INVOICE_DATA.lineItemProductItemId,
    revenueCategoryId: INVOICE_DATA.lineItemRevenueCategoryId,
    departmentId: INVOICE_DATA.lineItemDepartmentId,
    revStartDate: lineDates,
    revEndDate: lineDates,
  });
  await invoiceRecord.addConfiguredLineItem({
    itemText: INVOICE_DATA.lineItemTextConsultancyServicesTAndMTraining,
    description: INVOICE_DATA.lineItemDescription,
    quantity: INVOICE_DATA.lineItemQuantity,
    rate: INVOICE_DATA.lineItemRate,
    mainProductId: INVOICE_DATA.lineItemMainProductId,
    subProductId: INVOICE_DATA.lineItemSubProductId,
    productItemId: INVOICE_DATA.lineItemProductItemId,
    revenueCategoryId: INVOICE_DATA.lineItemRevenueCategoryId,
    departmentId: INVOICE_DATA.lineItemDepartmentId,
    revStartDate: lineDates,
    revEndDate: lineDates,
  });
  await invoiceRecord.save();
  const invoiceNumber = await invoiceRecord.getInvoiceNumber();

  // Act
  const pdfUrl = await invoiceRecord.printInCustomerLocale();

  // Assert
  await validatePdfPage(isolatedPage.context(), pdfUrl, {
    expectedText: [
      'Faktura',
      invoiceNumber,
      poNumber,
      INVOICE_DATA.currencyText,
      `${INVOICE_DATA.lineItemDescription} ${INVOICE_DATA.lineItemQuantity} ${formatPdfAmount(INVOICE_DATA.lineItemRate)} ${INVOICE_DATA.lineItemTaxRate} % ${formatPdfAmount(INVOICE_DATA.lineItemRate)}`,
      `${INVOICE_DATA.lineItemDescription} ${INVOICE_DATA.lineItemQuantity} Time(r) ${formatPdfAmount(INVOICE_DATA.lineItemRate)} ${INVOICE_DATA.lineItemTaxRate} % ${formatPdfAmount(INVOICE_DATA.lineItemRate)}`,
      ...PDF_FOOTER_TEXT,
    ],
  });
});
