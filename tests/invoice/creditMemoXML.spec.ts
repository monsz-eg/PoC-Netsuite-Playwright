import * as fs from 'fs';
import { CUSTOMERS } from '../constants/lookups';
import { INVOICE_DATA } from '../constants/invoiceData';
import { ROLES } from '../constants/roles';
import { expect, test } from '../fixtures/baseFixture';
import { CreditMemo } from '../pages/CreditMemo';
import { InvoiceRecord } from '../pages/InvoiceRecord';
import { today } from '../utils/dateUtils';
import { generateMemo, generatePoNumber } from '../utils/nameGenerators';
import { parsePeppolCreditNote } from '../utils/peppolValidator';

const RANDERSBOLIG = CUSTOMERS.randersbolig;

test.describe.serial('billing responsible credits a Randersbolig invoice and validates XML e-document', () => {
  let invoiceId: string;
  let invoiceNumber: string;
  let creditMemoId: string;

  test('billing responsible can create invoice for Randersbolig', async ({ page }) => {
    // Arrange
    const invoiceRecord = new InvoiceRecord(page);
    const poNumber = generatePoNumber();
    const memo = generateMemo();

    await invoiceRecord.switchRole(ROLES.egBillingResponsible);
    await invoiceRecord.navigateToInvoice();

    // Act
    await invoiceRecord.setCustomer(RANDERSBOLIG.displayName);
    await invoiceRecord.verifySubsidiaryPrepopulated(RANDERSBOLIG.subsidiary);
    await invoiceRecord.setAccount(INVOICE_DATA.accountId);
    await invoiceRecord.setMemo(memo);
    await invoiceRecord.setPONumber(poNumber);
    await invoiceRecord.setOrderedBy(INVOICE_DATA.orderedById);
    await invoiceRecord.setShipToAddress(RANDERSBOLIG.shipAddressId);
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
      revStartDate: today(),
      revEndDate: today(),
    });
    await invoiceRecord.save();

    // Assert
    await invoiceRecord.verifyRecordCreated();
    invoiceId = new URL(page.url()).searchParams.get('id')!;
    invoiceNumber = await invoiceRecord.getInvoiceNumber();
  });

  test('billing responsible can credit the Randersbolig invoice', async ({ page }) => {
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
    creditMemoId = new URL(page.url()).searchParams.get('id')!;
    await creditMemo.verifyCreatedFrom(invoiceNumber);
  });

  test('billing responsible can generate PEPPOL-compliant XML e-document with invoice reference', async ({ page }) => {
    // Arrange
    const creditMemo = new CreditMemo(page);
    await creditMemo.switchRole(ROLES.egBillingResponsible);
    await creditMemo.navigateToCreditMemo(creditMemoId);
    await creditMemo.verifyRecordCreated();

    // Act
    await creditMemo.clickGenerateEDocument();
    await creditMemo.openEDocumentTab();
    const xml = await creditMemo.downloadXml();
    fs.writeFileSync('test-results/debug-credit-memo.xml', xml, 'utf-8');
    const peppol = parsePeppolCreditNote(xml);

    // Assert
    expect(peppol.customizationId).toBe(
      'urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0',
    );
    expect(peppol.profileId).toBe('urn:fdc:peppol.eu:2017:poacc:billing:01:1.0');
    expect(peppol.creditNoteTypeCode).toBe('381');
    expect(peppol.documentCurrencyCode).not.toBe('');
    expect(peppol.billingReferenceId).toBe(invoiceNumber);
    expect(peppol.hasSupplierParty).toBe(true);
    expect(peppol.hasCustomerParty).toBe(true);
  });
});
