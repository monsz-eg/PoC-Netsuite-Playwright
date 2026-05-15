import { expect, test } from '@playwright/test';
import { validatePeppolXml } from './peppolValidator';

// Valid PEPPOL metadata, but no AccountingSupplierParty / AccountingCustomerParty /
// TaxTotal / LegalMonetaryTotal / InvoiceLine — triggers multiple structural BR-* errors.
const INVOICE_MISSING_STRUCTURE = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>CANARY-001</cbc:ID>
  <cbc:IssueDate>2024-01-01</cbc:IssueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>DKK</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>PO-CANARY</cbc:BuyerReference>
</Invoice>`;

// Wrong CustomizationID — PEPPOL-EN16931-R004 requires the exact PEPPOL BIS prefix.
const INVOICE_WRONG_CUSTOMIZATION_ID = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
  <cbc:CustomizationID>WRONG-CUSTOMIZATION</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>CANARY-002</cbc:ID>
  <cbc:IssueDate>2024-01-01</cbc:IssueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>DKK</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>PO-CANARY</cbc:BuyerReference>
</Invoice>`;

// No BuyerReference and no OrderReference — PEPPOL-EN16931-R003 requires one of the two.
const INVOICE_MISSING_BUYER_REFERENCE = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>CANARY-003</cbc:ID>
  <cbc:IssueDate>2024-01-01</cbc:IssueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>DKK</cbc:DocumentCurrencyCode>
</Invoice>`;

// Minimal structurally complete PEPPOL BIS Billing 3.0 invoice.
// SE country avoids DK/DE/GR/IS country-specific rule layers.
// Amounts: 1 line × 1000 EUR net, 25% VAT → total 1250 EUR.
const INVOICE_VALID = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>CANARY-VALID-001</cbc:ID>
  <cbc:IssueDate>2024-01-01</cbc:IssueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>PO-CANARY</cbc:BuyerReference>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:EndpointID schemeID="0088">1234567890128</cbc:EndpointID>
      <cac:PartyName><cbc:Name>Canary Supplier AB</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cac:Country><cbc:IdentificationCode>SE</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>SE123456789001</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>Canary Supplier AB</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cbc:EndpointID schemeID="0088">1234567890135</cbc:EndpointID>
      <cac:PartyName><cbc:Name>Canary Customer AB</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cac:Country><cbc:IdentificationCode>SE</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>Canary Customer AB</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">250.00</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="EUR">1000.00</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="EUR">250.00</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>25</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">1000.00</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">1000.00</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">1250.00</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">1250.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="EA">10</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="EUR">1000.00</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>Canary Item</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>25</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="EUR">100.00</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
</Invoice>`;

test.describe('validatePeppolXml — canary checks confirm validator rejects invalid XML', () => {
  test('rejects an invoice missing mandatory structural elements', async () => {
    // Arrange
    const xml = INVOICE_MISSING_STRUCTURE;

    // Act
    const result = await validatePeppolXml(xml);
    const ruleIds = result.errors.map((e) => e.ruleId);

    // Assert
    expect(result.valid, 'invoice with no supplier/customer/tax/totals must be invalid').toBe(false);
    expect(result.errors, 'should report multiple structural errors').not.toHaveLength(0);
    expect(ruleIds, 'BR-06: seller name is mandatory').toContain('BR-06');
    expect(ruleIds, 'BR-07: buyer name is mandatory').toContain('BR-07');
  });

  test('rejects an invoice with a wrong CustomizationID (PEPPOL-EN16931-R004)', async () => {
    // Arrange
    const xml = INVOICE_WRONG_CUSTOMIZATION_ID;

    // Act
    const result = await validatePeppolXml(xml);
    const ruleIds = result.errors.map((e) => e.ruleId);

    // Assert
    expect(result.valid, 'invoice with wrong CustomizationID must be invalid').toBe(false);
    expect(ruleIds, 'PEPPOL-EN16931-R004: CustomizationID must use the correct PEPPOL BIS prefix').toContain(
      'PEPPOL-EN16931-R004',
    );
  });

  test('rejects an invoice missing BuyerReference and OrderReference (PEPPOL-EN16931-R003)', async () => {
    // Arrange
    const xml = INVOICE_MISSING_BUYER_REFERENCE;

    // Act
    const result = await validatePeppolXml(xml);
    const ruleIds = result.errors.map((e) => e.ruleId);

    // Assert
    expect(result.valid, 'invoice without BuyerReference or OrderReference must be invalid').toBe(false);
    expect(ruleIds, 'PEPPOL-EN16931-R003: BuyerReference or OrderReference/ID is mandatory').toContain(
      'PEPPOL-EN16931-R003',
    );
  });

  test('accepts a structurally complete and mathematically correct PEPPOL invoice', async () => {
    // Arrange
    const xml = INVOICE_VALID;

    // Act
    const result = await validatePeppolXml(xml);

    // Assert
    expect(
      result.errors.map((e) => `[${e.ruleId}] ${e.text}`).join('\n'),
      'PEPPOL/CEN validation errors',
    ).toBe('');
    expect(result.valid).toBe(true);
  });
});
