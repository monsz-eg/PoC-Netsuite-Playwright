import { BrowserContext, expect } from '@playwright/test';
import { PDFParse } from 'pdf-parse';

type PdfValidationOptions = {
  expectedText?: string | string[];
  minimumBytes?: number;
};

export function formatPdfAmount(amount: string): string {
  return `${amount},00`;
}

function normalizePdfText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export async function validatePdfPage(
  browserContext: BrowserContext,
  pdfUrl: string,
  { expectedText, minimumBytes = 1000 }: PdfValidationOptions = {},
): Promise<void> {
  expect(pdfUrl).toMatch(/hotprint\.nl/);
  expect(pdfUrl).toMatch(/incustlocale=T/);

  const pdfResponse = await browserContext.request.get(pdfUrl);
  expect(pdfResponse.ok()).toBeTruthy();
  expect(pdfResponse.headers()['content-type']).toContain('application/pdf');

  const pdfBody = await pdfResponse.body();
  expect(pdfBody.length).toBeGreaterThan(minimumBytes);

  if (!expectedText) {
    return;
  }

  const parser = new PDFParse({ data: pdfBody });

  try {
    const pdfText = await parser.getText();
    const normalizedPdfText = normalizePdfText(pdfText.text);

    for (const requiredText of [expectedText].flat()) {
      expect(normalizedPdfText).toContain(requiredText);
    }
  } finally {
    await parser.destroy();
  }
}
