import { DOMParser } from '@xmldom/xmldom';

// UBL 2.1 namespace URIs used by PEPPOL BIS Billing 3.0
const CBC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2';
const CAC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2';

export interface PeppolCreditNote {
  customizationId: string;
  profileId: string;
  creditNoteTypeCode: string;
  documentCurrencyCode: string;
  billingReferenceId: string;
  hasSupplierParty: boolean;
  hasCustomerParty: boolean;
}

export function parsePeppolCreditNote(xml: string): PeppolCreditNote {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');

  function cbc(localName: string): string {
    return doc.getElementsByTagNameNS(CBC, localName)[0]?.textContent?.trim() ?? '';
  }

  // Try standard BillingReference/InvoiceDocumentReference first; fall back to
  // cbc:Note which this NetSuite template uses (format: "Invoice #<number>").
  const invoiceDocRef = doc.getElementsByTagNameNS(CAC, 'InvoiceDocumentReference')[0];
  const billingReferenceId =
    invoiceDocRef?.getElementsByTagName('cbc:ID')[0]?.textContent?.trim() ||
    cbc('Note').replace(/^Invoice\s*#/, '').replace(/\\n/g, '').trim();

  return {
    customizationId: cbc('CustomizationID'),
    profileId: cbc('ProfileID'),
    creditNoteTypeCode: cbc('CreditNoteTypeCode'),
    documentCurrencyCode: cbc('DocumentCurrencyCode'),
    billingReferenceId,
    hasSupplierParty: doc.getElementsByTagNameNS(CAC, 'AccountingSupplierParty').length > 0,
    hasCustomerParty: doc.getElementsByTagNameNS(CAC, 'AccountingCustomerParty').length > 0,
  };
}
