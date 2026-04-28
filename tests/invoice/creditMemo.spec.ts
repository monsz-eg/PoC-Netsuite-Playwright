import { INVOICE_DATA } from '../constants/invoiceData';
import { ROLES } from '../constants/roles';
import { test } from '../fixtures/baseFixture';
import { CreditMemo } from '../pages/CreditMemo';
import { InvoiceRecord } from '../pages/InvoiceRecord';
import { today } from '../utils/dateUtils';
import { generateMemo, generatePoNumber } from '../utils/nameGenerators';

test.describe.serial('billinge responsible credits an invoice', () => {
  let invoiceId: string;
  let invoiceNumber: string;
  let memo: string;

  test('billing responsible can create a new Invoice @smoke', async ({ page }) => {
    // Arrange
    const invoiceRecord = new InvoiceRecord(page);
    const poNumber = generatePoNumber();
    const memo = generateMemo();

    await invoiceRecord.switchRole(ROLES.egBillingResponsible);
    await invoiceRecord.navigateToInvoice();

    // Act
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

    // Assert
    await invoiceRecord.verifyRecordCreated();
    invoiceId = new URL(page.url()).searchParams.get('id')!;
    invoiceNumber = await invoiceRecord.getInvoiceNumber();
  });

  test('billing responsible can credit an invoice', async ({ page }) => {
    // Arrange
    const creditMemo = new CreditMemo(page);
    await creditMemo.switchRole(ROLES.egBillingResponsible);
    await creditMemo.navigateToInvoice(invoiceId);

    // Act
    await creditMemo.clickCreditButton();
    await creditMemo.verifyCreatedFromPrepopulated(invoiceNumber);
    await creditMemo.save();

    // Assert
    await creditMemo.verifyRecordCreated();
    await creditMemo.verifyCreatedFrom(invoiceNumber);
  });
});
