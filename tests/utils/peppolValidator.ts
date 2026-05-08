import * as path from 'path';
import { DOMParser } from '@xmldom/xmldom';

const SaxonJS = require('saxon-js') as {
  transform: (
    options: { stylesheetFileName: string; sourceText: string; destination: string },
    mode: string,
  ) => Promise<{ principalResult: string }>;
};

const FIXTURES = path.resolve(__dirname, '../fixtures/peppol');
const CEN_SEF = path.join(FIXTURES, 'EN16931-UBL-validation.sef.json');
const PEPPOL_SEF = path.join(FIXTURES, 'PEPPOL-EN16931-UBL.sef.json');
const SVRL_NS = 'http://purl.oclc.org/dsdl/svrl';

export interface PeppolValidationResult {
  valid: boolean;
  errors: PeppolViolation[];
  warnings: PeppolViolation[];
}

export interface PeppolViolation {
  ruleId: string;
  text: string;
  location: string;
  flag: string;
}

async function runValidator(sefPath: string, xml: string): Promise<PeppolViolation[]> {
  const result = await SaxonJS.transform(
    { stylesheetFileName: sefPath, sourceText: xml, destination: 'serialized' },
    'async',
  );
  const svrl: string = result.principalResult;
  const doc = new DOMParser().parseFromString(svrl, 'text/xml');
  const violations: PeppolViolation[] = [];

  const nodes = doc.getElementsByTagNameNS(SVRL_NS, 'failed-assert');
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    violations.push({
      ruleId: n.getAttribute('id') ?? '',
      text: n.getElementsByTagNameNS(SVRL_NS, 'text')[0]?.textContent?.trim() ?? '',
      location: n.getAttribute('location') ?? '',
      flag: n.getAttribute('flag') ?? 'error',
    });
  }
  return violations;
}

// Extracts the billing reference ID for the invoice-match assertion in the test.
// PEPPOL BR-55 validates presence of a billing reference but not its exact value.
export function extractBillingReferenceId(xml: string): string {
  const CBC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2';
  const CAC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2';
  const doc = new DOMParser().parseFromString(xml, 'text/xml');

  const invoiceDocRef = doc.getElementsByTagNameNS(CAC, 'InvoiceDocumentReference')[0];
  const fromRef = invoiceDocRef?.getElementsByTagName('cbc:ID')[0]?.textContent?.trim();
  if (fromRef) return fromRef;

  const note = doc.getElementsByTagNameNS(CBC, 'Note')[0]?.textContent?.trim() ?? '';
  return note.replace(/^Invoice\s*#/, '').replace(/\\n/g, '').trim();
}

export async function validatePeppolXml(xml: string): Promise<PeppolValidationResult> {
  const [cenViolations, peppolViolations] = await Promise.all([
    runValidator(CEN_SEF, xml),
    runValidator(PEPPOL_SEF, xml),
  ]);

  const all = [...cenViolations, ...peppolViolations];
  return {
    valid: all.every((v) => v.flag === 'warning'),
    errors: all.filter((v) => v.flag !== 'warning'),
    warnings: all.filter((v) => v.flag === 'warning'),
  };
}
